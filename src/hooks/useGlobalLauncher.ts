import { useEffect } from 'react';
import { hasTauriRuntime } from '../lib/runtime';
import { useSettingsStore } from '../store/settingsStore';

const shortcut = 'CommandOrControl+Shift+Space';

export function useGlobalLauncher(onOpen: () => void) {
  const enabled = useSettingsStore((state) => state.globalLauncherEnabled);

  useEffect(() => {
    if (!enabled || !hasTauriRuntime()) return;
    let cancelled = false;

    void import('@tauri-apps/plugin-global-shortcut').then(async ({ isRegistered, register }) => {
      if (cancelled || (await isRegistered(shortcut))) return;
      await register(shortcut, onOpen);
    });

    return () => {
      cancelled = true;
      void import('@tauri-apps/plugin-global-shortcut').then(({ unregister }) =>
        unregister(shortcut).catch(() => undefined),
      );
    };
  }, [enabled, onOpen]);
}
