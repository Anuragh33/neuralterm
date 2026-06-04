import { useEffect } from 'react';
import { useSettingsStore, type ShortcutAction } from '../store/settingsStore';

interface HotkeyHandlers {
  newShell?: () => void;
  openPalette?: () => void;
  openSettings?: () => void;
  toggleSidebar?: () => void;
  closeActive?: () => void;
  splitHorizontal?: () => void;
  splitVertical?: () => void;
  switchPanePrevious?: () => void;
  switchPaneNext?: () => void;
  searchTerminal?: () => void;
  switchWorkspace?: (index: number) => void;
  cycleTabsForward?: () => void;
  cycleTabsBackward?: () => void;
  increaseFont?: () => void;
  decreaseFont?: () => void;
  resetFont?: () => void;
}

export function useHotkeys(handlers: HotkeyHandlers) {
  const shortcuts = useSettingsStore((state) => state.shortcuts);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const pressed = eventToShortcut(event);
      const matches = (action: ShortcutAction) => pressed === normalizeShortcut(shortcuts[action]);

      if (matches('cycleTabsForward')) {
        event.preventDefault();
        handlers.cycleTabsForward?.();
        return;
      }
      if (matches('cycleTabsBackward')) {
        event.preventDefault();
        handlers.cycleTabsBackward?.();
        return;
      }

      const command = event.metaKey || event.ctrlKey;
      if (!command) return;

      if (matches('newShell')) {
        event.preventDefault();
        handlers.newShell?.();
      }
      if (matches('openPalette')) {
        event.preventDefault();
        handlers.openPalette?.();
      }
      if (matches('openSettings')) {
        event.preventDefault();
        handlers.openSettings?.();
      }
      if (matches('toggleSidebar')) {
        event.preventDefault();
        handlers.toggleSidebar?.();
      }
      if (matches('splitHorizontal')) {
        event.preventDefault();
        handlers.splitHorizontal?.();
      }
      if (matches('splitVertical')) {
        event.preventDefault();
        handlers.splitVertical?.();
      }
      if (matches('closeActive')) {
        event.preventDefault();
        handlers.closeActive?.();
      }
      if (matches('searchTerminal')) {
        event.preventDefault();
        handlers.searchTerminal?.();
      }
      if (matches('switchPanePrevious')) {
        event.preventDefault();
        handlers.switchPanePrevious?.();
      }
      if (matches('switchPaneNext')) {
        event.preventDefault();
        handlers.switchPaneNext?.();
      }
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        handlers.switchWorkspace?.(Number(event.key) - 1);
      }
      if (matches('increaseFont')) {
        event.preventDefault();
        handlers.increaseFont?.();
      }
      if (matches('decreaseFont')) {
        event.preventDefault();
        handlers.decreaseFont?.();
      }
      if (matches('resetFont')) {
        event.preventDefault();
        handlers.resetFont?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, shortcuts]);
}

function eventToShortcut(event: KeyboardEvent) {
  const parts: string[] = [];
  if (event.metaKey || (event.ctrlKey && event.key !== 'Tab')) parts.push('Mod');
  if (event.ctrlKey && event.key === 'Tab') parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(normalizeKey(event.key));
  return parts.join('+');
}

function normalizeShortcut(shortcut: string) {
  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const key = parts.pop() ?? '';
  const normalizedMods = parts
    .map((part) => normalizeModifier(part))
    .filter(Boolean)
    .sort(modifierSort);
  return [...normalizedMods, normalizeKey(key)].join('+');
}

function normalizeModifier(modifier: string) {
  const lower = modifier.toLowerCase();
  if (lower === 'cmd' || lower === 'command' || lower === 'meta' || lower === 'mod') return 'Mod';
  if (lower === 'ctrl' || lower === 'control') return 'Ctrl';
  if (lower === 'shift') return 'Shift';
  if (lower === 'alt' || lower === 'option') return 'Alt';
  return '';
}

function normalizeKey(key: string) {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function modifierSort(a: string, b: string) {
  const order = ['Mod', 'Ctrl', 'Alt', 'Shift'];
  return order.indexOf(a) - order.indexOf(b);
}
