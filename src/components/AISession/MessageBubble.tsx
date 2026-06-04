import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Play } from 'lucide-react';
import type { AIMessageRole } from '../../types';

interface MessageBubbleProps {
  role: AIMessageRole;
  children: string;
  onRunCode: (code: string) => void;
}

export function MessageBubble({ role, children, onRunCode }: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  return (
    <div
      className={[
        'max-w-[78ch] rounded-md border px-4 py-3 text-sm leading-6',
        isUser ? 'ml-auto border-[#7f77dd]/40 bg-active text-primary' : '',
        isSystem ? 'border-[#e0a050]/30 bg-[#1d1912] text-[#d7c7a8]' : '',
        !isUser && !isSystem ? 'border-border bg-surface text-primary' : '',
      ].join(' ')}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ inline, className, children: codeChildren, ...props }: any) {
            const code = String(codeChildren).replace(/\n$/, '');
            if (inline) {
              return (
                <code className="rounded bg-app px-1 py-0.5 text-[0.92em]" {...props}>
                  {codeChildren}
                </code>
              );
            }

            return (
              <div className="my-3 overflow-hidden rounded border border-border bg-[#0b0b0e]">
                <div className="flex h-8 items-center justify-end gap-1 border-b border-border px-2">
                  <button
                    type="button"
                    className="grid h-6 w-6 place-items-center rounded text-secondary hover:bg-active hover:text-primary"
                    aria-label="Copy code"
                    title="Copy code"
                    onClick={() => void navigator.clipboard.writeText(code)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="grid h-6 w-6 place-items-center rounded text-secondary hover:bg-active hover:text-primary"
                    aria-label="Run code in terminal"
                    title="Run in terminal"
                    onClick={() => onRunCode(code)}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 text-xs leading-5">
                  <code className={className} {...props}>
                    {codeChildren}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {children || '...'}
      </ReactMarkdown>
    </div>
  );
}
