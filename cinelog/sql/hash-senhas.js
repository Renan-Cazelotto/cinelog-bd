// Converte para hash bcrypt as senhas que ainda estão em texto puro na tabela conta.
// Rode UMA vez, depois da migração:  npm run senhas:hash
// (O login também converte sozinho, conta por conta, no primeiro acesso.)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

(async () => {
  const { rows } = await db.query("SELECT email, senha FROM conta WHERE senha NOT LIKE '$2%'");
  for (const c of rows)
    await db.query('UPDATE conta SET senha = $1 WHERE email = $2', [await bcrypt.hash(c.senha, 10), c.email]);
  console.log(`${rows.length} senha(s) convertida(s) para hash.`);
  await db.pool.end();
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
