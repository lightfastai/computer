/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@lightfast/computer'],
  },
  // Allow the Next.js app to use the SDK on the server side
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow node: imports on server side
      config.externals = config.externals || [];
      config.externals.push({
        '@lightfast/computer': '@lightfast/computer'
      });
    }
    return config;
  },
};

module.exports = nextConfig;
