import { AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { FC } from 'react';
import { AppBar } from '../components/AppBar';
import { ContentContainer } from '../components/ContentContainer';
import { Footer } from '../components/Footer';
import Notifications from '../components/Notification';

// THIS IS THE FIX: Load ContextProvider only on the client
const ContextProvider = dynamic(() => import('../contexts/ContextProvider').then(mod => mod.ContextProvider), {
  ssr: false,
});

require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head><title>LaamTag - Seeker Mint</title></Head>
          <ContextProvider>
            <div className="flex flex-col h-screen">
              <Notifications />
              <AppBar/>
              <ContentContainer>
                <Component {...pageProps} />
                <Footer/>
              </ContentContainer>
            </div>
          </ContextProvider>
        </>
    );
};

export default App;