import {
  AlertTriangle,
  BrainCircuit,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useBridgeStore } from '../../store/bridgeStore';
import { useSessionStore } from '../../store/sessionStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { DEFAULT_WORKSPACE_ID } from '../../types';
import { AddSessionButton } from './AddSessionButton';
import { WorkspaceGroup } from './WorkspaceGroup';

interface SidebarProps {
  onNewSession: () => void;
}

export function Sidebar({ onNewSession }: SidebarProps) {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
  const sessions = useSessionStore((state) => state.sessions);
  const createSession = useSessionStore((state) => state.createSession);
  const activateSession = useSessionStore((state) => state.activateSession);
  const attachAIContext = useSessionStore((state) => state.attachAIContext);
  const suggestions = useBridgeStore((state) => state.suggestions);
  const removeSuggestion = useBridgeStore((state) => state.removeSuggestion);
  const sidebarWidth = useSettingsStore((state) => state.sidebarWidth);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarWidth = useSettingsStore((state) => state.setSidebarWidth);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceColor, setWorkspaceColor] = useState('#7f77dd');
  const startXRef = useRef(0);
  const startWidthRef = useRef(sidebarWidth);
  const width = sidebarCollapsed ? 72 : sidebarWidth;
  const visibleWorkspaces = useMemo(
    () =>
      activeWorkspaceId === 'all'
        ? workspaces
        : workspaces.filter((workspace) => workspace.id === activeWorkspaceId),
    [activeWorkspaceId, workspaces],
  );

  const submitWorkspace = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;
    createWorkspace(name, workspaceColor);
    setWorkspaceName('');
    setWorkspaceColor('#7f77dd');
    setCreatingWorkspace(false);
  };

  const openBridgeSuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    const sourceSession = sessions.find((session) => session.id === suggestion.sessionId);
    const context = [
      `AI Bridge alert: ${suggestion.title}`,
      sourceSession ? `Source session: ${sourceSession.name}` : '',
      'Terminal output:',
      '```',
      suggestion.excerpt,
      '```',
    ]
      .filter(Boolean)
      .join('\n');

    const existingClaude = sessions.find((session) => session.type === 'claude-code');
    if (existingClaude) {
      attachAIContext(existingClaude.id, context);
      activateSession(existingClaude.id);
    } else {
      createSession('claude-code', {
        name: 'Claude Code',
        workspaceId:
          activeWorkspaceId === 'all' ? sourceSession?.workspaceId ?? DEFAULT_WORKSPACE_ID : activeWorkspaceId,
        pendingAIContext: context,
      });
    }
    removeSuggestion(suggestionId);
  };

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      setSidebarWidth(startWidthRef.current + moveEvent.clientX - startXRef.current);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-border bg-sidebar"
      style={{ width }}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-active text-[#b09ee0]">
          <BrainCircuit className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-primary">NeuralTerm</div>
            <div className="truncate text-xs text-secondary">AI-native mux</div>
          </div>
        )}
        <button
          type="button"
          className="ml-auto grid h-8 w-8 place-items-center rounded text-secondary hover:bg-surface hover:text-primary"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {!sidebarCollapsed && (
        <div className="space-y-2 border-b border-border px-2 py-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              className={[
                'h-7 shrink-0 rounded px-2 text-xs font-medium',
                activeWorkspaceId === 'all'
                  ? 'bg-active text-primary'
                  : 'text-secondary hover:bg-surface hover:text-primary',
              ].join(' ')}
              onClick={() => setActiveWorkspace('all')}
            >
              All
            </button>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={[
                  'flex h-7 max-w-[110px] shrink-0 items-center gap-1 rounded px-2 text-xs font-medium',
                  activeWorkspaceId === workspace.id
                    ? 'bg-active text-primary'
                    : 'text-secondary hover:bg-surface hover:text-primary',
                ].join(' ')}
                onClick={() => setActiveWorkspace(workspace.id)}
                title={workspace.name}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: workspace.color }}
                />
                <span className="truncate">{workspace.name}</span>
              </button>
            ))}
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded text-secondary hover:bg-surface hover:text-primary"
              aria-label="Create workspace"
              title="Create workspace"
              onClick={() => setCreatingWorkspace(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {creatingWorkspace && (
            <form className="space-y-2 rounded border border-border bg-[#101016] p-2" onSubmit={submitWorkspace}>
              <div className="flex items-center gap-1">
                <input
                  className="min-w-0 flex-1 rounded border border-border bg-app px-2 py-1 text-xs text-primary outline-none"
                  value={workspaceName}
                  autoFocus
                  placeholder="Workspace name"
                  onChange={(event) => setWorkspaceName(event.target.value)}
                />
                <button
                  type="submit"
                  className="grid h-7 w-7 place-items-center rounded text-secondary hover:bg-active hover:text-primary"
                  aria-label="Save workspace"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded text-secondary hover:bg-active hover:text-primary"
                  aria-label="Cancel workspace"
                  onClick={() => {
                    setCreatingWorkspace(false);
                    setWorkspaceName('');
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {['#7f77dd', '#4db877', '#60a0d0', '#e0a050', '#d090c0'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-5 w-5 rounded border"
                    style={{
                      backgroundColor: color,
                      borderColor: workspaceColor === color ? '#e0dff8' : '#2a2a30',
                    }}
                    aria-label={`Use ${color} workspace color`}
                    onClick={() => setWorkspaceColor(color)}
                  />
                ))}
              </div>
            </form>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {!sidebarCollapsed && suggestions.length > 0 && (
          <section className="space-y-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="w-full rounded-md border border-[#e0a050]/30 bg-[#1d1912] p-2 text-left hover:border-[#e0a050]"
                onClick={() => openBridgeSuggestion(suggestion.id)}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-[#e0a050]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="truncate">{suggestion.title}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-secondary">
                  {suggestion.excerpt}
                </div>
              </button>
            ))}
          </section>
        )}
        {visibleWorkspaces.map((workspace) => (
          <WorkspaceGroup
            key={workspace.id}
            workspace={workspace}
            collapsed={sidebarCollapsed}
          />
        ))}
      </div>

      <div className="border-t border-border p-3">
        <AddSessionButton collapsed={sidebarCollapsed} onClick={onNewSession} />
      </div>

      {!sidebarCollapsed && (
        <div
          className="absolute right-[-3px] top-0 h-full w-1.5 cursor-col-resize hover:bg-[#7f77dd]"
          onMouseDown={startResize}
          role="separator"
          aria-label="Resize sidebar"
        />
      )}
    </aside>
  );
}
