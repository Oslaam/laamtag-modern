'use client';

import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    SolanaMobileWalletAdapter,
    createDefaultAddressSelector,
    createDefaultAuthorizationResultCache
} from '@solana-mobile/wallet-adapter-mobile';
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

// ✅ Detect actual mobile device
const isMobileDevice = () =>
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const network = WalletAdapterNetwork.Mainnet;

    const endpoint = useMemo(() =>
        "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3"
        , []);

    const wallets = useMemo(() => {
        if (!mounted) return [];

        return [
            // ✅ Only add MWA on real mobile devices — prevents localhost WebSocket spam on desktop
            ...(isMobileDevice() ? [
                new SolanaMobileWalletAdapter({
                    addressSelector: createDefaultAddressSelector(),
                    appIdentity: {
                        name: 'LaamTag',
                        uri: 'https://app.uselaamtag.xyz',
                        icon: '/laaamtag512-icon.png',
                    },
                    authorizationResultCache: createDefaultAuthorizationResultCache(),
                    cluster: network,
                    onWalletNotFound: async () => {
                        console.warn('Mobile wallet not found');
                    },
                })
            ] : []),
            new SolflareWalletAdapter(),
        ];
    }, [mounted, network]);

    const onError = useCallback((error: WalletError) => {
        console.error("Wallet Error:", error.message);
    }, []);

    if (!mounted) return null;

    return (
        <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};