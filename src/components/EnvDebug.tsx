'use client';

export default function EnvDebug() {
    return (
        <div style={{ padding: '20px', background: '#000', color: '#0f0', border: '2px solid red', zIndex: 9999, position: 'relative' }}>
            <h3>🔧 Production Debugger</h3>
            <ul>
                <li><strong>Build Time:</strong> {new Date().toLocaleTimeString()}</li>
                <li><strong>SKR Mint:</strong> {process.env.NEXT_PUBLIC_SKR_TOKEN_MINT || "❌ UNDEFINED"}</li>
                <li><strong>RPC URL:</strong> {process.env.NEXT_PUBLIC_SOLANA_RPC_URL ? "✅ LOADED" : "❌ MISSING"}</li>
                <li><strong>Treasury:</strong> {process.env.NEXT_PUBLIC_TREASURY_WALLET || "❌ MISSING"}</li>
            </ul>
            <p><i>If you see ❌ after redeploying, Railway is using a cached build.</i></p>
        </div>
    );
}