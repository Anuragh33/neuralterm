import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeuralTerm | AI-Native Terminal Multiplexer',
  description:
    'NeuralTerm is an AI-native desktop terminal multiplexer with real PTYs, split panes, Claude sessions, AI Bridge context capture, and cross-platform releases.',
  icons: {
    icon: '/images/32x32.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0c10',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
