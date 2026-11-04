// Conexão com o PostgreSQL (Neon). O Pool reaproveita conexões entre as requisições.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // O Neon exige SSL. Para um Postgres local sem SSL, use DB_SSL=false no .env.
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

module.exports = {
  // Atalho: db.query(sql, [parametros]). Sempre use $1, $2... (nunca concatene valores no SQL!)
  query: (text, params) => pool.query(text, params),
  pool, // exposto para quem precisar de transação (ver POST /api/filmes)
};
