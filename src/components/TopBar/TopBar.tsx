import { ChevronsRight, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { SplitControls } from './SplitControls';
import { Tab } from './Tab';

interface TopBarProps {
  onNewSession: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
}

export function TopBar({ onNewSession, onSplitRight, onSplitDown }: TopBarProps) {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const mruSessionIds = useSessionStore((state) => state.mruSessionIds);

  const tabs = useMemo(() => {
    const byId = new Map(sessions.map((session) => [session.id, session]));
    return mruSessionIds
      .map((id) => byId.get(id))
      .filter((session): session is NonNullable<typeof session> => Boolean(session))
      .slice(0, 6);
  }, [mruSessionIds, sessions]);

  const hiddenCount = Math.max(0, sessions.length - tabs.length);

  return (
    <header className="flex h-10 shrink-0 items-center border-b border-border bg-topbar">
      <div className="flex min-w-0 flex-1 items-center" role="tablist" aria-label="Recent sessions">
        {tabs.map((session) => (
          <Tab key={session.id} session={session} active={session.id === activeSessionId} />
        ))}
        {hiddenCount > 0 && (
          <div className="flex h-10 items-center gap-1 px-3 text-xs text-secondary">
            <ChevronsRight className="h-4 w-4" />
            <span>{hiddenCount}</span>
          </div>
        )}
      </div>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded text-secondary hover:bg-surface hover:text-primary"
        onClick={onNewSession}
        aria-label="New session"
        title="New session"
      >
        <Plus className="h-4 w-4" />
      </button>
      <SplitControls onSplitRight={onSplitRight} onSplitDown={onSplitDown} />
    </header>
  );
}
