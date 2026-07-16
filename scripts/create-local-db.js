/**
 * Creates the local `uhg` database using Windows Authentication (no SQL password).
 * Requires ODBC Driver 17 for SQL Server + msnodesqlv8.
 *
 * Usage: node scripts/create-local-db.js
 */
const sql = require('msnodesqlv8');

const server = process.env.AZURE_SQL_HOST || 'localhost';
const database = process.env.AZURE_SQL_DATABASE || 'uhg';

const masterCs = [
  'Driver={ODBC Driver 17 for SQL Server}',
  `Server=${server}`,
  'Database=master',
  'Trusted_Connection=yes',
  'TrustServerCertificate=yes',
].join(';');

sql.open(masterCs, (err, conn) => {
  if (err) {
    console.error('Cannot connect to SQL Server with Windows auth:', err.message || err);
    console.error('Install ODBC Driver 17 and ensure SQL Server is running.');
    process.exit(1);
  }

  const check = `SELECT name FROM sys.databases WHERE name = N'${database.replace(/'/g, "''")}'`;
  conn.query(check, (checkErr, rows) => {
    if (checkErr) {
      console.error(checkErr.message || checkErr);
      conn.close(() => process.exit(1));
      return;
    }

    if (rows && rows.length > 0) {
      console.log(`Database "${database}" already exists.`);
      conn.close(() => process.exit(0));
      return;
    }

    conn.query(`CREATE DATABASE [${database.replace(/]/g, ']]')}]`, (createErr) => {
      if (createErr) {
        console.error('CREATE DATABASE failed:', createErr.message || createErr);
        conn.close(() => process.exit(1));
        return;
      }
      console.log(`Created database "${database}".`);
      conn.close(() => process.exit(0));
    });
  });
});
