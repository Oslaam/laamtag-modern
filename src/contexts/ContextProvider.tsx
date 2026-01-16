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

        if (!url || !url.startsWith("http")) {
            console.error("Invalid Solana RPC URL:", url);
            return "https://api.mainnet-beta.solana.com";
        }

        return url;
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
                    icon: '/assets/images/favicon.png',
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