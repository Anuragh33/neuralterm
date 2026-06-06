import { beforeEach, describe, expect, it } from 'vitest';
import { useSplitStore } from './splitStore';

describe('splitStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSplitStore.setState({ layouts: {} });
  });

  it('clamps ratios and removes invalid persisted layouts', () => {
    useSplitStore.getState().splitSession('root', 'secondary', 'horizontal');
    useSplitStore.getState().setRatio('root', 0.99);
    expect(useSplitStore.getState().layouts.root.ratio).toBe(0.8);

    useSplitStore.getState().pruneLayouts(['root']);
    expect(useSplitStore.getState().layouts).toEqual({});
  });
});
