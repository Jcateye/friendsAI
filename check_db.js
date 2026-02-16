
const { Client } = require('pg');

async function checkDatabase() {
    const connectionString =
        process.env.DATABASE_URL ??
        'postgres://friendsai:friendsai@localhost:5434/friendsai_v2';
    const client = new Client({ connectionString });


    try {
        await client.connect();
        const res = await client.query('SELECT current_database();');
        const dbName = res.rows[0].current_database;
        console.log(`Current database: ${dbName}`);
        if (dbName === 'friendsai_v2') {
            console.log('Database name verification successful: current_database() is friendsai_v2.');
        } else {
            console.log(`Database name verification failed: Expected 'friendsai_v2', but got '${dbName}'.`);
        }
    } catch (err) {
        console.error('Error connecting to or querying database:', err);
    } finally {
        await client.end();
    }
}

checkDatabase();
