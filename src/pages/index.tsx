import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';
import styles from '../styles/Home.module.css';

const HOME_CARDS = [
  {
    num: '01',
    href: '/mint',
    title: 'Mint Genesis',
    desc: 'Claim Tag & Unlock Multipliers',
    accent: '#eab308',
  },
  {
    num: '02',
    href: '/quests',
    title: 'Quest Hub',
    desc: 'Complete Missions to earn LAAM',
    accent: '#60a5fa',
  },
  {
    num: '03',
    href: '/games',
    title: 'Games Center',
    desc: 'Play Games to Earn Multiple Rewards',
    accent: '#f43f5e',
  },
  {
    num: '04',
    href: '/staking',
    title: 'The Vault',
    desc: 'Lock Assets & Earn Passive Yield',
    accent: '#a855f7',
  },
  {
    num: '05',
    href: '/leaderboard',
    title: 'Leaderboard',
    desc: 'Compete & Climb the Ranks',
    accent: '#22d3ee',
  },
  {
    num: '06',
    href: '/shop',
    title: 'Armory',
    desc: 'Exchange SOL for TAG Tickets',
    accent: '#fb923c',
  },
];

export default function AppHome() {
  const { publicKey } = useWallet();

  return (
    <SeekerGuard>
      <div className="main-content">
        <Head><title>LaamTag App | Hub</title></Head>

        <div className="content-wrapper">

          {/* ── HERO ── */}
          <div className={styles.hero}>
            <h2 className={styles.heroTitle}>
              Welcome<br />
              <span className={styles.heroAccent}>Seeker Universe</span>
            </h2>
            {publicKey && (
              <p className={styles.heroId}>
                MODULE ID: {publicKey.toBase58().slice(0, 8)}...
              </p>
            )}
          </div>

          {/* ── CARDS ── */}
          <div className={styles.cardGrid}>
            {HOME_CARDS.map(card => (
              <Link key={card.href} href={card.href} className={styles.card}>
                <div className={styles.cardBody}>
                  <div>
                    <h3 className={styles.cardTitle} style={{ color: card.accent }}>
                      {card.title}
                    </h3>
                    <p className={styles.cardDesc}>{card.desc}</p>
                  </div>
                  <span className={styles.cardNum} style={{ color: card.accent, borderColor: `${card.accent}30`, background: `${card.accent}12` }}>
                    {card.num}
                  </span>
                </div>
                <div className={styles.cardAccentLine} style={{ background: card.accent }} />
              </Link>
            ))}
          </div>

        </div>
      </div>
    </SeekerGuard>
  );
}