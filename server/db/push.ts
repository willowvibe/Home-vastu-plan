import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function pushSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Connected to database');

  try {
    // Create tables directly
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        google_id TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        data_json JSONB NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
        version_num INTEGER NOT NULL,
        data_json JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(plan_id, version_num)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
        share_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        permissions VARCHAR(20) DEFAULT 'read',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
        operation VARCHAR(20) NOT NULL,
        data_json JSONB NOT NULL,
        synced BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes if not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_plan_versions_plan ON plan_versions(plan_id);
      CREATE INDEX IF NOT EXISTS idx_shares_uuid ON plan_shares(share_uuid);
    `);

    console.log('✓ All tables and indexes created successfully!');
    console.log('\nSchema pushed to database.');
  } finally {
    await client.end();
  }
}

pushSchema().catch((err) => {
  console.error('Schema push failed:', err);
  process.exit(1);
});
