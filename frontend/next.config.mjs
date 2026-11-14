/** @type {import('next').NextConfig} */
const rawApiProxyTarget = process.env.API_PROXY_TARGET?.trim();
const apiProxyTarget = rawApiProxyTarget ? new URL(rawApiProxyTarget) : null;

if (apiProxyTarget && (!['http:', 'https:'].includes(apiProxyTarget.protocol)
  || apiProxyTarget.pathname !== '/' || apiProxyTarget.search || apiProxyTarget.hash)) {
  throw new Error('API_PROXY_TARGET must be an HTTP(S) origin without a path, query, or fragment.');
}

if (process.env.VERCEL && !apiProxyTarget) {
  throw new Error('Set API_PROXY_TARGET to the Render API origin in Vercel project settings.');
}

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    if (apiProxyTarget) {
      return [
        {
          source: '/api/:path*',
          destination: `${apiProxyTarget.origin}/api/:path*`,
        },
      ];
    }

    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
