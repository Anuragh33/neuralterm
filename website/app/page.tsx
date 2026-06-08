import { SiteHeader } from './components/SiteHeader';

const releaseUrl = 'https://github.com/Anuragh33/neuralterm/releases/latest';

const sessions = [
  ['release-shell', 'running', 'npm run tauri:build'],
  ['claude-code', 'active', 'review failing job'],
  ['her-voice', 'idle', 'ready for prompt'],
  ['verifier', 'watching', 'cargo check'],
];

const releaseTargets = [
  'macOS Apple Silicon',
  'macOS Intel',
  'Windows EXE',
  'Windows MSI',
  'Linux AppImage',
  'DEB',
  'RPM',
];

const shellLines = [
  ['$', 'git tag v0.2.2'],
  ['$', 'git push origin v0.2.2'],
  ['ok', 'release workflow started on GitHub Actions'],
  ['ok', 'macOS Apple Silicon DMG uploaded'],
  ['ok', 'Windows MSI and setup EXE uploaded'],
  ['ok', 'Linux AppImage, DEB, and RPM uploaded'],
];

const releaseProgress = [
  ['macOS', '100'],
  ['Windows', '100'],
  ['Linux', '100'],
];

const bridgeEvents = [
  ['traceback', 'Captured failing command, cwd, and stderr excerpt.'],
  ['attach', 'Sent compact terminal context into Claude Code.'],
  ['repair', 'Suggested patch can run back inside the terminal.'],
];

const commandPalette = [
  ['/new shell', 'Create a persistent PTY session'],
  ['/split vertical', 'Keep logs beside the active prompt'],
  ['/attach error', 'Send bridge context to Claude Code'],
  ['/release v0.2.2', 'Open the GitHub release assets'],
];

const features = [
  ['PTY core', 'Real shell sessions through portable-pty with resize, write, kill, and event streaming.'],
  ['Workspace memory', 'SQLite keeps workspaces, sessions, splits, collapsed state, and AI message history durable.'],
  ['AI panes', 'Claude Code and HER panes support markdown, attachments, voice input, and run-in-terminal actions.'],
  ['Bridge watcher', 'Terminal failures become compact AI suggestions instead of manually copied log chunks.'],
  ['Keychain storage', 'Anthropic credentials live in the OS keychain in the packaged desktop app.'],
  ['Release matrix', 'GitHub Actions builds macOS, Windows, and Linux artifacts for versioned releases.'],
];

const stack = [
  ['React', 'interface'],
  ['Zustand', 'state'],
  ['Tauri v2', 'desktop shell'],
  ['Rust', 'backend'],
  ['SQLite', 'storage'],
  ['GitHub', 'releases'],
];

