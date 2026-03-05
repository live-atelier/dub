import { neon } from "@neondatabase/serverless";

export const conn = neon(process.env.DATABASE_URL!);
