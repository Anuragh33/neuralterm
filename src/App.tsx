import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { TerminalGrid } from './components/Terminal/TerminalGrid';
import { TopBar } from './components/TopBar/TopBar';
import { useHotkeys } from './hooks/useHotkeys';
import { hasTauriRuntime } from './lib/runtime';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useBridgeStore } from './store/bridgeStore';
import { useSessionStore } from './store/sessionStore';
import { useSettingsStore } from './store/settingsStore';
import { type SplitDirection, useSplitStore } from './store/splitStore';
import { useWorkspaceStore } from './store/workspaceStore';
import {
  DEFAULT_WORKSPACE_ID,
  SESSION_TYPE_CONFIG,
  type AiBridgeSuggestion,
  type PersistenceSnapshot,
} from './types';

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const createSession = useSessionStore((state) => state.createSession);
  const activateSession = useSessionStore((state) => state.activateSession);
  const closeSession = useSessionStore((state) => state.closeSession);
  const hydrateSessions = useSessionStore((state) => state.hydrateSessions);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const hydrateWorkspaces = useWorkspaceStore((state) => state.hydrateWorkspaces);
  const addBridgeSuggestion = useBridgeStore((state) => state.addSuggestion);
  const layouts = useSplitStore((state) => state.layouts);
  const splitSession = useSplitStore((state) => state.splitSession);
  const setSplitDirection = useSplitStore((state) => state.setDirection);
  const focusPane = useSplitStore((state) => state.focusPane);
  const focusNextPane = useSplitStore((state) => state.focusNextPane);
  const focusPreviousPane = useSplitStore((state) => state.focusPreviousPane);
  const removeLayout = useSplitStore((state) => state.removeLayout);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const theme = useSettingsStore((state) => state.theme);
  const aiBridgeEnabled = useSettingsStore((state) => state.aiBridgeEnabled);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const setFontSize = useSettingsStore((state) => state.setFontSize);

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      if (!hasTauriRuntime()) {
        setHydrated(true);
        return;
      }

      try {
        const snapshot = await invoke<PersistenceSnapshot>('get_persistence_snapshot');
        if (cancelled) return;
        hydrateWorkspaces(snapshot.workspaces);
        hydrateSessions(snapshot.sessions);
      } catch (error) {
        console.error('Failed to restore NeuralTerm state', error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [hydrateSessions, hydrateWorkspaces]);

  useEffect(() => {
    if (!hasTauriRuntime()) return;
    let unlisten: UnlistenFn | undefined;
    void listen<AiBridgeSuggestion>('ai-bridge-suggestion', (event) => {
      if (!aiBridgeEnabled) return;
      const sourceSession = useSessionStore
        .getState()
        .sessions.find((session) => session.id === event.payload.sessionId);
      if (sourceSession && !sourceSession.isWatched) return;
      addBridgeSuggestion(event.payload);
    }).then((cleanup) => {
      unlisten = cleanup;
    });
    return () => unlisten?.();
  }, [addBridgeSuggestion, aiBridgeEnabled]);

  useEffect(() => {
    if (hydrated && sessions.length === 0) {
      createSession('shell', { name: 'Shell 1' });
    }
  }, [createSession, hydrated, sessions.length]);

  const newShell = useCallback(() => {
    createSession('shell', {
      workspaceId: activeWorkspaceId === 'all' ? DEFAULT_WORKSPACE_ID : activeWorkspaceId,
    });
  }, [activeWorkspaceId, createSession]);

  const killSession = useCallback((sessionId: string) => {
    if (hasTauriRuntime()) {
      void invoke('kill_pty', { sessionId }).catch(() => undefined);
    }
  }, []);

  const splitActive = useCallback(
    (direction: SplitDirection) => {
      const activeSession = sessions.find((session) => session.id === activeSessionId);
      if (!activeSession || SESSION_TYPE_CONFIG[activeSession.type].aiSession) return;

      const existingLayout = layouts[activeSession.id];
      if (existingLayout) {
        setSplitDirection(activeSession.id, direction);
        focusPane(activeSession.id, 1);
        return;
      }

      const secondarySession = createSession(activeSession.type, {
        name: `${activeSession.name} Split`,
        workspaceId: activeSession.workspaceId,
        cwd: activeSession.cwd,
        launchCommand: activeSession.launchCommand,
        activate: false,
      });
      splitSession(activeSession.id, secondarySession.id, direction);
    },
    [
      activeSessionId,
      createSession,
      focusPane,
      layouts,
      sessions,
      setSplitDirection,
      splitSession,
    ],
  );

  const closeActive = useCallback(() => {
    if (!activeSessionId) return;

    const layout = layouts[activeSessionId];
    if (layout) {
      const focusedSessionId = layout.paneIds[layout.activePaneIndex];
      removeLayout(activeSessionId);

      if (layout.activePaneIndex === 0) {
        const secondarySessionId = layout.paneIds[1];
        killSession(activeSessionId);
        closeSession(activeSessionId);
        activateSession(secondarySessionId);
      } else {
        killSession(focusedSessionId);
        closeSession(focusedSessionId);
      }
      return;
    }

    killSession(activeSessionId);
    closeSession(activeSessionId);
  }, [activateSession, activeSessionId, closeSession, killSession, layouts, removeLayout]);

  const searchTerminal = useCallback(() => {
    if (!activeSessionId) return;
    const layout = layouts[activeSessionId];
    const sessionId = layout ? layout.paneIds[layout.activePaneIndex] : activeSessionId;
    window.dispatchEvent(
      new CustomEvent('neuralterm-terminal-search', {
        detail: { sessionId },
      }),
    );
  }, [activeSessionId, layouts]);

  const cycleTabs = useCallback(
    (direction: 1 | -1) => {
      if (sessions.length === 0 || !activeSessionId) return;
      const currentIndex = sessions.findIndex((session) => session.id === activeSessionId);
      if (currentIndex < 0) return;
      const nextIndex = (currentIndex + direction + sessions.length) % sessions.length;
      activateSession(sessions[nextIndex].id);
    },
    [activateSession, activeSessionId, sessions],
  );

  const switchWorkspace = useCallback(
    (index: number) => {
      const workspace = workspaces[index];
      if (workspace) {
        setActiveWorkspace(workspace.id);
      }
    },
    [setActiveWorkspace, workspaces],
  );

  const hotkeyHandlers = useMemo(
    () => ({
      newShell,
      openPalette: () => setPaletteOpen(true),
      openSettings: () => setSettingsOpen(true),
      toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
      closeActive,
      splitHorizontal: () => splitActive('horizontal'),
      splitVertical: () => splitActive('vertical'),
      switchPanePrevious: () => activeSessionId && focusPreviousPane(activeSessionId),
      switchPaneNext: () => activeSessionId && focusNextPane(activeSessionId),
      searchTerminal,
      switchWorkspace,
      cycleTabsForward: () => cycleTabs(1),
      cycleTabsBackward: () => cycleTabs(-1),
      increaseFont: () => setFontSize(fontSize + 1),
      decreaseFont: () => setFontSize(fontSize - 1),
      resetFont: () => setFontSize(13),
    }),
    [
      activeSessionId,
      closeActive,
      cycleTabs,
      focusNextPane,
      focusPreviousPane,
      fontSize,
      newShell,
      searchTerminal,
      setFontSize,
      setSidebarCollapsed,
      sidebarCollapsed,
      splitActive,
      switchWorkspace,
    ],
  );

  useHotkeys(hotkeyHandlers);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app text-primary" data-theme={theme}>
      <Sidebar onNewSession={() => setPaletteOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onNewSession={() => setPaletteOpen(true)}
          onSplitRight={() => splitActive('horizontal')}
          onSplitDown={() => splitActive('vertical')}
        />
        <TerminalGrid onNewSession={newShell} />
        <StatusBar />
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSplitRight={() => splitActive('horizontal')}
        onSplitDown={() => splitActive('vertical')}
        onCloseActive={closeActive}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
