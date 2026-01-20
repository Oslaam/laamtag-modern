import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const manifest = {
        "short_name": "LAAMTAG",
        "name": "LAAMTAG Hub - Seeker Exclusive",
        "icons": [
            { "src": "/assets/images/laaamtag-icon.png", "type": "image/png", "sizes": "512x512", "purpose": "any maskable" },
            { "src": "/assets/images/laamtag-logo-NObg.png", "type": "image/png", "sizes": "192x192" }
        ],
        "start_url": "/",
        "background_color": "#000000",
        "display": "standalone",
        "scope": "/",
        "theme_color": "#582c9b"
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    res.status(200).json(manifest);
}