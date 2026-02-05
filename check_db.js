
const { Client } = require('pg');

async function checkDatabase() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'friendsai_v2', // Expected database name
        password: 'friendsai', // Assuming no password for local testing, or get from env
        port: 5434,
    });

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
