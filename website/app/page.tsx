import { SiteHeader } from './components/SiteHeader';

const releaseUrl = 'https://github.com/Anuragh33/neuralterm/releases/tag/v0.1.0';

const platforms = [
  'Apple Silicon DMG',
  'Intel Mac DMG',
  'Windows EXE',
  'Windows MSI',
  'Linux AppImage',
  'Debian package',
  'RPM package',
];

const features = [
  {
    mark: 'terminal-mark',
    title: 'Real PTY terminals',
    body: 'Rust backend commands spawn, resize, write to, and kill shell sessions through portable-pty.',
  },
  {
    mark: 'split-mark',
    title: 'Split-pane flow',
    body: 'Horizontal and vertical splits keep build commands, logs, and verification shells visible together.',
  },
  {
    mark: 'workspace-mark',
    title: 'Persistent workspaces',
    body: 'SQLite stores workspaces, sessions, collapsed state, activity, and AI message history.',
  },
  {
    mark: 'ai-mark',
    title: 'Claude Code and HER',
    body: 'AI panes support markdown, attachments, shell helpers, voice input, and run-in-terminal code blocks.',
  },
  {
    mark: 'key-mark',
    title: 'Keychain storage',
    body: 'Anthropic credentials live in the OS keychain in the desktop app, with browser fallback for preview mode.',
  },
  {
    mark: 'release-mark',
    title: 'Release automation',
    body: 'Version tags trigger macOS, Windows, and Linux builds through GitHub Actions and Tauri bundling.',
  },
];

const architecture = [
  ['React UI', 'Top bar, sidebar, command palette, settings, terminals, and AI panes.'],
  ['Zustand state', 'Sessions, workspaces, splits, settings, and bridge suggestions.'],
  ['Tauri commands', 'IPC layer for persistence, PTY lifecycle, shell helpers, and keychain access.'],
  ['Rust backend', 'portable-pty, sqlx, keyring, tokio, and event emission.'],
  ['SQLite', 'Durable app state in the platform app data directory.'],
  ['GitHub Releases', 'Matrix builds produce release assets for each desktop platform.'],
];

