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
    const endpoint = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const wallets = useMemo(() => {
        if (!mounted) return [];

        return [
            new SolanaMobileWalletAdapter({
                cluster: WalletAdapterNetwork.Mainnet,
                addressSelector: createDefaultAddressSelector(),
                appIdentity: {
                    name: 'LaamTag',
                    uri: 'https://mint.uselaamtag.xyz',
                    icon: '/assets/images/favicon.png', // ✅ FIXED
                },
                authorizationResultCache: createDefaultAuthorizationResultCache(),
                onWalletNotFound: async () => {
                    console.warn('Mobile wallet not found');
                },
            }),
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ];
    }, [mounted]);

    const onError = useCallback((error: WalletError) => {
        console.error(error);
    }, []);

    if (!mounted) return null;

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={false}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
