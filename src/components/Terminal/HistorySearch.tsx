import Fuse from 'fuse.js';
import { History } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getHistory } from '../../lib/commandHistory';

interface HistorySearchProps {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
}

export function HistorySearch({ open, sessionId, onClose }: HistorySearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const history = sessionId ? getHistory(sessionId) : [];
  const fuse = new Fuse(history, { threshold: 0.45 });
  const results = query ? fuse.search(query).map((r) => r.item) : history;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  const selectCommand = (command: string) => {
    if (!sessionId) return;
    window.dispatchEvent(
      new CustomEvent('neuralterm-terminal-inject', {
        detail: { sessionId, data: command },
      }),
    );
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (event.key === 'Enter') {
      const cmd = results[selectedIndex];
      if (cmd) selectCommand(cmd);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-28"
      onMouseDown={onClose}
    >
      <div
        className="flex w-[640px] max-w-[90vw] flex-col overflow-hidden rounded-xl border border-border bg-[#111118] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <History className="h-4 w-4 shrink-0 text-dim" />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-dim"
            value={query}
            placeholder="Search command history..."
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="text-xs text-dim">{results.length}</span>
        </div>

        {history.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-dim">
            No history yet — run some commands first
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-dim">No matches</div>
        ) : (
          <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
            {results.slice(0, 60).map((cmd, i) => (
              <button
                key={`${cmd}-${i}`}
                type="button"
                className={[
                  'flex w-full items-center gap-3 px-4 py-2 text-left',
                  i === selectedIndex
                    ? 'bg-active text-primary'
                    : 'text-secondary hover:bg-surface hover:text-primary',
                ].join(' ')}
                onClick={() => selectCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{cmd}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-dim">
          <span>Enter to run</span>
          <span>↑↓ navigate</span>
          <span>Esc cancel</span>
        </div>
      </div>
    </div>
  );
}
