import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: resolve(websiteDir, '..'),
  },
};

export default nextConfig;
