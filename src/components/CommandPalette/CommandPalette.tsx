import { Search } from 'lucide-react';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { DEFAULT_WORKSPACE_ID, SESSION_TYPE_CONFIG, type SessionType } from '../../types';
import { PaletteItem } from './PaletteItem';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onCloseActive: () => void;
}

type PaletteResult =
  | {
      kind: 'new';
      type: SessionType;
      label: string;
      description: string;
      hint: string;
      disabled?: boolean;
    }
  | {
      kind: 'jump';
      sessionId: string;
      type: SessionType;
      label: string;
      description: string;
      hint: string;
    }
  | {
      kind: 'command';
      id: string;
      type: SessionType;
      label: string;
      description: string;
      hint: string;
    }
  | {
      kind: 'path';
      path: string;
      type: 'shell';
      label: string;
      description: string;
      hint: string;
    };

const sessionTypes = Object.keys(SESSION_TYPE_CONFIG) as SessionType[];

export function CommandPalette({
  open,
  onClose,
  onOpenSettings,
  onSplitRight,
  onSplitDown,
  onCloseActive,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const sessions = useSessionStore((state) => state.sessions);
  const createSession = useSessionStore((state) => state.createSession);
  const activateSession = useSessionStore((state) => state.activateSession);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const newSessionResults: PaletteResult[] = sessionTypes.map((type) => {
      const config = SESSION_TYPE_CONFIG[type];
      return {
        kind: 'new',
        type,
        label: `New ${config.label}`,
        description: config.description,
        hint: 'New',
      };
    });

    const jumpResults: PaletteResult[] = sessions.map((session) => ({
      kind: 'jump',
      sessionId: session.id,
      type: session.type,
      label: session.name,
      description: `${SESSION_TYPE_CONFIG[session.type].label} session`,
      hint: 'Jump',
    }));
    const pathResults: PaletteResult[] = [...new Set(sessions.map((session) => session.cwd).filter(Boolean))].map(
      (path) => ({
        kind: 'path',
        path,
        type: 'shell',
        label: path.split('/').filter(Boolean).slice(-1)[0] ?? path,
        description: path,
        hint: 'Open path',
      }),
    );

    const commandResults: PaletteResult[] = [
      {
        kind: 'command',
        id: 'settings',
        type: 'custom',
        label: 'Settings',
        description: 'Open preferences',
        hint: 'Cmd+,',
      },
      {
        kind: 'command',
        id: 'split-right',
        type: 'shell',
        label: 'Split right',
        description: 'Create a side-by-side terminal pane',
        hint: 'Cmd+D',
      },
      {
        kind: 'command',
        id: 'split-down',
        type: 'shell',
        label: 'Split down',
        description: 'Create a stacked terminal pane',
        hint: 'Cmd+Shift+D',
      },
      {
        kind: 'command',
        id: 'close-active',
        type: 'custom',
        label: 'Close active pane',
        description: 'Close the focused pane or tab',
        hint: 'Cmd+W',
      },
    ];

    const allResults = [...newSessionResults, ...jumpResults, ...pathResults, ...commandResults];
    if (!normalizedQuery) return allResults;

    return new Fuse(allResults, {
      keys: ['label', 'description', 'hint'],
      threshold: 0.35,
    })
      .search(normalizedQuery)
      .map((result) => result.item);
  }, [query, sessions]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(results.length - 1, index + 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const result = results[activeIndex];
        if (result && !('disabled' in result && result.disabled)) {
          runResult(result);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, onClose, open, results]);

  const runResult = (result: PaletteResult) => {
    if (result.kind === 'new') {
      const options: { workspaceId: string; cwd?: string; launchCommand?: string } = {
        workspaceId: activeWorkspaceId === 'all' ? DEFAULT_WORKSPACE_ID : activeWorkspaceId,
      };
      if (result.type === 'git') {
        const cwd = window.prompt('Repository directory (leave blank for current directory)', '');
        if (cwd === null) return;
        options.cwd = cwd.trim();
      }
      if (['docker', 'aws', 'postgres', 'ssh', 'custom'].includes(result.type)) {
        const suggested = SESSION_TYPE_CONFIG[result.type].defaultCommand ?? '';
        const command = window.prompt(`${SESSION_TYPE_CONFIG[result.type].label} command`, suggested);
        if (command === null) return;
        options.launchCommand = command.trim() || undefined;
      }
      createSession(result.type, options);
    } else if (result.kind === 'jump') {
      activateSession(result.sessionId);
    } else if (result.kind === 'path') {
      createSession('shell', {
        name: result.label,
        cwd: result.path,
        workspaceId: activeWorkspaceId === 'all' ? DEFAULT_WORKSPACE_ID : activeWorkspaceId,
      });
    } else if (result.id === 'settings') {
      onOpenSettings();
    } else if (result.id === 'split-right') {
      onSplitRight();
    } else if (result.id === 'split-down') {
      onSplitDown();
    } else if (result.id === 'close-active') {
      onCloseActive();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 pt-[12vh]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="w-[min(680px,calc(100vw-32px))] overflow-hidden rounded-md border border-border bg-[#111118] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex h-12 items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-secondary" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-secondary"
            autoFocus
            placeholder="Search sessions and commands"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
          <span className="rounded border border-border px-2 py-1 text-xs text-secondary">Esc</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto py-2">
          {results.map((result, index) => {
            const config = SESSION_TYPE_CONFIG[result.type];
            const resultKey =
              result.kind === 'new'
                ? result.type
                : result.kind === 'jump'
                  ? result.sessionId
                  : result.kind === 'path'
                    ? result.path
                    : result.id;
            return (
              <PaletteItem
                key={`${result.kind}-${resultKey}`}
                icon={config.icon}
                color={config.color}
                label={result.label}
                description={result.description}
                hint={result.hint}
                active={index === activeIndex}
                disabled={'disabled' in result ? result.disabled : false}
                onClick={() => runResult(result)}
              />
            );
          })}
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-secondary">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
