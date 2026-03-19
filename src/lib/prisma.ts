import { PrismaClient } from '@prisma/client';
import { getRank } from '../utils/ranks';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClient = new PrismaClient();

export const prisma = prismaClient.$extends({
    query: {
        user: {

            // Fires on every: prisma.user.update(...)
            async update({ args, query }) {
                const points = args.data.laamPoints;

                if (points !== undefined) {

                    if (typeof points === 'number') {
                        // API did: data: { laamPoints: 5000 }
                        // We inject rank into the SAME update — still 1 DB call
                        args.data.rank = getRank(points).name;
                        return query(args);
                    }

                    if (typeof points === 'object' && ('increment' in points || 'decrement' in points)) {
                        // API did: data: { laamPoints: { increment: 100 } }
                        // Run the points update first, then sync rank after
                        const result = await query(args);

                        const where = args.where as { walletAddress?: string };
                        if (where?.walletAddress) {
                            const fresh = await prismaClient.user.findUnique({
                                where: { walletAddress: where.walletAddress },
                                select: { laamPoints: true },
                            });
                            if (fresh) {
                                await prismaClient.user.update({
                                    where: { walletAddress: where.walletAddress },
                                    data: { rank: getRank(fresh.laamPoints).name },
                                });
                            }
                        }

                        return result;
                    }
                }

                return query(args);
            },

            // Fires on every: prisma.user.upsert(...)
            async upsert({ args, query }) {

                // Handle the CREATE side of upsert
                if (typeof args.create.laamPoints === 'number') {
                    args.create.rank = getRank(args.create.laamPoints).name;
                }

                // Handle the UPDATE side of upsert
                const points = args.update.laamPoints;
                if (points !== undefined) {

                    if (typeof points === 'number') {
                        args.update.rank = getRank(points).name;
                        return query(args);
                    }

                    if (typeof points === 'object' && ('increment' in points || 'decrement' in points)) {
                        const result = await query(args);

                        const where = args.where as { walletAddress?: string };
                        if (where?.walletAddress) {
                            const fresh = await prismaClient.user.findUnique({
                                where: { walletAddress: where.walletAddress },
                                select: { laamPoints: true },
                            });
                            if (fresh) {
                                await prismaClient.user.update({
                                    where: { walletAddress: where.walletAddress },
                                    data: { rank: getRank(fresh.laamPoints).name },
                                });
                            }
                        }

                        return result;
                    }
                }

                return query(args);
            },
        },
    },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as any;
export default prisma as typeof prismaClient;