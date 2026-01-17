import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const manifest = {
        "short_name": "LAAMTAG",
        "name": "LAAMTAG Hub - Seeker Exclusive",
        "icons": [
            { "src": "/assets/images/laamtag-logo-NObg.png", "type": "image/png", "sizes": "192x192" },
            { "src": "/assets/images/laaamtag-icon.png", "type": "image/png", "sizes": "512x512", "purpose": "any maskable" }
        ],
        "start_url": "/",
        "background_color": "#000000",
        "display": "standalone",
        "scope": "/",
        "theme_color": "#eab308"
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(manifest);
}