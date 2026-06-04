import { TerminalPane } from './TerminalPane';
import { useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { useSplitStore } from '../../store/splitStore';
import { useSessionStore } from '../../store/sessionStore';
import type { TerminalSession } from '../../types';

interface SplitViewProps {
  session: TerminalSession;
}

export function SplitView({ session }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessions = useSessionStore((state) => state.sessions);
  const layout = useSplitStore((state) => state.layouts[session.id]);
  const setRatio = useSplitStore((state) => state.setRatio);
  const focusPane = useSplitStore((state) => state.focusPane);
  const secondarySession = layout
    ? sessions.find((item) => item.id === layout.paneIds[1])
    : undefined;

  if (!layout || !secondarySession) {
    return <TerminalPane session={session} active focused />;
  }

  const horizontal = layout.direction === 'horizontal';
  const firstStyle = horizontal
    ? { flexBasis: `${layout.ratio * 100}%` }
    : { flexBasis: `${layout.ratio * 100}%` };

  const startDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const nextRatio = horizontal
        ? (moveEvent.clientX - rect.left) / rect.width
        : (moveEvent.clientY - rect.top) / rect.height;
      setRatio(session.id, nextRatio);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={[
        'flex h-full min-h-0 min-w-0 bg-app',
        horizontal ? 'flex-row' : 'flex-col',
      ].join(' ')}
    >
      <div className="flex min-h-0 min-w-0" style={firstStyle}>
        <TerminalPane
          session={session}
          active={layout.activePaneIndex === 0}
          focused={layout.activePaneIndex === 0}
          onFocus={() => focusPane(session.id, 0)}
        />
      </div>
      <div
        className={[
          'shrink-0 bg-border hover:bg-[#7f77dd]',
          horizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        ].join(' ')}
        role="separator"
        aria-label="Resize terminal split"
        onMouseDown={startDrag}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <TerminalPane
          session={secondarySession}
          active={layout.activePaneIndex === 1}
          focused={layout.activePaneIndex === 1}
          onFocus={() => focusPane(session.id, 1)}
        />
      </div>
    </div>
  );
}
