import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export async function getDb() {
  if (db) {
    return db;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  // Create pool with better error handling
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Add error handling for pool
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  db = drizzle({ client: pool, schema });
  return db;
}
