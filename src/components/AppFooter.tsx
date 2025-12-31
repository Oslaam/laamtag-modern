import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AppFooter() {
  const router = useRouter();

  return (
    <footer className="fixed bottom-0 left-0 w-full p-6 bg-black/90 backdrop-blur-md border-t border-yellow-500/20 flex justify-around items-center z-50">
      {/* Button 1: Mint OR App */}
      <Link href={router.pathname === '/mint' ? '/' : '/mint'}>
        <button className={`${router.pathname === '/mint' ? 'bg-white text-black' : 'bg-yellow-500 text-black'} px-8 py-3 rounded-2xl font-black uppercase text-sm transition-all hover:scale-105 active:scale-95`}>
          {router.pathname === '/mint' ? 'APP' : 'MINT'}
        </button>
      </Link>

      {/* Button 2: Quests OR App */}
      <Link href={router.pathname === '/quests' ? '/' : '/quests'}>
        <button className={`${router.pathname === '/quests' ? 'bg-white text-black' : 'bg-yellow-500 text-black'} px-8 py-3 rounded-2xl font-black uppercase text-sm transition-all hover:scale-105 active:scale-95`}>
          {router.pathname === '/quests' ? 'APP' : 'QUESTS'}
        </button>
      </Link>
    </footer>
  );
}