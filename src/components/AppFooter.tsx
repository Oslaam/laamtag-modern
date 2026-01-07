import { useRouter } from 'next/router';
import Link from 'next/link';
import { Gamepad2, ScrollText, Coins } from 'lucide-react'; // Added icons

export default function AppFooter() {
  const router = useRouter();

  return (
    <footer className="fixed bottom-0 left-0 w-full p-4 bg-black/90 backdrop-blur-md border-t border-yellow-500/20 flex justify-around items-center z-50">

      {/* Button 1: MINT */}
      <Link href="/mint">
        <button className={`flex flex-col items-center gap-1 ${router.pathname === '/mint' ? 'text-yellow-500' : 'text-gray-500'}`}>
          <Coins size={20} />
          <span className="text-[9px] font-black uppercase">Mint</span>
        </button>
      </Link>

      {/* Button 2: QUESTS */}
      <Link href="/quests">
        <button className={`flex flex-col items-center gap-1 ${router.pathname === '/quests' ? 'text-yellow-500' : 'text-gray-500'}`}>
          <ScrollText size={20} />
          <span className="text-[9px] font-black uppercase">Quests</span>
        </button>
      </Link>

      {/* Button 3: GAMES (The one we are adding) */}
      <Link href="/games">
        <button className={`flex flex-col items-center gap-1 ${router.pathname === '/games' ? 'text-yellow-500' : 'text-gray-500'}`}>
          <Gamepad2 size={20} />
          <span className="text-[9px] font-black uppercase">Games</span>
        </button>
      </Link>

    </footer>
  );
}