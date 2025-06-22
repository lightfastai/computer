/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@lightfast/computer'],
  },
};

module.exports = nextConfig;
