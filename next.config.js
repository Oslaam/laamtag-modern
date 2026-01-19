/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Allow the mobile wallet to see the assetlinks and manifest without interference
    async headers() {
        return [
            {
                source: '/.well-known/assetlinks.json',
                headers: [
                    { key: 'Content-Type', value: 'application/json' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/manifest.json',
                destination: '/api/manifest',
            },
            // This proxy helps avoid CORS errors on mobile
            {
                source: '/api/rpc-proxy',
                destination: 'https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3',
            },
        ];
    },
};

export default nextConfig;