import { neon } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const sql = neon(process.env.DATABASE_URL!);
const adapter = new PrismaNeon(sql);

export const prismaEdge = new PrismaClient({
  adapter,
});
