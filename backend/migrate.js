/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Migration query that handles creating the table and adding new columns if needed
const migrationQuery = `
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'games') THEN
    CREATE TABLE games (
      id SERIAL PRIMARY KEY,
      board TEXT[] NOT NULL,
      winner TEXT,
      mode TEXT NOT NULL DEFAULT 'pvp',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ELSE
    -- Add 'mode' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'mode') THEN
      ALTER TABLE games ADD COLUMN mode TEXT DEFAULT 'pvp';
    END IF;

    -- Update existing rows with a default value if 'mode' is NULL
    UPDATE games SET mode = 'pvp' WHERE mode IS NULL;

    -- Ensure the 'mode' column is NOT NULL going forward
    ALTER TABLE games ALTER COLUMN mode SET NOT NULL;
  END IF;
END $$;
`;

async function migrate() {
  try {
    await pool.query(migrationQuery);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
