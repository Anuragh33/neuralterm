import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Workspace } from '../../types';
import { SessionItem } from './SessionItem';

interface WorkspaceGroupProps {
  workspace: Workspace;
  collapsed: boolean;
}

export function WorkspaceGroup({ workspace, collapsed }: WorkspaceGroupProps) {
  const sessions = useSessionStore((state) =>
    state.sessions.filter((session) => session.workspaceId === workspace.id),
  );
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const toggleWorkspace = useWorkspaceStore((state) => state.toggleWorkspace);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            active={session.id === activeSessionId}
            collapsed={collapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-1">
      <button
        type="button"
        className="flex h-7 w-full items-center gap-1 rounded px-1 text-xs font-medium uppercase text-secondary hover:bg-surface hover:text-primary"
        onClick={() => toggleWorkspace(workspace.id)}
        aria-label={`Toggle ${workspace.name} workspace`}
      >
        {workspace.collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: workspace.color }} />
        <span className="truncate">{workspace.name}</span>
        <span className="ml-auto text-dim">{sessions.length}</span>
      </button>
      {!workspace.collapsed && (
        <div className="space-y-1">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </section>
  );
}

