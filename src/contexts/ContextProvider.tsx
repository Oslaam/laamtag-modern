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

    // 1. Set the network variable explicitly
    const network = WalletAdapterNetwork.Mainnet;

    const endpoint = useMemo(() => {
        // Updated to the correct Helius Mainnet URL format
        return "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
    }, []);

    const wallets = useMemo(() => {
        if (!mounted) return [];

        return [
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
            }), // Added comma here
            new PhantomWalletAdapter(),
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