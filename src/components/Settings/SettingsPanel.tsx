import { ArrowDown, ArrowUp, ExternalLink, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { hasTauriRuntime } from '../../lib/runtime';
import {
  DEFAULT_SHORTCUTS,
  useSettingsStore,
  type ShortcutAction,
  type ThemeName,
} from '../../store/settingsStore';
import { useSessionStore } from '../../store/sessionStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { DEFAULT_WORKSPACE_ID } from '../../types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const themes: Array<{ id: ThemeName; label: string }> = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'oled', label: 'OLED Black' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'solarized', label: 'Solarized' },
];

const shortcutLabels: Array<{ action: ShortcutAction; label: string }> = [
  { action: 'newShell', label: 'New shell session' },
  { action: 'openPalette', label: 'Command palette' },
  { action: 'openSettings', label: 'Settings' },
  { action: 'toggleSidebar', label: 'Toggle sidebar' },
  { action: 'splitHorizontal', label: 'Split right' },
  { action: 'splitVertical', label: 'Split down' },
  { action: 'closeActive', label: 'Close active pane/tab' },
  { action: 'searchTerminal', label: 'Terminal search' },
  { action: 'switchPanePrevious', label: 'Focus previous pane' },
  { action: 'switchPaneNext', label: 'Focus next pane' },
  { action: 'cycleTabsForward', label: 'Cycle tabs forward' },
  { action: 'cycleTabsBackward', label: 'Cycle tabs backward' },
  { action: 'increaseFont', label: 'Increase font size' },
  { action: 'decreaseFont', label: 'Decrease font size' },
  { action: 'resetFont', label: 'Reset font size' },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const theme = useSettingsStore((state) => state.theme);
  const fontFamily = useSettingsStore((state) => state.fontFamily);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const lineHeight = useSettingsStore((state) => state.lineHeight);
  const cursorStyle = useSettingsStore((state) => state.cursorStyle);
  const cursorBlink = useSettingsStore((state) => state.cursorBlink);
  const shortcuts = useSettingsStore((state) => state.shortcuts);
  const aiBridgeEnabled = useSettingsStore((state) => state.aiBridgeEnabled);
  const globalLauncherEnabled = useSettingsStore((state) => state.globalLauncherEnabled);
  const defaultShell = useSettingsStore((state) => state.defaultShell);
  const defaultCwd = useSettingsStore((state) => state.defaultCwd);
  const autoRestoreSessions = useSettingsStore((state) => state.autoRestoreSessions);
  const idleTimeoutMinutes = useSettingsStore((state) => state.idleTimeoutMinutes);
  const maxContextMessages = useSettingsStore((state) => state.maxContextMessages);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setFontFamily = useSettingsStore((state) => state.setFontFamily);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const setLineHeight = useSettingsStore((state) => state.setLineHeight);
  const setCursorStyle = useSettingsStore((state) => state.setCursorStyle);
  const setCursorBlink = useSettingsStore((state) => state.setCursorBlink);
  const setAiBridgeEnabled = useSettingsStore((state) => state.setAiBridgeEnabled);
  const setGlobalLauncherEnabled = useSettingsStore((state) => state.setGlobalLauncherEnabled);
  const setDefaultShell = useSettingsStore((state) => state.setDefaultShell);
  const setDefaultCwd = useSettingsStore((state) => state.setDefaultCwd);
  const setAutoRestoreSessions = useSettingsStore((state) => state.setAutoRestoreSessions);
  const setIdleTimeoutMinutes = useSettingsStore((state) => state.setIdleTimeoutMinutes);
  const setMaxContextMessages = useSettingsStore((state) => state.setMaxContextMessages);
  const setShortcut = useSettingsStore((state) => state.setShortcut);
  const resetShortcuts = useSettingsStore((state) => state.resetShortcuts);
  const setOnboardingComplete = useSettingsStore((state) => state.setOnboardingComplete);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const renameWorkspace = useWorkspaceStore((state) => state.renameWorkspace);
  const setWorkspaceColor = useWorkspaceStore((state) => state.setWorkspaceColor);
  const moveWorkspace = useWorkspaceStore((state) => state.moveWorkspace);
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
  const sessions = useSessionStore((state) => state.sessions);
  const moveSessionToWorkspace = useSessionStore((state) => state.moveSessionToWorkspace);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(
    () => localStorage.getItem('neuralterm.anthropicModel') ?? 'claude-sonnet-4-20250514',
  );
  const [updateStatus, setUpdateStatus] = useState('Check for updates');

  useEffect(() => {
    if (!open) return;
    if (!hasTauriRuntime()) {
      setApiKey(localStorage.getItem('neuralterm.anthropicApiKey') ?? '');
      return;
    }

    void invoke<string>('get_anthropic_api_key')
      .then(setApiKey)
      .catch(() => setApiKey(''));
  }, [open]);

  const saveApiKey = (value: string) => {
    setApiKey(value);
    if (hasTauriRuntime()) {
      void invoke('set_anthropic_api_key', { apiKey: value }).catch((error) =>
        console.error('Failed to save API key', error),
      );
    } else {
      localStorage.setItem('neuralterm.anthropicApiKey', value);
    }
  };

  const saveModel = (value: string) => {
    setModel(value);
    localStorage.setItem('neuralterm.anthropicModel', value);
  };

  const removeWorkspace = (workspaceId: string) => {
    sessions
      .filter((session) => session.workspaceId === workspaceId)
      .forEach((session) => moveSessionToWorkspace(session.id, DEFAULT_WORKSPACE_ID));
    deleteWorkspace(workspaceId);
  };

  const checkForUpdates = async () => {
    if (!hasTauriRuntime()) {
      window.open('https://github.com/Anuragh33/neuralterm/releases/latest', '_blank');
      return;
    }
    setUpdateStatus('Checking...');
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) {
        setUpdateStatus('Up to date');
        return;
      }
      setUpdateStatus(`Installing ${update.version}...`);
      await update.downloadAndInstall();
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (error) {
      setUpdateStatus(`Update failed: ${String(error)}`);
    }
  };

  if (!open) return null;

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[380px] max-w-[calc(100vw-24px)] flex-col border-l border-border bg-[#111118] shadow-2xl">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <span className="text-sm font-semibold text-primary">Settings</span>
        <button
          type="button"
          className="ml-auto grid h-8 w-8 place-items-center rounded text-secondary hover:bg-surface hover:text-primary"
          aria-label="Close settings"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase text-secondary">Appearance</h2>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Theme</span>
            <select
              className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none"
              value={theme}
              onChange={(event) => setTheme(event.target.value as ThemeName)}
            >
              {themes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Font family</span>
            <select
              className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none"
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value)}
            >
              {['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'].map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Font size: {fontSize}px</span>
            <input
              type="range"
              min="10"
              max="20"
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Line height: {lineHeight.toFixed(2)}</span>
            <input
              type="range"
              min="1"
              max="1.8"
              step="0.05"
              value={lineHeight}
              onChange={(event) => setLineHeight(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Cursor style</span>
            <select
              className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none"
              value={cursorStyle}
              onChange={(event) => setCursorStyle(event.target.value as 'block' | 'underline' | 'bar')}
            >
              <option value="block">Block</option>
              <option value="underline">Underline</option>
              <option value="bar">Bar</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={cursorBlink}
              onChange={(event) => setCursorBlink(event.target.checked)}
            />
            <span>Blink cursor</span>
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase text-secondary">Workspaces</h2>
          <div className="space-y-2">
            {workspaces.map((workspace, index) => (
              <div key={workspace.id} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 rounded border border-border bg-app p-2">
                <input
                  type="color"
                  className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                  value={workspace.color}
                  aria-label={`${workspace.name} color`}
                  onChange={(event) => setWorkspaceColor(workspace.id, event.target.value)}
                />
                <input
                  className="h-8 min-w-0 rounded border border-border bg-[#101016] px-2 text-xs text-primary outline-none"
                  defaultValue={workspace.name}
                  aria-label={`${workspace.name} name`}
                  onBlur={(event) => renameWorkspace(workspace.id, event.target.value)}
                />
                <div className="flex items-center">
                  <button type="button" className="icon-button" disabled={index === 0} aria-label={`Move ${workspace.name} up`} onClick={() => moveWorkspace(workspace.id, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="icon-button" disabled={index === workspaces.length - 1} aria-label={`Move ${workspace.name} down`} onClick={() => moveWorkspace(workspace.id, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="icon-button text-[#e05050]" disabled={workspace.id === DEFAULT_WORKSPACE_ID} aria-label={`Delete ${workspace.name}`} onClick={() => removeWorkspace(workspace.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase text-secondary">Application</h2>
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={globalLauncherEnabled}
              onChange={(event) => setGlobalLauncherEnabled(event.target.checked)}
            />
            <span>Global quick launcher (Cmd/Ctrl+Shift+Space)</span>
          </label>
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded border border-border bg-app px-3 text-xs text-secondary hover:bg-surface hover:text-primary"
            onClick={() => void checkForUpdates()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="truncate">{updateStatus}</span>
          </button>
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded border border-border bg-app px-3 text-xs text-secondary hover:bg-surface hover:text-primary"
            onClick={() => {
              setOnboardingComplete(false);
              onClose();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Show onboarding again
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase text-secondary">Sessions</h2>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Default shell path</span>
            <input className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none" value={defaultShell} placeholder="Use system default" onChange={(event) => setDefaultShell(event.target.value)} />
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Default working directory</span>
            <input className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none" value={defaultCwd} placeholder="Use shell default" onChange={(event) => setDefaultCwd(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input type="checkbox" checked={autoRestoreSessions} onChange={(event) => setAutoRestoreSessions(event.target.checked)} />
            <span>Restore open sessions on startup</span>
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Idle timeout: {idleTimeoutMinutes} minutes</span>
            <input type="range" min="1" max="120" value={idleTimeoutMinutes} onChange={(event) => setIdleTimeoutMinutes(Number(event.target.value))} className="w-full" />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase text-secondary">AI</h2>
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={aiBridgeEnabled}
              onChange={(event) => setAiBridgeEnabled(event.target.checked)}
            />
            <span>AI Bridge terminal watcher</span>
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Anthropic API key</span>
            <input
              className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none"
              type="password"
              value={apiKey}
              onChange={(event) => saveApiKey(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Context history limit: {maxContextMessages} messages</span>
            <input type="range" min="20" max="200" step="10" value={maxContextMessages} onChange={(event) => setMaxContextMessages(Number(event.target.value))} className="w-full" />
          </label>
          <label className="block space-y-1 text-xs text-secondary">
            <span>Default model</span>
            <input
              className="h-9 w-full rounded border border-border bg-app px-2 text-sm text-primary outline-none"
              value={model}
              onChange={(event) => saveModel(event.target.value)}
            />
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase text-secondary">Shortcuts</h2>
            <button
              type="button"
              className="ml-auto rounded border border-border px-2 py-1 text-xs text-secondary hover:bg-surface hover:text-primary"
              onClick={resetShortcuts}
            >
              Reset
            </button>
          </div>
          <div className="space-y-2">
            {shortcutLabels.map(({ action, label }) => (
              <label key={action} className="grid grid-cols-[1fr_120px] items-center gap-2 text-xs text-secondary">
                <span>{label}</span>
                <input
                  className="h-8 rounded border border-border bg-app px-2 text-xs text-primary outline-none"
                  value={shortcuts[action]}
                  placeholder={DEFAULT_SHORTCUTS[action]}
                  onChange={(event) => setShortcut(action, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="rounded border border-border bg-app px-3 py-2 text-xs text-secondary">
            Workspace switching remains mapped to Cmd+1 through Cmd+9.
          </div>
        </section>
      </div>
    </aside>
  );
}
