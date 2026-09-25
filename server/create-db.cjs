const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5432/postgres' });
  await client.connect();
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'kaushalsetu'");
  if (res.rows.length === 0) {
    await client.query('CREATE DATABASE kaushalsetu');
    console.log('Database kaushalsetu created successfully');
  } else {
    console.log('Database kaushalsetu already exists');
  }
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
