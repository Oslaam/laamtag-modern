export const getRank = (points: number) => {
  if (points >= 500000) return { name: "Mythic", color: "text-fuchsia-400", bg: "bg-fuchsia-400/10" };
  if (points >= 400000) return { name: "Legend", color: "text-red-400", bg: "bg-red-400/10" };
  if (points >= 300000) return { name: "Diamond", color: "text-cyan-400", bg: "bg-cyan-400/10" };
  if (points >= 200000) return { name: "Platinum", color: "text-indigo-400", bg: "bg-indigo-400/10" };
  if (points >= 100000) return { name: "Gold Elite", color: "text-yellow-300", bg: "bg-yellow-300/10" };
  if (points >= 50000) return { name: "Gold", color: "text-yellow-400", bg: "bg-yellow-400/10" };
  if (points >= 20000) return { name: "Silver Elite", color: "text-gray-200", bg: "bg-gray-200/10" };
  if (points >= 10000) return { name: "Silver", color: "text-gray-300", bg: "bg-gray-300/10" };
  if (points >= 5000) return { name: "Bronze Elite", color: "text-orange-300", bg: "bg-orange-300/10" };
  return { name: "Bronze", color: "text-orange-400", bg: "bg-orange-400/10" };
};
