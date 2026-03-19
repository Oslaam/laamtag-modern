import { PrismaClient } from '@prisma/client';
import { getRank } from '../utils/ranks';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClient = new PrismaClient();

// THE AUTOMATIC RANK UPDATER
export const prisma = prismaClient.$extends({
    query: {
        user: {
            async update({ args, query }) {
                // If the update contains laamPoints and it's a simple number
                if (args.data.laamPoints !== undefined && typeof args.data.laamPoints === 'number') {
                    args.data.rank = getRank(args.data.laamPoints).name;
                }
                return query(args);
            },
            async upsert({ args, query }) {
                if (args.create.laamPoints !== undefined && typeof args.create.laamPoints === 'number') {
                    args.create.rank = getRank(args.create.laamPoints).name;
                }
                if (args.update.laamPoints !== undefined && typeof args.update.laamPoints === 'number') {
                    args.update.rank = getRank(args.update.laamPoints).name;
                }
                return query(args);
            },
        },
    },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as any;

export default prisma as typeof prismaClient;