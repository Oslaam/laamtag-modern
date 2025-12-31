import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { ContextProvider } from '../contexts/ContextProvider';
import RankUpModal from '../components/RankUpModal'; // Ensure you created this component
import { useRankWatcher } from '../hooks/useRankWatcher';

import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css'; 

// This inner component allows us to use the Wallet Context
const GlobalRankWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showRankModal, setShowRankModal, newRank } = useRankWatcher();

    return (
        <>
            {/* The Global Pop-up */}
            <RankUpModal 
                isOpen={showRankModal} 
                newRank={newRank} 
                onClose={() => setShowRankModal(false)} 
            />
            {children}
        </>
    );
};

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <ContextProvider>
            <Head>
                <title>LaamTag - Mint Your Tag</title>
                <link rel="icon" href="/assets/images/favicon.png" />
            </Head>
            
            {/* We wrap the page component with our Rank Watcher */}
            <GlobalRankWrapper>
                <Component {...pageProps} />
            </GlobalRankWrapper>
        </ContextProvider>
    );
};

export default App;