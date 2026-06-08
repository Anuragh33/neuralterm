import { create } from 'zustand';

export type ThemeName = 'dark' | 'light' | 'oled' | 'dracula' | 'solarized';
export type ShortcutAction =
  | 'newShell'
  | 'openPalette'
  | 'openSettings'
  | 'toggleSidebar'
  | 'splitHorizontal'
  | 'splitVertical'
  | 'closeActive'
  | 'searchTerminal'
  | 'historySearch'
  | 'switchPanePrevious'
  | 'switchPaneNext'
  | 'cycleTabsForward'
  | 'cycleTabsBackward'
  | 'increaseFont'
  | 'decreaseFont'
  | 'resetFont';

export type ShortcutMap = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  newShell: 'Mod+T',
  openPalette: 'Mod+K',
  openSettings: 'Mod+,',
  toggleSidebar: 'Mod+B',
  splitHorizontal: 'Mod+D',
  splitVertical: 'Mod+Shift+D',
  closeActive: 'Mod+W',
  searchTerminal: 'Mod+F',
  historySearch: 'Mod+Shift+H',
  switchPanePrevious: 'Mod+[',
  switchPaneNext: 'Mod+]',
  cycleTabsForward: 'Ctrl+Tab',
  cycleTabsBackward: 'Ctrl+Shift+Tab',
  increaseFont: 'Mod+=',
  decreaseFont: 'Mod+-',
  resetFont: 'Mod+0',
};

const settingsKey = 'neuralterm.settings';

