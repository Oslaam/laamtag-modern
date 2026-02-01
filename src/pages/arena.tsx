import ArenaComingSoon from '../components/Arena';
import Head from 'next/head';

export default function ArenaPage() {
    return (
        <>
            <Head>
                <title>ARENA | BATTLE TERMINAL</title>
                <meta name="description" content="Enter the Arena - High stakes PvP combat coming soon." />
            </Head>

            <main className="min-h-screen bg-black">
                <ArenaComingSoon />
            </main>
        </>
    );
}