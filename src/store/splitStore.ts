import { create } from 'zustand';

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitLayout {
  rootSessionId: string;
  paneIds: [string, string];
  direction: SplitDirection;
  ratio: number;
  activePaneIndex: 0 | 1;
}

interface SplitState {
  layouts: Record<string, SplitLayout>;
  splitSession: (
    rootSessionId: string,
    secondarySessionId: string,
    direction: SplitDirection,
  ) => void;
  setDirection: (rootSessionId: string, direction: SplitDirection) => void;
  setRatio: (rootSessionId: string, ratio: number) => void;
  focusPane: (rootSessionId: string, paneIndex: 0 | 1) => void;
  focusNextPane: (rootSessionId: string) => void;
  focusPreviousPane: (rootSessionId: string) => void;
  removeLayout: (rootSessionId: string) => void;
  pruneLayouts: (sessionIds: string[]) => void;
}

const clampRatio = (ratio: number) => Math.min(0.8, Math.max(0.2, ratio));
const storageKey = 'neuralterm.splitLayouts';
const loadLayouts = (): Record<string, SplitLayout> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, SplitLayout>;
  } catch {
    return {};
  }
};
const saveLayouts = (layouts: Record<string, SplitLayout>) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(layouts));
  }
};

export const useSplitStore = create<SplitState>((set) => ({
  layouts: loadLayouts(),
  splitSession: (rootSessionId, secondarySessionId, direction) =>
    set((state) => {
      const layouts: Record<string, SplitLayout> = {
        ...state.layouts,
        [rootSessionId]: {
          rootSessionId,
          paneIds: [rootSessionId, secondarySessionId] as [string, string],
          direction,
          ratio: 0.5,
          activePaneIndex: 1 as const,
        },
      };
      saveLayouts(layouts);
      return { layouts };
    }),
  setDirection: (rootSessionId, direction) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      const layouts: Record<string, SplitLayout> = {
        ...state.layouts,
        [rootSessionId]: { ...layout, direction },
      };
      saveLayouts(layouts);
      return { layouts };
    }),
  setRatio: (rootSessionId, ratio) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      const layouts: Record<string, SplitLayout> = {
        ...state.layouts,
        [rootSessionId]: { ...layout, ratio: clampRatio(ratio) },
      };
      saveLayouts(layouts);
      return { layouts };
    }),
  focusPane: (rootSessionId, paneIndex) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      const layouts: Record<string, SplitLayout> = {
        ...state.layouts,
        [rootSessionId]: { ...layout, activePaneIndex: paneIndex },
      };
      saveLayouts(layouts);
      return { layouts };
    }),
  focusNextPane: (rootSessionId) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      const count = layout.paneIds.length;
      const layouts: Record<string, SplitLayout> = {
        ...state.layouts,
        [rootSessionId]: {
          ...layout,
          activePaneIndex: ((layout.activePaneIndex + 1) % count) as 0 | 1,
        },
      };
      saveLayouts(layouts);
      return { layouts };
    }),
  focusPreviousPane: (rootSessionId) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      const count = layout.paneIds.length;
      const layouts: Record<string, SplitLayout> = {
        ...state.layouts,
        [rootSessionId]: {
          ...layout,
          activePaneIndex: ((layout.activePaneIndex - 1 + count) % count) as 0 | 1,
        },
      };
      saveLayouts(layouts);
      return { layouts };
    }),
  removeLayout: (rootSessionId) =>
    set((state) => {
      const { [rootSessionId]: _removed, ...layouts } = state.layouts;
      saveLayouts(layouts);
      return { layouts };
    }),
  pruneLayouts: (sessionIds) =>
    set((state) => {
      const validIds = new Set(sessionIds);
      const layouts = Object.fromEntries(
        Object.entries(state.layouts).filter(
          ([rootId, layout]) => validIds.has(rootId) && layout.paneIds.every((id) => validIds.has(id)),
        ),
      ) as Record<string, SplitLayout>;
      saveLayouts(layouts);
      return { layouts };
    }),
}));
