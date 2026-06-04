import { KeyRound } from 'lucide-react';
import { useAISession } from '../../hooks/useAISession';
import { SESSION_TYPE_CONFIG, type TerminalSession } from '../../types';
import { AIInputBar } from './AIInputBar';
import { MessageBubble } from './MessageBubble';

interface AISessionPaneProps {
  session: TerminalSession;
}

export function AISessionPane({ session }: AISessionPaneProps) {
  const config = SESSION_TYPE_CONFIG[session.type];
  const Icon = config.icon;
  const ai = useAISession(session);
  const moodTint =
    session.type === 'her' && ai.mood === 'warm'
      ? 'bg-[#110f16]'
      : session.type === 'her' && ai.mood === 'concern'
        ? 'bg-[#131111]'
        : 'bg-app';

  return (
    <main className={`flex min-h-0 flex-1 flex-col ${moodTint}`}>
      <div className="flex h-10 items-center gap-2 border-b border-border bg-[#101016] px-4">
        <Icon className="h-4 w-4" style={{ color: config.color }} />
        <span className="text-sm font-medium text-primary">{session.name}</span>
        <input
          className="ml-auto h-7 w-48 rounded border border-border bg-app px-2 text-xs text-secondary outline-none"
          value={ai.model}
          onChange={(event) => ai.setModel(event.target.value)}
          aria-label="AI model"
        />
      </div>

      <div className="flex h-10 items-center gap-2 border-b border-border bg-[#121218] px-4">
        <KeyRound className="h-3.5 w-3.5 text-secondary" />
        <input
          className="h-7 min-w-0 flex-1 bg-transparent text-xs text-secondary outline-none placeholder:text-dim"
          type="password"
          value={ai.apiKey}
          placeholder="Anthropic API key"
          onChange={(event) => ai.setApiKey(event.target.value)}
          aria-label="Anthropic API key"
        />
        {ai.error && <span className="max-w-[34ch] truncate text-xs text-[#e0a050]">{ai.error}</span>}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {ai.messages.length === 0 ? (
          <MessageBubble role="assistant" onRunCode={ai.runInTerminal}>
            {session.type === 'her'
              ? 'What is on your mind?'
              : 'Ready for code, diffs, files, and shell output.'}
          </MessageBubble>
        ) : (
          ai.messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} onRunCode={ai.runInTerminal}>
              {message.content}
            </MessageBubble>
          ))
        )}
        {ai.streaming && (
          <div className="flex items-center gap-1 px-1 text-secondary" aria-label="Streaming response">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:240ms]" />
          </div>
        )}
      </div>
      <AIInputBar
        input={ai.input}
        streaming={ai.streaming}
        isHer={session.type === 'her'}
        listening={ai.listening}
        onInput={ai.setInput}
        onSubmit={() => void ai.sendMessage()}
        onVoice={ai.startVoiceInput}
      />
    </main>
  );
}
