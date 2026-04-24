import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const migrationsDir = new URL('../db/migrations/', import.meta.url);

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Connected to database');

  try {
    // Get already executed migrations
    const { rows: executed } = await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const executedNames = new Set(executed.map((m: any) => m.name));

    // Read migration files
    const files = [
      '001_create_users.sql',
      '002_create_plans.sql',
    ];

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`Skipping ${file} - already executed`);
        continue;
      }

      const content = await fetch(new URL(`${file}`, migrationsDir)).then((r) => r.text());
      console.log(`Running migration: ${file}`);

      await client.query(content);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      console.log(`✓ Migration ${file} completed`);
    }

    console.log('\nAll migrations completed successfully!');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
