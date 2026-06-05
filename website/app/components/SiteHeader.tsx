'use client';

import { useEffect, useState } from 'react';

const navItems = [
  { href: '#features', label: 'Features' },
  { href: '#bridge', label: 'AI Bridge' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#download', label: 'Download' },
];

export function SiteHeader() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('nav-open', navOpen);
    return () => document.body.classList.remove('nav-open');
  }, [navOpen]);

  useEffect(() => {
    const setHeaderState = () => setScrolled(window.scrollY > 8);
    setHeaderState();
    window.addEventListener('scroll', setHeaderState, { passive: true });
    return () => window.removeEventListener('scroll', setHeaderState);
  }, []);

  return (
    <header className="site-header" data-scrolled={scrolled || undefined}>
      <a className="brand" href="#top" aria-label="NeuralTerm home" onClick={() => setNavOpen(false)}>
        <img src="/images/icon.png" alt="" />
        <span>NeuralTerm</span>
      </a>
      <button
        className="nav-toggle"
        type="button"
        aria-expanded={navOpen}
        aria-controls="site-nav"
        onClick={() => setNavOpen((open) => !open)}
      >
        <span />
        <span />
      </button>
      <nav id="site-nav" className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setNavOpen(false)}>
            {item.label}
          </a>
        ))}
        <a
          className="nav-cta"
          href="https://github.com/Anuragh33/neuralterm/releases/tag/v0.1.0"
          onClick={() => setNavOpen(false)}
        >
          Get v0.1.0
        </a>
      </nav>
    </header>
  );
}
