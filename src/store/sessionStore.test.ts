import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: [], activeSessionId: null, mruSessionIds: [] });
  });

  it('creates, moves, pins, and updates a session', () => {
    const session = useSessionStore.getState().createSession('shell', { name: 'Primary' });
    const store = useSessionStore.getState();
    store.moveSessionToWorkspace(session.id, 'work');
    store.toggleSessionPinned(session.id);
    store.updateSessionCwd(session.id, '/tmp/project');

    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      name: 'Primary',
      workspaceId: 'work',
      isPinned: true,
      cwd: '/tmp/project',
    });
  });

  it('reorders recent session tabs', () => {
    const first = useSessionStore.getState().createSession('shell', { name: 'First' });
    const second = useSessionStore.getState().createSession('shell', { name: 'Second' });
    useSessionStore.getState().reorderSessionTab(first.id, second.id);
    expect(useSessionStore.getState().mruSessionIds.slice(0, 2)).toEqual([first.id, second.id]);
  });
});
