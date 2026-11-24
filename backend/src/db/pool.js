import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('📡 Connecting to Supabase PostgreSQL...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        description TEXT DEFAULT '',
        is_sample BOOLEAN DEFAULT FALSE,
        row_count INTEGER DEFAULT 0,
        columns JSONB DEFAULT '[]',
        column_types JSONB DEFAULT '{}',
        table_name VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Safe forward-compatible migrations if datasets table already existed
    await client.query(`ALTER TABLE datasets ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`);
    await client.query(`ALTER TABLE datasets ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS query_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
        dataset_name VARCHAR(255),
        question TEXT NOT NULL,
        sql_query TEXT,
        chart_type VARCHAR(50),
        chart_config JSONB,
        result_data JSONB,
        insight TEXT,
        agent_steps JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
        dataset_name VARCHAR(255),
        goal TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'planned',
        model VARCHAR(80) DEFAULT 'gemini-3.8-flash',
        require_sql_approval BOOLEAN DEFAULT FALSE,
        plan JSONB DEFAULT '[]',
        trace JSONB DEFAULT '[]',
        pending_action JSONB,
        conversation_history JSONB DEFAULT '[]',
        last_interaction_id TEXT,
        result JSONB,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
        action VARCHAR(80) NOT NULL,
        risk_level VARCHAR(20) DEFAULT 'low',
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
}

export default pool;