const downloads = [
  ['macOS', 'Apple Silicon DMG, Intel DMG'],
  ['Windows', 'Setup EXE, MSI'],
  ['Linux', 'AppImage, DEB, RPM'],
  ['Source', 'GitHub repository and release tag'],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="operator-hero" aria-labelledby="hero-title">
          <div className="console-shell" aria-label="Pngun interface concept">
            <div className="console-titlebar">
              <span className="window-dot red-dot" />
              <span className="window-dot amber-dot" />
              <span className="window-dot green-dot" />
              <strong>pngun</strong>
              <span>release-lab.local</span>
            </div>

            <aside className="workspace-rail" aria-label="Workspace sessions">
              <div className="rail-block">
                <p className="rail-label">workspace</p>
                <strong>release-lab</strong>
                <span>AI terminal ops</span>
              </div>
              <div className="session-list">
                {sessions.map(([name, state, detail]) => (
                  <div className="session-row" data-state={state} key={name}>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{name}</strong>
                      <small>{detail}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rail-meter">
                <span>bridge</span>
                <strong>watching</strong>
              </div>
            </aside>

            <section className="workspace-main" aria-labelledby="hero-title">
              <div className="hero-command">
                <p className="prompt-line">
                  <span>$</span>{' '}
                  <code className="typed-command">pngun --workspace release-lab --ai-bridge</code>
                </p>
                <h1 id="hero-title">A terminal workspace built for AI-assisted shipping.</h1>
                <p>
                  Pngun combines real PTYs, split panes, persistent workspaces, Claude Code,
                  HER, and failure-aware terminal context in one desktop app.
                </p>
                <div className="hero-actions" aria-label="Primary actions">
                  <a className="button primary" href={releaseUrl}>
                    ./download-v0.2.2
                  </a>
                  <a className="button secondary" href="#workflow">
                    open workflow
                  </a>
                </div>
              </div>

              <div className="pane-grid">
                <article className="terminal-pane primary-pane">
                  <div className="pane-title">
                    <span>release-shell</span>
                    <small>zsh</small>
                  </div>
                  <div className="terminal-lines">
                    {shellLines.map(([label, line]) => (
                      <p key={`${label}-${line}`} data-label={label}>
                        <span>{label}</span>
                        <code>{line}</code>
                      </p>
                    ))}
                    <p data-label="run">
                      <span>run</span>
                      <code>npm run site:build</code>
                      <i aria-hidden="true" />
                    </p>
                  </div>
                  <div className="release-progress" aria-label="Release build progress">
                    {releaseProgress.map(([target, progress]) => (
                      <div className="progress-row" key={target}>
                        <span>{target}</span>
                        <i data-progress={progress} />
                        <strong>{progress}%</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="terminal-pane">
                  <div className="pane-title">
                    <span>quick context</span>
                    <small>ai bridge</small>
                  </div>
                  <div className="mini-log">
                    {bridgeEvents.map(([label, text]) => (
                      <div key={label}>
                        <strong>{label}</strong>
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <aside className="ai-dock" aria-label="AI session preview">
              <div className="dock-header">
                <span>Claude Code</span>
                <strong>ready</strong>
              </div>
              <div className="assistant-message">
                <span>context</span>
                <p>Captured release output, workflow logs, and local command state.</p>
              </div>
              <div className="assistant-message user-message">
                <span>next</span>
                <p>Patch the failing build, explain the diff, then run it in the terminal.</p>
              </div>
              <div className="dock-input">/attach release-shell</div>
            </aside>
          </div>
        </section>

        <section className="platform-strip" aria-label="Available release targets">
          <div className="platform-track" aria-hidden="true">
            {[...releaseTargets, ...releaseTargets].map((target, index) => (
              <span key={`${target}-${index}`}>{target}</span>
            ))}
          </div>
        </section>

        <section id="workflow" className="workflow-section section-pad">
          <div className="section-heading">
            <p className="eyebrow">$ open workflow</p>
            <h2>The interface is organized around the repair loop.</h2>
            <p>
              Keep the command, logs, assistant, and release state in one scan. The website now
              mirrors that working surface instead of presenting the product as a static brochure.
            </p>
          </div>

          <div className="workflow-grid">
            <article className="command-palette">
              <div className="palette-title">command palette</div>
              {commandPalette.map(([command, detail]) => (
                <div className="palette-row" key={command}>
                  <code>{command}</code>
                  <span>{detail}</span>
                </div>
              ))}
            </article>

            <article className="bridge-terminal">
              <div className="pane-title">
                <span>tail -f ai-bridge.log</span>
                <small>live</small>
              </div>
              <div className="bridge-stream">
                <p>
                  <span>detect</span> npm error pattern in release-shell
                </p>
                <p>
                  <span>capture</span> stderr excerpt, command, cwd, session id
                </p>
                <p>
                  <span>attach</span> create Claude Code context bundle
                </p>
                <p>
                  <span>run</span> apply suggested fix inside terminal
                </p>
              </div>
            </article>
          </div>
        </section>

        <section id="features" className="features-section section-pad">
          <div className="section-heading narrow">
            <p className="eyebrow">$ ls features</p>
            <h2>Terminal mechanics first. AI exactly where it removes friction.</h2>
          </div>
          <div className="feature-grid">
            {features.map(([title, body], index) => (
              <article className="feature-card" data-accent={index % 6} key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="preview" className="preview-section section-pad">
          <div className="section-heading">
            <p className="eyebrow">$ preview workspace.svg</p>
            <h2>The desktop app layout stays recognizable across the website.</h2>
            <p>
              Sidebar sessions, split terminal panes, AI Bridge, and assistant context are treated
              as the visual system, not as decorative screenshots.
            </p>
          </div>
          <figure className="workspace-preview">
            <figcaption>pngun workspace preview</figcaption>
            <img
              src="/images/neuralterm-workspace.svg"
              alt="Pngun workspace preview with sidebar, split terminals, and AI panel"
            />
          </figure>
        </section>

        <section id="architecture" className="stack-section section-pad">
          <div className="section-heading">
            <p className="eyebrow">$ cat stack.json</p>
            <h2>A small stack with clear runtime boundaries.</h2>
          </div>
          <div className="stack-map">
            {stack.map(([name, role]) => (
              <div key={name}>
                <strong>{name}</strong>
                <span>{role}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="download" className="download-section section-pad">
          <div className="section-heading">
            <p className="eyebrow">$ ./download</p>
            <h2>Release v0.2.2 ships for macOS, Windows, and Linux.</h2>
            <p>
              Signing and notarization are still pending, so operating systems may show trust
              warnings on first launch.
            </p>
          </div>
          <div className="download-grid">
            {downloads.map(([platform, asset]) => (
              <div className="download-row" key={platform}>
                <span>{platform}</span>
                <strong>{asset}</strong>
              </div>
            ))}
          </div>
          <a className="button primary download-button" href={releaseUrl}>
            open github release
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <strong>Pngun</strong>
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