interface SettingsState {
  theme: ThemeName;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  aiBridgeEnabled: boolean;
  globalLauncherEnabled: boolean;
  onboardingComplete: boolean;
  defaultShell: string;
  defaultCwd: string;
  autoRestoreSessions: boolean;
  idleTimeoutMinutes: number;
  maxContextMessages: number;
  shortcuts: ShortcutMap;
  setTheme: (theme: ThemeName) => void;
  setFontFamily: (fontFamily: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setCursorStyle: (cursorStyle: 'block' | 'underline' | 'bar') => void;
  setCursorBlink: (cursorBlink: boolean) => void;
  setAiBridgeEnabled: (enabled: boolean) => void;
  setGlobalLauncherEnabled: (enabled: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setDefaultShell: (shell: string) => void;
  setDefaultCwd: (cwd: string) => void;
  setAutoRestoreSessions: (enabled: boolean) => void;
  setIdleTimeoutMinutes: (minutes: number) => void;
  setMaxContextMessages: (messages: number) => void;
  setShortcut: (action: ShortcutAction, shortcut: string) => void;
  resetShortcuts: () => void;
}

type StoredSettings = Partial<
  Pick<
    SettingsState,
    | 'theme'
    | 'fontFamily'
    | 'fontSize'
    | 'lineHeight'
    | 'cursorStyle'
    | 'cursorBlink'
    | 'sidebarCollapsed'
    | 'sidebarWidth'
    | 'aiBridgeEnabled'
    | 'globalLauncherEnabled'
    | 'onboardingComplete'
    | 'defaultShell'
    | 'defaultCwd'
    | 'autoRestoreSessions'
    | 'idleTimeoutMinutes'
    | 'maxContextMessages'
    | 'shortcuts'
  >
>;

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const loadSettings = (): StoredSettings => {
  if (!canUseStorage()) return {};
  try {
    return JSON.parse(localStorage.getItem(settingsKey) ?? '{}') as StoredSettings;
  } catch {
    return {};
  }
};

const saveSettings = (state: SettingsState) => {
  if (!canUseStorage()) return;
  const serializable: StoredSettings = {
    theme: state.theme,
    fontFamily: state.fontFamily,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    cursorStyle: state.cursorStyle,
    cursorBlink: state.cursorBlink,
    sidebarCollapsed: state.sidebarCollapsed,
    sidebarWidth: state.sidebarWidth,
    aiBridgeEnabled: state.aiBridgeEnabled,
    globalLauncherEnabled: state.globalLauncherEnabled,
    onboardingComplete: state.onboardingComplete,
    defaultShell: state.defaultShell,
    defaultCwd: state.defaultCwd,
    autoRestoreSessions: state.autoRestoreSessions,
    idleTimeoutMinutes: state.idleTimeoutMinutes,
    maxContextMessages: state.maxContextMessages,
    shortcuts: state.shortcuts,
  };
  localStorage.setItem(settingsKey, JSON.stringify(serializable));
};

const storedSettings = loadSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: storedSettings.theme ?? 'dark',
  fontFamily: storedSettings.fontFamily ?? 'JetBrains Mono',
  fontSize: storedSettings.fontSize ?? 13,
  lineHeight: storedSettings.lineHeight ?? 1.25,
  cursorStyle: storedSettings.cursorStyle ?? 'block',
  cursorBlink: storedSettings.cursorBlink ?? true,
  sidebarCollapsed: storedSettings.sidebarCollapsed ?? false,
  sidebarWidth: storedSettings.sidebarWidth ?? 220,
  aiBridgeEnabled: storedSettings.aiBridgeEnabled ?? true,
  globalLauncherEnabled: storedSettings.globalLauncherEnabled ?? false,
  onboardingComplete: storedSettings.onboardingComplete ?? false,
  defaultShell: storedSettings.defaultShell ?? '',
  defaultCwd: storedSettings.defaultCwd ?? '',
  autoRestoreSessions: storedSettings.autoRestoreSessions ?? true,
  idleTimeoutMinutes: storedSettings.idleTimeoutMinutes ?? 5,
  maxContextMessages: storedSettings.maxContextMessages ?? 50,
  shortcuts: { ...DEFAULT_SHORTCUTS, ...(storedSettings.shortcuts ?? {}) },
  setTheme: (theme) =>
    set((state) => {
      const next = { ...state, theme };
      saveSettings(next);
      return { theme };
    }),
  setFontFamily: (fontFamily) =>
    set((state) => {
      const next = { ...state, fontFamily };
      saveSettings(next);
      return { fontFamily };
    }),
  setSidebarCollapsed: (sidebarCollapsed) =>
    set((state) => {
      const next = { ...state, sidebarCollapsed };
      saveSettings(next);
      return { sidebarCollapsed };
    }),
  setSidebarWidth: (sidebarWidth) =>
    set((state) => {
      const nextWidth = Math.min(320, Math.max(160, sidebarWidth));
      const next = { ...state, sidebarWidth: nextWidth };
      saveSettings(next);
      return { sidebarWidth: nextWidth };
    }),
  setFontSize: (fontSize) =>
    set((state) => {
      const nextFontSize = Math.min(20, Math.max(10, fontSize));
      const next = { ...state, fontSize: nextFontSize };
      saveSettings(next);
      return { fontSize: nextFontSize };
    }),
  setLineHeight: (lineHeight) =>
    set((state) => {
      const nextLineHeight = Math.min(1.8, Math.max(1, lineHeight));
      const next = { ...state, lineHeight: nextLineHeight };
      saveSettings(next);
      return { lineHeight: nextLineHeight };
    }),
  setCursorStyle: (cursorStyle) =>
    set((state) => {
      const next = { ...state, cursorStyle };
      saveSettings(next);
      return { cursorStyle };
    }),
  setCursorBlink: (cursorBlink) =>
    set((state) => {
      const next = { ...state, cursorBlink };
      saveSettings(next);
      return { cursorBlink };
    }),
  setAiBridgeEnabled: (aiBridgeEnabled) =>
    set((state) => {
      const next = { ...state, aiBridgeEnabled };
      saveSettings(next);
      return { aiBridgeEnabled };
    }),
  setGlobalLauncherEnabled: (globalLauncherEnabled) =>
    set((state) => {
      const next = { ...state, globalLauncherEnabled };
      saveSettings(next);
      return { globalLauncherEnabled };
    }),
  setOnboardingComplete: (onboardingComplete) =>
    set((state) => {
      const next = { ...state, onboardingComplete };
      saveSettings(next);
      return { onboardingComplete };
    }),
  setDefaultShell: (defaultShell) =>
    set((state) => {
      const next = { ...state, defaultShell };
      saveSettings(next);
      return { defaultShell };
    }),
  setDefaultCwd: (defaultCwd) =>
    set((state) => {
      const next = { ...state, defaultCwd };
      saveSettings(next);
      return { defaultCwd };
    }),
  setAutoRestoreSessions: (autoRestoreSessions) =>
    set((state) => {
      const next = { ...state, autoRestoreSessions };
      saveSettings(next);
      return { autoRestoreSessions };
    }),
  setIdleTimeoutMinutes: (idleTimeoutMinutes) =>
    set((state) => {
      const value = Math.min(120, Math.max(1, idleTimeoutMinutes));
      const next = { ...state, idleTimeoutMinutes: value };
      saveSettings(next);
      return { idleTimeoutMinutes: value };
    }),
  setMaxContextMessages: (maxContextMessages) =>
    set((state) => {
      const value = Math.min(200, Math.max(20, maxContextMessages));
      const next = { ...state, maxContextMessages: value };
      saveSettings(next);
      return { maxContextMessages: value };
    }),
  setShortcut: (action, shortcut) =>
    set((state) => {
      const shortcuts = { ...state.shortcuts, [action]: shortcut.trim() };
      const next = { ...state, shortcuts };
      saveSettings(next);
      return { shortcuts };
    }),
  resetShortcuts: () =>
    set((state) => {
      const next = { ...state, shortcuts: DEFAULT_SHORTCUTS };
      saveSettings(next);
      return { shortcuts: DEFAULT_SHORTCUTS };
    }),
}));
