import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  turbopack: {
    root: '/home/jwest/projects/pasadena/03-repos/pasadena-next',
  },
};

export default nextConfig;