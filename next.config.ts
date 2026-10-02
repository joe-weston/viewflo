import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
