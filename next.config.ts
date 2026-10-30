import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
