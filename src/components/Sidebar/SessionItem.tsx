import { invoke } from '@tauri-apps/api/core';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { SESSION_TYPE_CONFIG, type TerminalSession } from '../../types';

interface SessionItemProps {
  session: TerminalSession;
  active: boolean;
  collapsed: boolean;
}

const statusClass = {
  running: 'bg-[#4db877]',
  idle: 'bg-[#e0a050]',
  crashed: 'bg-[#e05050]',
  closed: 'bg-[#666677]',
};

const hasTauriRuntime = () =>
  typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';

export function SessionItem({ session, active, collapsed }: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(session.name);
  const activateSession = useSessionStore((state) => state.activateSession);
  const closeSession = useSessionStore((state) => state.closeSession);
  const renameSession = useSessionStore((state) => state.renameSession);
  const toggleSessionWatched = useSessionStore((state) => state.toggleSessionWatched);
  const config = SESSION_TYPE_CONFIG[session.type];
  const Icon = config.icon;

  const commitRename = () => {
    renameSession(session.id, draftName);
    setEditing(false);
  };

  const close = () => {
    if (hasTauriRuntime()) {
      void invoke('kill_pty', { sessionId: session.id }).catch(() => undefined);
    }
    closeSession(session.id);
  };

  return (
    <div
      className={[
        'group relative flex h-9 items-center gap-2 overflow-hidden rounded-md pr-2 text-sm text-primary',
        active ? 'bg-active' : 'hover:bg-surface',
        collapsed ? 'justify-center px-0' : 'pl-2',
      ].join(' ')}
      style={{ borderLeft: active ? `2.5px solid ${config.color}` : '2.5px solid transparent' }}
      title={collapsed ? session.name : undefined}
      onClick={() => activateSession(session.id)}
      onDoubleClick={() => !collapsed && setEditing(true)}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: config.color }} aria-hidden="true" />
      {!collapsed && (
        <>
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusClass[session.status]}`} />
          {editing ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                commitRename();
              }}
            >
              <input
                className="min-w-0 flex-1 rounded border border-border bg-[#101016] px-1.5 py-0.5 text-sm text-primary outline-none"
                value={draftName}
                autoFocus
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onClick={(event) => event.stopPropagation()}
              />
              <button
                type="submit"
                className="grid h-6 w-6 place-items-center rounded text-secondary hover:bg-active hover:text-primary"
                aria-label="Rename session"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <span className="min-w-0 flex-1 truncate">{session.name}</span>
          )}
          <button
            type="button"
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-secondary opacity-0 hover:bg-active hover:text-primary group-hover:opacity-100"
            aria-label={session.isWatched ? `Stop watching ${session.name}` : `Watch ${session.name}`}
            title={session.isWatched ? 'AI Bridge watching' : 'AI Bridge off'}
            onClick={(event) => {
              event.stopPropagation();
              toggleSessionWatched(session.id);
            }}
          >
            {session.isWatched ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
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
        </>
      )}
    </div>
  );
}
