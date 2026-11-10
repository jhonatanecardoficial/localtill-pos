import pool from '../config/database';

async function run() {
    try {
        console.log('Applying UNIQUE constraint to sales.client_id...');
        await pool.query('ALTER TABLE sales ADD CONSTRAINT sales_client_id_unique UNIQUE (client_id);');
        console.log('Constraint added successfully.');
    } catch (err: any) {
        if (err.code === '42710') { // Constraint already exists
            console.log('Constraint already exists, skipping.');
        } else {
            console.error('Error adding constraint:', err);
        }
    } finally {
        await pool.end();
    }
}

run();
