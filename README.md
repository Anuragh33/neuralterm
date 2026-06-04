# NeuralTerm

NeuralTerm is a Tauri v2 + React + TypeScript desktop terminal multiplexer.

Implemented capabilities:

- Tauri v2 project structure
- React/Vite/Tailwind frontend
- Zustand session, workspace, and settings stores
- Styled left sidebar, top tab bar, terminal surface, command palette, and status bar
- xterm.js terminal pane with fit, web links, and search addons
- Rust PTY backend using `portable-pty`
- Tauri IPC commands for spawning, writing, resizing, and killing shell sessions
- SQLite persistence for workspaces, sessions, and AI message history
- Split panes, resizable sidebar, command palette, and keyboard shortcuts
- Claude Code and HER AI sessions with markdown rendering, attachments, shell helpers, and run-in-terminal actions
- OS keychain storage for the Anthropic API key in the desktop app
- AI Bridge terminal-output detection and context handoff into AI sessions
- GitHub Releases workflow for macOS, Windows, and Linux desktop assets

## Commands

```bash
npm install
npm run dev
npm run tauri:dev
npm run build
npm run tauri:build
```

The dev server uses `http://127.0.0.1:1421/` because `1420` was already occupied on this machine during setup.

## Releases

GitHub Releases are configured in `.github/workflows/release.yml`. Push a version tag such as `v0.1.0` to build macOS, Windows, and Linux release assets in GitHub Actions.

See `docs/release.md` for the full release checklist and signing notes.
