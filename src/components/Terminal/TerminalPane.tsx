import { Clipboard, Copy, Eraser, Rows2, Search, Columns2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTerminal } from '../../hooks/useTerminal';
import { SESSION_TYPE_CONFIG, type TerminalSession } from '../../types';

interface TerminalPaneProps {
  session: TerminalSession;
  active: boolean;
  focused?: boolean;
  onFocus?: () => void;
}

export function TerminalPane({ session, active, focused = active, onFocus }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const config = SESSION_TYPE_CONFIG[session.type];

  useTerminal(session, containerRef, active);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  const terminalAction = (action: 'copy' | 'paste' | 'clear' | 'search') => {
    window.dispatchEvent(
      new CustomEvent('neuralterm-terminal-action', { detail: { sessionId: session.id, action } }),
    );
    setMenu(null);
  };

  const splitAction = (direction: 'right' | 'down') => {
    window.dispatchEvent(new CustomEvent(`neuralterm-split-${direction}`));
    setMenu(null);
  };

  const focusTerminal = () => {
    onFocus?.();
    window.dispatchEvent(
      new CustomEvent('neuralterm-terminal-focus', { detail: { sessionId: session.id } }),
    );
  };

  return (
    <section
      className={[
        'flex h-full min-h-0 min-w-0 flex-1 flex-col border bg-app',
        focused ? 'border-[#7f77dd]/70' : 'border-transparent',
      ].join(' ')}
      aria-label={`${session.name} terminal`}
      onMouseDown={focusTerminal}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-[#101016] px-3 text-xs text-secondary">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
        <span className="text-primary">{session.name}</span>
        <span className="text-dim">/</span>
        <span>{config.label}</span>
        <span className="ml-auto">{session.status}</span>
      </div>
      <div
        ref={containerRef}
        className="terminal-host min-h-0 flex-1 p-3"
        onContextMenu={(event) => {
          event.preventDefault();
          focusTerminal();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
      />
      {menu && (
        <div
          className="fixed z-[60] w-44 overflow-hidden rounded-md border border-border bg-[#111118] py-1 shadow-2xl"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(event) => event.stopPropagation()}
          role="menu"
        >
          <ContextAction icon={Copy} label="Copy" onClick={() => terminalAction('copy')} />
          <ContextAction icon={Clipboard} label="Paste" onClick={() => terminalAction('paste')} />
          <ContextAction icon={Eraser} label="Clear" onClick={() => terminalAction('clear')} />
          <ContextAction icon={Search} label="Search" onClick={() => terminalAction('search')} />
          <div className="my-1 border-t border-border" />
          <ContextAction icon={Columns2} label="Split right" onClick={() => splitAction('right')} />
          <ContextAction icon={Rows2} label="Split down" onClick={() => splitAction('down')} />
        </div>
      )}
    </section>
  );
}

function ContextAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-8 w-full items-center gap-2 px-3 text-left text-xs text-secondary hover:bg-active hover:text-primary"
      role="menuitem"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
