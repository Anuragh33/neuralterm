import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import {
  DEFAULT_WORKSPACE_ID,
  SESSION_TYPE_CONFIG,
  type SessionStatus,
  type SessionType,
  type TerminalSession,
} from '../types';
import { hasTauriRuntime } from '../lib/runtime';

interface CreateSessionOptions {
  name?: string;
  workspaceId?: string;
  cwd?: string;
  launchCommand?: string;
  activate?: boolean;
  pendingInput?: string;
  pendingAIContext?: string;
}

interface SessionState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  mruSessionIds: string[];
  hydrateSessions: (sessions: TerminalSession[]) => void;
  createSession: (
    type?: SessionType,
    options?: CreateSessionOptions,
  ) => TerminalSession;
  activateSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  renameSession: (sessionId: string, name: string) => void;
  markPtyStarted: (sessionId: string) => void;
  toggleSessionWatched: (sessionId: string) => void;
  consumePendingInput: (sessionId: string) => void;
  attachAIContext: (sessionId: string, context: string) => void;
  consumePendingAIContext: (sessionId: string) => void;
  setSessionStatus: (sessionId: string, status: SessionStatus) => void;
  touchSession: (sessionId: string) => void;
}

const now = () => new Date().toISOString();

const fallbackRandomId = () =>
  `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : fallbackRandomId();

const persistSession = (session: TerminalSession) => {
  if (!hasTauriRuntime()) return;
  void invoke('upsert_session', { session }).catch((error) => {
    console.error('Failed to persist session', error);
  });
};

const persistSessionActivity = (session: TerminalSession, lastActiveAt: string) => {
  if (!hasTauriRuntime()) return;
  void invoke('persist_session_activity', {
    request: {
      id: session.id,
      lastActiveAt,
      cwd: session.cwd || null,
    },
  }).catch((error) => {
    console.error('Failed to persist session activity', error);
  });
};

const persistSessionRename = (sessionId: string, name: string) => {
  if (!hasTauriRuntime()) return;
  void invoke('rename_session', { request: { id: sessionId, name } }).catch((error) => {
    console.error('Failed to persist session rename', error);
  });
};

const persistSessionClose = (sessionId: string) => {
  if (!hasTauriRuntime()) return;
  void invoke('close_session', {
    request: {
      id: sessionId,
      closedAt: now(),
    },
  }).catch((error) => {
    console.error('Failed to persist session close', error);
  });
};

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  mruSessionIds: [],
  hydrateSessions: (sessions) =>
    set({
      sessions,
      activeSessionId: sessions[0]?.id ?? null,
      mruSessionIds: sessions.map((session) => session.id),
    }),
  createSession: (type = 'shell', options = {}) => {
    const sessionCount = get().sessions.filter((session) => session.type === type).length;
    const config = SESSION_TYPE_CONFIG[type];
    const session: TerminalSession = {
      id: newId(),
      name: options.name ?? `${config.label} ${sessionCount + 1}`,
      type,
      workspaceId: options.workspaceId ?? DEFAULT_WORKSPACE_ID,
      createdAt: now(),
      lastActiveAt: now(),
      cwd: options.cwd ?? '',
      status: config.aiSession ? 'idle' : 'running',
      isPinned: false,
      isWatched: true,
      ptyStarted: false,
      launchCommand: options.launchCommand ?? config.defaultCommand,
      pendingInput: options.pendingInput,
      pendingAIContext: options.pendingAIContext,
    };

    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: options.activate === false ? state.activeSessionId : session.id,
      mruSessionIds:
        options.activate === false
          ? state.mruSessionIds
          : [session.id, ...state.mruSessionIds.filter((id) => id !== session.id)],
    }));
    persistSession(session);

    return session;
  },
  activateSession: (sessionId) => {
    const lastActiveAt = now();
    const session = get().sessions.find((item) => item.id === sessionId);
    set((state) => ({
      activeSessionId: sessionId,
      mruSessionIds: [sessionId, ...state.mruSessionIds.filter((id) => id !== sessionId)],
      sessions: state.sessions.map((item) =>
        item.id === sessionId ? { ...item, lastActiveAt } : item,
      ),
    }));
    if (session) {
      persistSessionActivity(session, lastActiveAt);
    }
  },
  closeSession: (sessionId) => {
    persistSessionClose(sessionId);
    set((state) => {
      const remainingSessions = state.sessions.filter((session) => session.id !== sessionId);
      const mruSessionIds = state.mruSessionIds.filter((id) => id !== sessionId);
      return {
        sessions: remainingSessions,
        mruSessionIds,
        activeSessionId:
          state.activeSessionId === sessionId
            ? mruSessionIds[0] ?? remainingSessions[0]?.id ?? null
            : state.activeSessionId,
      };
    });
  },
  renameSession: (sessionId, name) => {
    const currentName = get().sessions.find((session) => session.id === sessionId)?.name;
    const nextName = name.trim() || currentName || name;
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, name: nextName } : session,
      ),
    }));
    persistSessionRename(sessionId, nextName);
  },
  markPtyStarted: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, ptyStarted: true, status: 'running' } : session,
      ),
    })),
  toggleSessionWatched: (sessionId) => {
    const session = get().sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const nextSession = { ...session, isWatched: !session.isWatched };
    set((state) => ({
      sessions: state.sessions.map((item) => (item.id === sessionId ? nextSession : item)),
    }));
    persistSession(nextSession);
  },
  consumePendingInput: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, pendingInput: undefined } : session,
      ),
    })),
  attachAIContext: (sessionId, context) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, pendingAIContext: context } : session,
      ),
    })),
  consumePendingAIContext: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, pendingAIContext: undefined } : session,
      ),
    })),
  setSessionStatus: (sessionId, status) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, status } : session,
      ),
    })),
  touchSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, lastActiveAt: now(), status: 'running' }
          : session,
      ),
    })),
}));