const terminalLines = [
  ['$', 'neuralterm --launch workspace'],
  ['ok', 'spawned real PTY session through Rust backend'],
  ['ok', 'restored workspaces, splits, and AI message history'],
  ['watch', 'AI Bridge is scanning terminal output'],
  ['fix', 'Claude Code can receive failing command context'],
  ['ship', 'macOS, Windows, and Linux assets published'],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="hero terminal-hero" aria-labelledby="hero-title">
          <div className="terminal-noise" aria-hidden="true" />
          <div className="terminal-stage">
            <div className="terminal-titlebar" aria-hidden="true">
              <span className="window-dot red-dot" />
              <span className="window-dot amber-dot" />
              <span className="window-dot green-dot" />
              <span className="terminal-path">~/neuralterm</span>
            </div>
            <div className="terminal-hero-grid">
              <div className="hero-content">
                <p className="command-line">
                  <span>$</span> neuralterm --explain
                </p>
                <h1 id="hero-title">A responsive terminal for the AI repair loop.</h1>
                <p className="hero-copy">
                  NeuralTerm is a desktop terminal multiplexer with real PTYs, split panes,
                  persistent workspaces, Claude Code sessions, HER, and AI Bridge context capture.
                </p>
                <div className="hero-actions" aria-label="Primary actions">
                  <a className="button primary" href={releaseUrl}>
                    ./download-v0.1.0
                  </a>
                  <a className="button secondary" href="#tour">
                    less workflow.md
                  </a>
                </div>
              </div>
              <div className="hero-terminal" aria-label="NeuralTerm status output">
                <div className="terminal-output">
                  {terminalLines.map(([label, text]) => (
                    <p key={`${label}-${text}`}>
                      <span className={`line-label label-${label.replace('$', 'prompt')}`}>
                        {label}
                      </span>
                      <span>{text}</span>
                    </p>
                  ))}
                  <p className="cursor-line">
                    <span className="line-label">run</span>
                    <span>npm run tauri:dev</span>
                    <span className="cursor" />
                  </p>
                </div>
              </div>
            </div>
            <dl className="hero-stats" aria-label="Project status">
              <div>
                <dt>release</dt>
                <dd>v0.1.0</dd>
              </div>
              <div>
                <dt>targets</dt>
                <dd>mac win linux</dd>
              </div>
              <div>
                <dt>runtime</dt>
                <dd>tauri v2</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="platform-band" aria-label="Available downloads">
          <div className="platform-track">
            {platforms.map((platform) => (
              <span key={platform}>{platform}</span>
            ))}
          </div>
        </section>

        <section id="tour" className="showcase section-pad">
          <div className="section-heading">
            <p className="eyebrow">$ less workflow.md</p>
            <h2>Terminal, assistant, and build context share the same workspace.</h2>
            <p>
              Shell sessions, AI sessions, and bridge alerts use the same session model. That makes
              it fast to move from a failing command to a Claude-assisted fix without losing the
              exact terminal context.
            </p>
          </div>
          <figure className="workspace-preview terminal-frame">
            <figcaption>neuralterm workspace preview</figcaption>
            <img
              src="/images/neuralterm-workspace.svg"
              alt="NeuralTerm workspace preview with sidebar, split terminals, and AI panel"
            />
          </figure>
        </section>

        <section id="features" className="features section-pad">
          <div className="section-heading narrow">
            <p className="eyebrow">$ ls features</p>
            <h2>Built like a terminal first, then extended where AI actually helps.</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className={`feature-mark ${feature.mark}`} />
                <h3>./{feature.title.toLowerCase().replaceAll(' ', '-')}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="bridge" className="bridge section-pad">
          <div className="bridge-copy">
            <p className="eyebrow">$ tail -f ai-bridge.log</p>
            <h2>When the terminal fails, the assistant gets the useful part.</h2>
            <p>
              AI Bridge watches terminal output for tracebacks, panics, npm errors, permission
              failures, fatal git errors, segmentation faults, and failed command hints. When it
              finds one, it captures a compact excerpt and offers to attach it to Claude Code.
            </p>
            <ul className="bridge-list">
              <li>Captures the source session and terminal excerpt.</li>
              <li>Ignores sessions you mark as unwatched.</li>
              <li>Hands context into an AI pane without copying logs by hand.</li>
            </ul>
          </div>
          <div className="bridge-panel" aria-label="AI Bridge flow">
            <div className="flow-step">
              <span>01</span>
              <strong>Terminal output</strong>
              <p>Build, test, git, and runtime logs stream through the PTY reader.</p>
            </div>
            <div className="flow-connector" />
            <div className="flow-step">
              <span>02</span>
              <strong>Pattern detection</strong>
              <p>Errors and failure text are throttled into concise suggestions.</p>
            </div>
            <div className="flow-connector" />
            <div className="flow-step">
              <span>03</span>
              <strong>AI context</strong>
              <p>Claude Code opens with the captured terminal context attached.</p>
            </div>
          </div>
        </section>

        <section id="architecture" className="architecture section-pad">
          <div className="section-heading">
            <p className="eyebrow">$ cat stack.json</p>
            <h2>Small pieces, clear boundaries.</h2>
          </div>
          <div className="architecture-grid">
            {architecture.map(([title, body]) => (
              <div className="architecture-node" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="download" className="download section-pad">
          <div className="download-copy">
            <p className="eyebrow">$ ./download</p>
            <h2>Download NeuralTerm v0.1.0.</h2>
            <p>
              The first release is published with macOS, Windows, and Linux assets. Signing and
              notarization are still pending, so operating systems may show trust warnings.
            </p>
            <a className="button primary" href={releaseUrl}>
              open github release
            </a>
          </div>
          <div className="download-table" role="table" aria-label="Release assets">
            <div role="row">
              <span role="cell">macOS</span>
              <strong role="cell">Apple Silicon and Intel DMG</strong>
            </div>
            <div role="row">
              <span role="cell">Windows</span>
              <strong role="cell">Setup EXE and MSI</strong>
            </div>
            <div role="row">
              <span role="cell">Linux</span>
              <strong role="cell">AppImage, DEB, and RPM</strong>
            </div>
            <div role="row">
              <span role="cell">Source</span>
              <strong role="cell">GitHub repository</strong>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <strong>NeuralTerm</strong>
          <span>AI-native terminal multiplexer</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="https://github.com/Anuragh33/neuralterm">GitHub</a>
          <a href={releaseUrl}>Release</a>
          <a href="https://github.com/Anuragh33/neuralterm#readme">README</a>
        </nav>
      </footer>
    </>
  );
}
