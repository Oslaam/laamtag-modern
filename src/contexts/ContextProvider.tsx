'use client';

import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    SolanaMobileWalletAdapter,
    createDefaultAddressSelector,
    createDefaultAuthorizationResultCache
} from '@solana-mobile/wallet-adapter-mobile';
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const endpoint = useMemo(() => {
        const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

        if (!url) {
            console.error("❌ RPC URL IS MISSING! Check your .env file and restart npm run dev.");
        }

        return url || "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
    }, []);

    const wallets = useMemo(() => {
        if (!mounted) return [];

        return [
            new SolanaMobileWalletAdapter({
                addressSelector: createDefaultAddressSelector(),
                appIdentity: {
                    name: 'LaamTag',
                    uri: 'https://app.uselaamtag.xyz/',
                    icon: 'https://app.uselaamtag.xyz/assets/images/laaamtag-icon.png',
                },
                authorizationResultCache: createDefaultAuthorizationResultCache(),
                // FIX 1: Must use the WalletAdapterNetwork enum, not a string
                cluster: WalletAdapterNetwork.Mainnet,
                // FIX 2: This property is REQUIRED in the TS SDK 
                onWalletNotFound: async () => {
                    console.warn('Mobile wallet not found');
                },
            }),
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ];
    }, [mounted]);

    const onError = useCallback((error: WalletError) => {
        console.error("Wallet Error:", error.message);
    }, []);

    if (!mounted) return null;

    return (
        <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={false}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};