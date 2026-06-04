import { useRef } from 'react';
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
  const config = SESSION_TYPE_CONFIG[session.type];

  useTerminal(session, containerRef, active);

  return (
    <section
      className={[
        'flex min-h-0 flex-1 flex-col border bg-app',
        focused ? 'border-[#7f77dd]/70' : 'border-transparent',
      ].join(' ')}
      aria-label={`${session.name} terminal`}
      onMouseDown={onFocus}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-[#101016] px-3 text-xs text-secondary">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
        <span className="text-primary">{session.name}</span>
        <span className="text-dim">/</span>
        <span>{config.label}</span>
        <span className="ml-auto">{session.status}</span>
      </div>
      <div ref={containerRef} className="terminal-host min-h-0 flex-1 p-3" />
    </section>
  );
}
