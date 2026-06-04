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
}

const clampRatio = (ratio: number) => Math.min(0.8, Math.max(0.2, ratio));

export const useSplitStore = create<SplitState>((set) => ({
  layouts: {},
  splitSession: (rootSessionId, secondarySessionId, direction) =>
    set((state) => ({
      layouts: {
        ...state.layouts,
        [rootSessionId]: {
          rootSessionId,
          paneIds: [rootSessionId, secondarySessionId],
          direction,
          ratio: 0.5,
          activePaneIndex: 1,
        },
      },
    })),
  setDirection: (rootSessionId, direction) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      return {
        layouts: {
          ...state.layouts,
          [rootSessionId]: { ...layout, direction },
        },
      };
    }),
  setRatio: (rootSessionId, ratio) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      return {
        layouts: {
          ...state.layouts,
          [rootSessionId]: { ...layout, ratio: clampRatio(ratio) },
        },
      };
    }),
  focusPane: (rootSessionId, paneIndex) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      return {
        layouts: {
          ...state.layouts,
          [rootSessionId]: { ...layout, activePaneIndex: paneIndex },
        },
      };
    }),
  focusNextPane: (rootSessionId) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      return {
        layouts: {
          ...state.layouts,
          [rootSessionId]: {
            ...layout,
            activePaneIndex: layout.activePaneIndex === 0 ? 1 : 0,
          },
        },
      };
    }),
  focusPreviousPane: (rootSessionId) =>
    set((state) => {
      const layout = state.layouts[rootSessionId];
      if (!layout) return state;
      return {
        layouts: {
          ...state.layouts,
          [rootSessionId]: {
            ...layout,
            activePaneIndex: layout.activePaneIndex === 0 ? 1 : 0,
          },
        },
      };
    }),
  removeLayout: (rootSessionId) =>
    set((state) => {
      const { [rootSessionId]: _removed, ...layouts } = state.layouts;
      return { layouts };
    }),
}));

