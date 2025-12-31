export const getRank = (points: number) => {
  if (points >= 5000) return { name: "Diamond", color: "text-cyan-400", bg: "bg-cyan-400/10" };
  if (points >= 1500) return { name: "Gold", color: "text-yellow-400", bg: "bg-yellow-400/10" };
  if (points >= 500) return { name: "Silver", color: "text-gray-300", bg: "bg-gray-300/10" };
  return { name: "Bronze", color: "text-orange-400", bg: "bg-orange-400/10" };
};