/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async headers() {
        return [
            {
                source: '/manifest.json',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/manifest+json',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/rpc-proxy',
                destination: 'https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3',
            },
        ];
    },
};

export default nextConfig;