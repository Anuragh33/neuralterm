import { Clock, Folder, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { hasTauriRuntime } from '../../lib/runtime';
import { useSessionStore } from '../../store/sessionStore';
import { SESSION_TYPE_CONFIG } from '../../types';

export function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const counts = useMemo(
    () => ({
      running: sessions.filter((session) => session.status === 'running').length,
      idle: sessions.filter((session) => session.status === 'idle').length,
      crashed: sessions.filter((session) => session.status === 'crashed').length,
    }),
    [sessions],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="flex h-7 shrink-0 items-center border-t border-border bg-[#101016] px-3 text-xs text-secondary">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#4db877]" />
          {counts.running}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#e0a050]" />
          {counts.idle}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#e05050]" />
          {counts.crashed}
        </span>
      </div>
      <button
        type="button"
        className="mx-auto flex min-w-0 items-center gap-1 px-4 hover:text-primary"
        disabled={!activeSession?.cwd}
        title={activeSession?.cwd ? 'Open working directory' : undefined}
        onClick={() => {
          if (activeSession?.cwd && hasTauriRuntime()) {
            void invoke('open_path', { path: activeSession.cwd });
          }
        }}
      >
        <Folder className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{activeSession?.cwd || '~'}</span>
      </button>
      <div className="flex shrink-0 items-center gap-4">
        <span className="flex items-center gap-1">
          <Radio className="h-3.5 w-3.5" />
          {activeSession ? SESSION_TYPE_CONFIG[activeSession.type].label : 'No session'}
        </span>
        <span>UTF-8</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(now)}
        </span>
      </div>
    </footer>
  );
}
