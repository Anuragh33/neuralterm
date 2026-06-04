import { SquareTerminal } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import { SESSION_TYPE_CONFIG } from '../../types';
import { AISessionPane } from '../AISession/AISessionPane';
import { SplitView } from './SplitView';

interface TerminalGridProps {
  onNewSession: () => void;
}

export function TerminalGrid({ onNewSession }: TerminalGridProps) {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const activeSession = sessions.find((session) => session.id === activeSessionId);

  if (!activeSession) {
    return (
      <main className="grid min-h-0 flex-1 place-items-center bg-app">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded border border-border bg-surface text-[#7f77dd]">
            <SquareTerminal className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-primary">No active session</h1>
            <p className="mt-1 text-sm text-secondary">Create a shell session to start working.</p>
          </div>
          <button
            type="button"
            className="rounded bg-[#7f77dd] px-4 py-2 text-sm font-medium text-white hover:bg-[#9188ef]"
            onClick={onNewSession}
          >
            New Shell
          </button>
        </div>
      </main>
    );
  }

  if (SESSION_TYPE_CONFIG[activeSession.type].aiSession) {
    return <AISessionPane session={activeSession} />;
  }

  return (
    <main className="min-h-0 flex-1 bg-app">
      <SplitView session={activeSession} />
    </main>
  );
}

