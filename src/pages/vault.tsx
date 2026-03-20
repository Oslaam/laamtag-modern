import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import Link from 'next/link';
import SeekerGuard from '../components/SeekerGuard';
import { Zap, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import styles from '../styles/Vault.module.css';

const EMISSION_ROWS = [
  {
    label: '1 NFT',
    imgs: [{ size: 30, opacity: 1 }],
    laam: '500',
    tag: '20',
    highlight: false,
  },
  {
    label: '2 NFTs',
    imgs: [{ size: 26, opacity: 1 }, { size: 26, opacity: 1 }],
    laam: '1,000',
    tag: '40',
    highlight: false,
  },
  {
    label: 'UNLIMITED',
    imgs: [{ size: 22, opacity: 1 }, { size: 22, opacity: 0.5 }],
    extra: true,
    laam: '+500 / NFT',
    tag: '+20 / NFT',
    highlight: true,
  },
];

export default function VaultPromoPage() {
  const { connected } = useWallet();

  return (
    <SeekerGuard>
      <div className="content-wrapper">
        <Head><title>LAAMTAG | The Vault Briefing</title></Head>

        {/* ── HEADER ── */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            The <span className={styles.titleAccent}>Vault</span>
          </h1>
          <p className={styles.pageSubtitle}>PROTOCOL: REWARD_STRUCTURE_v2.0</p>
        </div>

        {/* ── INFO CARDS ── */}
        <div className={styles.infoGrid}>
          <div className={`${styles.infoCard} ${styles.infoCardRed}`}>
            <Clock size={18} className={styles.infoIconRed} />
            <h3 className={styles.infoCardTitle}>48H Initial Lock</h3>
            <p className={styles.infoCardDesc}>Assets must stay locked for 48 hours before rewards begin accruing.</p>
          </div>
          <div className={`${styles.infoCard} ${styles.infoCardPurple}`}>
            <Zap size={18} className={styles.infoIconPurple} />
            <h3 className={styles.infoCardTitle}>24H Claim Cycle</h3>
            <p className={styles.infoCardDesc}>Sync your rewards to your wallet once every 24 hours.</p>
          </div>
        </div>

        {/* ── EMISSION TABLE ── */}
        <div className={styles.tableCard}>
          <h2 className={styles.tableTitle}>Emission Schedule</h2>

          <div className={styles.tableWrap}>
            <div className={styles.tableHead}>
              <span className={styles.thAssets}>Assets Locked</span>
              <span className={styles.thLaam}>Daily LAAM</span>
              <span className={styles.thTag}>Daily TAG</span>
            </div>

            {EMISSION_ROWS.map((row, i) => (
              <div key={i} className={`${styles.tableRow} ${row.highlight ? styles.tableRowHighlight : ''}`}>
                <div className={styles.tdAssets}>
                  <div className={styles.tdImgs}>
                    {row.imgs.map((img, j) => (
                      <img
                        key={j}
                        src="/assets/images/vault-box.gif"
                        alt=""
                        className={styles.vaultBoxImg}
                        style={{ width: img.size, height: img.size, opacity: img.opacity }}
                      />
                    ))}
                    {row.extra && <span className={styles.ellipsis}>···</span>}
                  </div>
                  <span className={`${styles.tdLabel} ${row.highlight ? styles.tdLabelGold : ''}`}>
                    {row.label}
                  </span>
                </div>
                <div className={styles.tdLaam}>
                  <span className={`${styles.tdVal} ${row.highlight ? styles.tdValGold : ''}`}>
                    {row.laam}
                  </span>
                </div>
                <div className={styles.tdTag}>
                  <span className={styles.tdVal}>{row.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOOST CALLOUT ── */}
        <div className={styles.boostCallout}>
          <div className={styles.boostCalloutIcon}>
            <Zap size={14} className={styles.purpleIcon} />
          </div>
          <div>
            <p className={styles.boostCalloutTitle}>Multiplier Boosts Available</p>
            <p className={styles.boostCalloutDesc}>
              Purchase SKR-powered boosts (x2 → x100) inside the Staking Arena to multiply your per-second accrual rate.
            </p>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className={styles.ctaCard}>
          <div className={styles.ctaGlow} />
          <ShieldCheck size={36} className={styles.ctaIcon} />
          <h2 className={styles.ctaTitle}>Ready to Secure Rewards?</h2>
          <p className={styles.ctaDesc}>
            Enter the Staking Arena to lock your Genesis Tags.
            Rewards are calculated per-second after your initial 48h deployment.
          </p>
          <Link href="/staking" className={styles.ctaLink}>
            <button className={styles.ctaBtn}>
              {connected ? 'ENTER STAKING ARENA' : 'CONNECT WALLET TO START'}
              <ArrowRight size={16} />
            </button>
          </Link>
        </div>

      </div>
    </SeekerGuard>
  );
}