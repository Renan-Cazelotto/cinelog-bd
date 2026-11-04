// Executa arquivos .sql da pasta sql/ no banco apontado pelo .env
//   npm run db:init                                  -> só a migração (padrão)
//   npm run db:init -- streaming.sql migracao.sql    -> banco novo: cria tudo e migra
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) arquivos.push('migracao.sql');

(async () => {
  for (const arquivo of arquivos) {
    await db.query(fs.readFileSync(path.join(__dirname, arquivo), 'utf8'));
    console.log('Executado:', arquivo);
  }
  await db.pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
