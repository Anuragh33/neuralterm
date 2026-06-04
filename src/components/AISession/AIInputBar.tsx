import { Mic, Send } from 'lucide-react';

interface AIInputBarProps {
  input: string;
  streaming: boolean;
  isHer: boolean;
  listening: boolean;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onVoice: () => void;
}

export function AIInputBar({
  input,
  streaming,
  isHer,
  listening,
  onInput,
  onSubmit,
  onVoice,
}: AIInputBarProps) {
  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <textarea
        className="max-h-36 min-h-11 flex-1 resize-none rounded-md border border-border bg-[#101016] px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary"
        placeholder="/attach path, /shell command, or message"
        value={input}
        disabled={streaming}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      {isHer && (
        <button
          type="button"
          className={[
            'grid h-11 w-11 place-items-center rounded-md border border-border text-secondary hover:bg-surface hover:text-primary',
            listening ? 'border-[#d090c0] text-[#d090c0]' : '',
          ].join(' ')}
          aria-label="Voice input"
          title="Voice input"
          onClick={onVoice}
        >
          <Mic className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-md bg-[#7f77dd] text-white hover:bg-[#9188ef] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Send message"
        title="Send"
        disabled={streaming || !input.trim()}
        onClick={onSubmit}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
