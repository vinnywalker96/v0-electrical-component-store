
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const { Client } = pg;

const runMigrations = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  });

  try {
    await client.connect();
    console.log('Connected to the database.');

    const scriptsDir = 'scripts';
    const scriptFiles = fs.readdirSync(scriptsDir).sort();

    for (const scriptFile of scriptFiles) {
      if (path.extname(scriptFile) === '.sql') {
        console.log(`Running migration: ${scriptFile}`);
        const scriptPath = path.join(scriptsDir, scriptFile);
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        await client.query(scriptContent);
        console.log(`Finished migration: ${scriptFile}`);
      }
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
};

runMigrations();
