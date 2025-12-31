import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Checking database connection...")
    await prisma.$connect()
    console.log("✅ Connection Successful!")
    
    // Check if the User table exists
    const userCount = await prisma.user.count()
    console.log(`📊 Current Users in DB: ${userCount}`)
  } catch (e) {
    console.error("❌ Connection Failed!")
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
