import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
    SolflareWalletAdapter,
    PhantomWalletAdapter,
    BackpackWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { notify } from "../utils/notifications";

// IMPORT BOTH MOBILE PACKAGES WITH DISTINCT ALIASES
import { 
    SolanaMobileWalletAdapter, 
    createDefaultAddressSelector, 
    createDefaultAuthorizationResultCache, 
    createDefaultWalletNotFoundHandler as adapterNotFound // For the list
} from '@solana-mobile/wallet-adapter-mobile';

import {
    registerMwa,
    createDefaultAuthorizationCache,
    createDefaultChainSelector,
    createDefaultWalletNotFoundHandler as standardNotFound // For registration
} from '@solana-mobile/wallet-standard-mobile';

require('@solana/wallet-adapter-react-ui/styles.css');

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Mainnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // 1. REGISTER GLOBAL STANDARDS
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                registerMwa({
                    appIdentity: {
                        name: 'LaamTag',
                        uri: 'https://laamtag-modern.vercel.app',
                        icon: '/favicon.ico',
                    },
                    authorizationCache: createDefaultAuthorizationCache(),
                    chains: ['solana:mainnet'],
                    chainSelector: createDefaultChainSelector(),
                    // FIX: Uses the Standard-specific handler
                    onWalletNotFound: standardNotFound(), 
                    remoteHostAuthority: 'https://solana-mobile-stack.com',
                });
            } catch (err) {
                console.error("MWA Registration failed", err);
            }
        }
    }, []);

    // 2. CONFIGURE THE WALLET LIST
    const wallets = useMemo(() => [
        new SolanaMobileWalletAdapter({
            addressSelector: createDefaultAddressSelector(),
            appIdentity: {
                name: 'LaamTag',
                uri: 'https://laamtag-modern.vercel.app',
                icon: '/favicon.ico',
            },
            authorizationResultCache: createDefaultAuthorizationResultCache(),
            cluster: network,
            // FIX: Uses the Adapter-specific handler
            onWalletNotFound: adapterNotFound(),
        }),
        new SolflareWalletAdapter(),
        new PhantomWalletAdapter(),
        new BackpackWalletAdapter(),
    ], [network]);

    const onError = useCallback((error: WalletError) => {
        notify({ type: 'error', message: error.message || error.name });
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};