import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@vercel/sandbox', '@lightfastai/computer'],
  webpack: (config, { isServer }) => {
    // Handle ESM modules
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts"],
      ".jsx": [".jsx", ".tsx"]
    };
    
    // Externalize Node.js built-ins for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
        buffer: false,
        events: false,
        util: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;