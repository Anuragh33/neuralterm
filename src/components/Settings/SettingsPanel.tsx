import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { hasTauriRuntime } from '../../lib/runtime';
import {
  DEFAULT_SHORTCUTS,
  useSettingsStore,
  type ShortcutAction,
  type ThemeName,
} from '../../store/settingsStore';

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
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setFontFamily = useSettingsStore((state) => state.setFontFamily);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const setLineHeight = useSettingsStore((state) => state.setLineHeight);
  const setCursorStyle = useSettingsStore((state) => state.setCursorStyle);
  const setCursorBlink = useSettingsStore((state) => state.setCursorBlink);
  const setAiBridgeEnabled = useSettingsStore((state) => state.setAiBridgeEnabled);
  const setShortcut = useSettingsStore((state) => state.setShortcut);
  const resetShortcuts = useSettingsStore((state) => state.resetShortcuts);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(
    () => localStorage.getItem('neuralterm.anthropicModel') ?? 'claude-sonnet-4-20250514',
  );

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
