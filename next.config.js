export default {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/manifest.json',
                destination: '/api/manifest',
            },
            {
                source: '/api/rpc-proxy',
                destination: 'https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3',
            },
        ];
    },
};