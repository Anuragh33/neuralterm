import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_WORKSPACE_ID } from '../types';
import { useWorkspaceStore } from './workspaceStore';

describe('workspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [
        { id: DEFAULT_WORKSPACE_ID, name: 'Local', color: '#7f77dd', collapsed: false, sortOrder: 0 },
      ],
      activeWorkspaceId: 'all',
    });
  });

  it('manages the workspace lifecycle', () => {
    const workspace = useWorkspaceStore.getState().createWorkspace('Work', '#4db877');
    useWorkspaceStore.getState().renameWorkspace(workspace.id, 'Client');
    useWorkspaceStore.getState().setWorkspaceColor(workspace.id, '#60a0d0');
    expect(useWorkspaceStore.getState().workspaces[1]).toMatchObject({
      name: 'Client',
      color: '#60a0d0',
    });

    useWorkspaceStore.getState().deleteWorkspace(workspace.id);
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });
});
