import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasTauriRuntime } from '../lib/runtime';
import { useSessionStore } from '../store/sessionStore';
import type { AIMessage, TerminalSession } from '../types';

interface ShellCommandOutput {
  status: number | null;
  stdout: string;
  stderr: string;
}

const CLAUDE_CODE_PROMPT =
  "You are Claude Code, an expert AI coding assistant with access to the user's filesystem and terminal. Help the user write, refactor, debug, and understand code.";

const HER_PROMPT =
  'You are a thoughtful, empathetic AI companion. Engage in natural conversation, help the user think through problems, brainstorm ideas, or just chat.';

const historyKey = (sessionId: string) => `neuralterm.aiHistory.${sessionId}`;
const apiKeyKey = 'neuralterm.anthropicApiKey';
const modelKey = 'neuralterm.anthropicModel';

const fallbackRandomId = () =>
  `message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : fallbackRandomId();

const now = () => new Date().toISOString();

const makeMessage = (role: AIMessage['role'], content: string): AIMessage => ({
  id: newId(),
  role,
  content,
  createdAt: now(),
});

const saveMessages = (sessionId: string, messages: AIMessage[]) => {
  if (hasTauriRuntime()) {
    void invoke('save_ai_messages', {
      request: {
        sessionId,
        messages,
      },
    }).catch((error) => console.error('Failed to save AI history', error));
    return;
  }

  localStorage.setItem(historyKey(sessionId), JSON.stringify(messages));
};

const loadMessages = async (sessionId: string): Promise<AIMessage[]> => {
  if (hasTauriRuntime()) {
    return invoke<AIMessage[]>('get_ai_messages', { sessionId });
  }

  const rawHistory = localStorage.getItem(historyKey(sessionId));
  return rawHistory ? (JSON.parse(rawHistory) as AIMessage[]) : [];
};

const summarizeIfNeeded = (messages: AIMessage[]): AIMessage[] => {
  if (messages.length <= 50) return messages;

  const earlier = messages.slice(0, -30);
  const recent = messages.slice(-30);
  const summary = earlier
    .map((message) => `${message.role}: ${message.content.replace(/\s+/g, ' ').slice(0, 280)}`)
    .join('\n')
    .slice(0, 6000);

  return [
    makeMessage('system', `Conversation summary for earlier context:\n${summary}`),
    ...recent,
  ];
};

const toAnthropicMessages = (messages: AIMessage[]) =>
  messages
    .filter((message) => message.content.trim())
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content:
        message.role === 'system'
          ? `[Context]\n${message.content}`
          : message.content,
    }));

const classifyMood = (messages: AIMessage[]) => {
  const lastUserText =
    [...messages].reverse().find((message) => message.role === 'user')?.content.toLowerCase() ?? '';
  if (/(stuck|sad|angry|upset|worried|anxious|stress|failed|broken|hurt)/.test(lastUserText)) {
    return 'concern';
  }
  if (/(great|happy|nice|love|excited|good|thanks|awesome|perfect)/.test(lastUserText)) {
    return 'warm';
  }
  return 'neutral';
};

export function useAISession(session: TerminalSession) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState(
    () => localStorage.getItem(apiKeyKey) ?? import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
  );
  const [model, setModelState] = useState(
    () => localStorage.getItem(modelKey) ?? import.meta.env.VITE_ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  );
  const createSession = useSessionStore((state) => state.createSession);
  const consumePendingAIContext = useSessionStore((state) => state.consumePendingAIContext);
  const systemPrompt = session.type === 'her' ? HER_PROMPT : CLAUDE_CODE_PROMPT;
  const mood = useMemo(() => classifyMood(messages), [messages]);

  useEffect(() => {
    let cancelled = false;
    loadMessages(session.id)
      .then((history) => {
        if (!cancelled) {
          const nextHistory = session.pendingAIContext
            ? [...history, makeMessage('system', session.pendingAIContext)]
            : history;
          setMessages(nextHistory);
          if (session.pendingAIContext) {
            saveMessages(session.id, nextHistory);
            consumePendingAIContext(session.id);
          }
        }
      })
      .catch((loadError) => setError(String(loadError)));

    return () => {
      cancelled = true;
    };
  }, [consumePendingAIContext, session.id, session.pendingAIContext]);

  useEffect(() => {
    if (!hasTauriRuntime()) return;
    void invoke<string>('get_anthropic_api_key')
      .then((storedKey) => {
        if (storedKey) {
          setApiKeyState(storedKey);
        }
      })
      .catch(() => undefined);
  }, []);

  const setApiKey = useCallback((value: string) => {
    setApiKeyState(value);
    if (hasTauriRuntime()) {
      void invoke('set_anthropic_api_key', { apiKey: value }).catch((saveError) =>
        console.error('Failed to save Anthropic API key', saveError),
      );
    } else {
      localStorage.setItem(apiKeyKey, value);
    }
  }, []);

  const setModel = useCallback((value: string) => {
    setModelState(value);
    localStorage.setItem(modelKey, value);
  }, []);

  const commitMessages = useCallback(
    (nextMessages: AIMessage[]) => {
      setMessages(nextMessages);
      saveMessages(session.id, nextMessages);
    },
    [session.id],
  );

  const handleSlashCommand = useCallback(
    async (text: string) => {
      if (text === '/clear') {
        commitMessages([]);
        return true;
      }

      if (text.startsWith('/attach ')) {
        const path = text.slice('/attach '.length).trim();
        if (!path) return true;
        try {
          const contents = await invoke<string>('read_text_file', { path });
          commitMessages([
            ...messages,
            makeMessage('system', `Attached file: ${path}\n\n\`\`\`\n${contents}\n\`\`\``),
          ]);
        } catch (attachError) {
          setError(String(attachError));
        }
        return true;
      }

      if (text.startsWith('/shell ')) {
        const command = text.slice('/shell '.length).trim();
        if (!command) return true;
        try {
          const output = await invoke<ShellCommandOutput>('run_shell_command', {
            command,
            cwd: session.cwd || null,
          });
          commitMessages([
            ...messages,
            makeMessage(
              'system',
              [
                `Shell command: ${command}`,
                `Exit status: ${output.status ?? 'unknown'}`,
                output.stdout ? `stdout:\n\`\`\`\n${output.stdout}\n\`\`\`` : '',
                output.stderr ? `stderr:\n\`\`\`\n${output.stderr}\n\`\`\`` : '',
              ]
                .filter(Boolean)
                .join('\n\n'),
            ),
          ]);
        } catch (shellError) {
          setError(String(shellError));
        }
        return true;
      }

      return false;
    },
    [commitMessages, messages, session.cwd],
  );

  const sendMessage = useCallback(
    async (text = input) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      setInput('');
      setError(null);

      if (trimmed.startsWith('/') && (await handleSlashCommand(trimmed))) {
        return;
      }

      const userMessage = makeMessage('user', trimmed);
      const assistantMessage = makeMessage('assistant', '');
      const baseHistory = summarizeIfNeeded(messages);
      const nextMessages = [...baseHistory, userMessage, assistantMessage];
      setMessages(nextMessages);

      if (!apiKey.trim()) {
        const missingKeyMessages = nextMessages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: 'Add an Anthropic API key to start streaming responses.',
              }
            : message,
        );
        commitMessages(missingKeyMessages);
        return;
      }

      setStreaming(true);
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({
          apiKey,
          dangerouslyAllowBrowser: true,
        });
        const stream = await client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: toAnthropicMessages([...baseHistory, userMessage]) as never,
          stream: true,
        });

        let content = '';
        for await (const event of stream as AsyncIterable<any>) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            content += event.delta.text;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id ? { ...message, content } : message,
              ),
            );
          }
        }

        const finalMessages = nextMessages.map((message) =>
          message.id === assistantMessage.id ? { ...message, content } : message,
        );
        commitMessages(finalMessages);
      } catch (streamError) {
        const message = streamError instanceof Error ? streamError.message : String(streamError);
        setError(message);
        commitMessages(
          nextMessages.map((item) =>
            item.id === assistantMessage.id
              ? { ...item, content: `Streaming failed: ${message}` }
              : item,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [
      apiKey,
      commitMessages,
      handleSlashCommand,
      input,
      messages,
      model,
      streaming,
      systemPrompt,
    ],
  );

  const runInTerminal = useCallback(
    (code: string) => {
      const command = code.endsWith('\n') ? code : `${code}\n`;
      createSession('shell', {
        name: 'AI Run',
        workspaceId: session.workspaceId,
        cwd: session.cwd,
        pendingInput: command,
      });
    },
    [createSession, session.cwd, session.workspaceId],
  );

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not available in this webview.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput((value) => `${value}${value ? ' ' : ''}${transcript}`);
      }
    };
    recognition.start();
  }, []);

  return {
    messages,
    input,
    setInput,
    streaming,
    listening,
    error,
    apiKey,
    setApiKey,
    model,
    setModel,
    mood,
    sendMessage,
    runInTerminal,
    startVoiceInput,
  };
}
