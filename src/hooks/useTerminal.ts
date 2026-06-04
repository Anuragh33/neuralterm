import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useEffect, useRef } from 'react';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { useSessionStore } from '../store/sessionStore';
import { useSettingsStore } from '../store/settingsStore';
import type { PtyDataEvent, PtyFailureEvent, TerminalSession } from '../types';

const hasTauriRuntime = () =>
  typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';

export function useTerminal(
  session: TerminalSession,
  containerRef: React.RefObject<HTMLDivElement>,
  active: boolean,
) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const markPtyStarted = useSessionStore((state) => state.markPtyStarted);
  const consumePendingInput = useSessionStore((state) => state.consumePendingInput);
  const setSessionStatus = useSessionStore((state) => state.setSessionStatus);
  const touchSession = useSessionStore((state) => state.touchSession);
  const fontFamily = useSettingsStore((state) => state.fontFamily);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const lineHeight = useSettingsStore((state) => state.lineHeight);
  const cursorStyle = useSettingsStore((state) => state.cursorStyle);
  const cursorBlink = useSettingsStore((state) => state.cursorBlink);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink,
      cursorStyle,
      fontFamily: `"${fontFamily}", SFMono-Regular, Menlo, monospace`,
      fontSize,
      lineHeight,
      macOptionIsMeta: true,
      scrollback: 8000,
      theme: {
        background: '#0e0e10',
        foreground: '#e0dff8',
        cursor: '#e0dff8',
        selectionBackground: '#313145',
        black: '#15151a',
        red: '#e05050',
        green: '#4db877',
        yellow: '#e0a050',
        blue: '#60a0d0',
        magenta: '#b09ee0',
        cyan: '#61c7c7',
        white: '#e0dff8',
        brightBlack: '#5a5a66',
        brightRed: '#ff7676',
        brightGreen: '#6bdc96',
        brightYellow: '#ffc36b',
        brightBlue: '#7bbbea',
        brightMagenta: '#d0b8ff',
        brightCyan: '#82e4e4',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(searchAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    let disposed = false;
    let unlistenData: UnlistenFn | undefined;
    let unlistenError: UnlistenFn | undefined;
    let unlistenExit: UnlistenFn | undefined;

    const resizeBackend = () => {
      if (!hasTauriRuntime()) return;
      void invoke('resize_pty', {
        sessionId: session.id,
        cols: terminal.cols,
        rows: terminal.rows,
      }).catch(() => undefined);
    };

    const fitAndResize = () => {
      if (disposed) return;
      try {
        fitAddon.fit();
        resizeBackend();
      } catch {
        // xterm throws if fit runs against a hidden or detached element.
      }
    };

    const resizeObserver = new ResizeObserver(fitAndResize);
    resizeObserver.observe(containerRef.current);

    const dataDisposable = terminal.onData((data) => {
      touchSession(session.id);
      if (!hasTauriRuntime()) {
        terminal.write(data);
        return;
      }
      void invoke('write_pty', { sessionId: session.id, data }).catch((error) => {
        terminal.writeln(`\r\n\x1b[31mPTY write failed: ${String(error)}\x1b[0m`);
      });
    });

    const onSearchRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId: string }>;
      if (customEvent.detail.sessionId !== session.id) return;
      const query = window.prompt('Search terminal');
      if (query) {
        searchAddon.findNext(query);
      }
    };
    window.addEventListener('neuralterm-terminal-search', onSearchRequest);

    if (hasTauriRuntime()) {
      listen<PtyDataEvent>('pty-data', (event) => {
        if (event.payload.sessionId === session.id) {
          terminal.write(event.payload.data);
          touchSession(session.id);
        }
      }).then((unlisten) => {
        unlistenData = unlisten;
      });

      listen<PtyFailureEvent>('pty-error', (event) => {
        if (event.payload.sessionId === session.id) {
          terminal.writeln(`\r\n\x1b[31m${event.payload.message}\x1b[0m`);
          setSessionStatus(session.id, 'crashed');
        }
      }).then((unlisten) => {
        unlistenError = unlisten;
      });

      listen<PtyFailureEvent>('pty-exit', (event) => {
        if (event.payload.sessionId === session.id) {
          setSessionStatus(session.id, 'closed');
        }
      }).then((unlisten) => {
        unlistenExit = unlisten;
      });
    }

    const spawn = async () => {
      if (!hasTauriRuntime()) {
        terminal.writeln('\x1b[35mNeuralTerm browser preview\x1b[0m');
        terminal.writeln('Run `npm run tauri:dev` to attach this pane to a real PTY.');
        terminal.write('\r\n$ ');
        if (session.pendingInput) {
          terminal.write(session.pendingInput);
          consumePendingInput(session.id);
        }
        markPtyStarted(session.id);
        return;
      }

      if (session.ptyStarted) {
        terminal.writeln('\x1b[90mReattached to live PTY output stream.\x1b[0m');
        return;
      }

      try {
        await invoke('spawn_pty', {
          request: {
            sessionId: session.id,
            command: session.launchCommand ?? null,
            cwd: session.cwd || null,
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });
        markPtyStarted(session.id);
        if (session.pendingInput) {
          window.setTimeout(() => {
            void invoke('write_pty', {
              sessionId: session.id,
              data: session.pendingInput,
            }).finally(() => consumePendingInput(session.id));
          }, 150);
        }
      } catch (error) {
        terminal.writeln(`\x1b[31mFailed to spawn PTY: ${String(error)}\x1b[0m`);
        setSessionStatus(session.id, 'crashed');
      }
    };

    void spawn();
    window.requestAnimationFrame(fitAndResize);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      dataDisposable.dispose();
      window.removeEventListener('neuralterm-terminal-search', onSearchRequest);
      unlistenData?.();
      unlistenError?.();
      unlistenExit?.();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, [
    active,
    consumePendingInput,
    containerRef,
    cursorBlink,
    cursorStyle,
    fontFamily,
    fontSize,
    lineHeight,
    markPtyStarted,
    session,
    setSessionStatus,
    touchSession,
  ]);

  useEffect(() => {
    if (active) {
      terminalRef.current?.focus();
      window.requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit();
        } catch {
          // Ignored for hidden panes.
        }
      });
    }
  }, [active]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.fontSize = fontSize;
      terminalRef.current.options.lineHeight = lineHeight;
    }
    window.requestAnimationFrame(() => {
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Ignored for hidden panes.
      }
    });
  }, [fontSize, lineHeight]);
}
