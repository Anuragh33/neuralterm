import { invoke } from '@tauri-apps/api/core';
import { X } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import { SESSION_TYPE_CONFIG, type TerminalSession } from '../../types';

interface TabProps {
  session: TerminalSession;
  active: boolean;
}

const hasTauriRuntime = () =>
  typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';

export function Tab({ session, active }: TabProps) {
  const activateSession = useSessionStore((state) => state.activateSession);
  const closeSession = useSessionStore((state) => state.closeSession);
  const config = SESSION_TYPE_CONFIG[session.type];
  const Icon = config.icon;

  const close = () => {
    if (hasTauriRuntime()) {
      void invoke('kill_pty', { sessionId: session.id }).catch(() => undefined);
    }
    closeSession(session.id);
  };

  return (
    <div
      className={[
        'group flex h-10 min-w-0 max-w-[180px] items-center gap-2 border-r border-border px-3 text-sm',
        active ? 'bg-app text-primary' : 'bg-topbar text-secondary hover:bg-surface hover:text-primary',
      ].join(' ')}
      style={{ borderBottom: active ? `2px solid ${config.color}` : '2px solid transparent' }}
      role="tab"
      aria-selected={active}
      draggable
      onClick={() => activateSession(session.id)}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: config.color }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{session.name}</span>
      <button
        type="button"
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-secondary opacity-0 hover:bg-active hover:text-primary group-hover:opacity-100"
        aria-label={`Close ${session.name}`}
        onClick={(event) => {
          event.stopPropagation();
          close();
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

