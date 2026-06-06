import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import { DEFAULT_WORKSPACE_ID, type Workspace } from '../types';
import { hasTauriRuntime } from '../lib/runtime';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | 'all';
  hydrateWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspaceId: string | 'all') => void;
  createWorkspace: (name: string, color: string) => Workspace;
  renameWorkspace: (workspaceId: string, name: string) => void;
  setWorkspaceColor: (workspaceId: string, color: string) => void;
  moveWorkspace: (workspaceId: string, direction: -1 | 1) => void;
  deleteWorkspace: (workspaceId: string) => void;
  toggleWorkspace: (workspaceId: string) => void;
}

const fallbackRandomId = () =>
  `workspace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : fallbackRandomId();

const defaultWorkspace: Workspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: 'Local',
  color: '#7f77dd',
  collapsed: false,
  sortOrder: 0,
};

const persistWorkspace = (workspace: Workspace) => {
  if (!hasTauriRuntime()) return;
  void invoke('create_workspace', {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      color: workspace.color,
      collapsed: workspace.collapsed,
      sortOrder: workspace.sortOrder ?? 0,
    },
  }).catch((error) => {
    console.error('Failed to persist workspace', error);
  });
};

const persistWorkspaceCollapsed = (workspace: Workspace) => {
  if (!hasTauriRuntime()) return;
  void invoke('set_workspace_collapsed', {
    request: {
      id: workspace.id,
      collapsed: workspace.collapsed,
    },
  }).catch((error) => {
    console.error('Failed to persist workspace collapse state', error);
  });
};

const deletePersistedWorkspace = (workspaceId: string) => {
  if (!hasTauriRuntime()) return;
  void invoke('delete_workspace', { workspaceId }).catch((error) => {
    console.error('Failed to delete workspace', error);
  });
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: 'all',
  workspaces: [defaultWorkspace],
  hydrateWorkspaces: (workspaces) =>
    set({
      workspaces: workspaces.length > 0 ? workspaces : [defaultWorkspace],
      activeWorkspaceId: 'all',
    }),
  setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
  createWorkspace: (name, color) => {
    let workspace: Workspace;
    set((state) => {
      workspace = {
        id: newId(),
        name: name.trim(),
        color,
        collapsed: false,
        sortOrder: state.workspaces.length,
      };
      return {
        workspaces: [...state.workspaces, workspace],
        activeWorkspaceId: workspace.id,
      };
    });
    persistWorkspace(workspace!);
    return workspace!;
  },
  renameWorkspace: (workspaceId, name) =>
    set((state) => {
      const nextName = name.trim();
      if (!nextName) return state;
      const workspaces = state.workspaces.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, name: nextName } : workspace,
      );
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (workspace) persistWorkspace(workspace);
      return { workspaces };
    }),
  setWorkspaceColor: (workspaceId, color) =>
    set((state) => {
      const workspaces = state.workspaces.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, color } : workspace,
      );
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (workspace) persistWorkspace(workspace);
      return { workspaces };
    }),
  moveWorkspace: (workspaceId, direction) =>
    set((state) => {
      const index = state.workspaces.findIndex((workspace) => workspace.id === workspaceId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= state.workspaces.length) return state;
      const workspaces = [...state.workspaces];
      [workspaces[index], workspaces[targetIndex]] = [workspaces[targetIndex], workspaces[index]];
      const ordered = workspaces.map((workspace, sortOrder) => ({ ...workspace, sortOrder }));
      ordered.forEach(persistWorkspace);
      return { workspaces: ordered };
    }),
  deleteWorkspace: (workspaceId) => {
    if (workspaceId === DEFAULT_WORKSPACE_ID) return;
    deletePersistedWorkspace(workspaceId);
    set((state) => ({
      workspaces: state.workspaces
        .filter((workspace) => workspace.id !== workspaceId)
        .map((workspace, sortOrder) => ({ ...workspace, sortOrder })),
      activeWorkspaceId: state.activeWorkspaceId === workspaceId ? 'all' : state.activeWorkspaceId,
    }));
  },
  toggleWorkspace: (workspaceId) => {
    let changedWorkspace: Workspace | undefined;
    set((state) => ({
      workspaces: state.workspaces.map((workspace) => {
        if (workspace.id !== workspaceId) return workspace;
        changedWorkspace = { ...workspace, collapsed: !workspace.collapsed };
        return changedWorkspace;
      }),
    }));
    if (changedWorkspace) {
      persistWorkspaceCollapsed(changedWorkspace);
    }
  },
}));
