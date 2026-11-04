const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { wrap, inteiro } = require('../util');
const { emitirSessao, limparSessao, exigirLogin } = require('../auth');

const MAX_PERFIS = 5;
const TIPOS = ['Infantil', 'Adulto'];
const IMAGENS = ['img1', 'img2', 'img3', 'img4'];

// ---- Proteção simples contra tentativa de adivinhar senha (por IP + e-mail, em memória) ----
const MAX_TENTATIVAS = 10;
const JANELA_MS = 15 * 60 * 1000;
const tentativas = new Map();
const HASH_FALSO = bcrypt.hashSync('hash-falso-para-igualar-o-tempo', 10);

const igual = (a, b) => {   // comparação em tempo constante (só para senhas antigas, sem hash)
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// ---------------------------------------------------------------------------
// GET /api/auth/planos (público) -> planos para a tela de cadastro
// ---------------------------------------------------------------------------
router.get('/planos', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT nome_do_plano, numero_de_telas, valor FROM plano_assinatura ORDER BY valor');
  res.json(rows);
}));

// ---------------------------------------------------------------------------
// POST /api/auth/cadastro  { nome, email, telefone, senha, plano }
// Cria a CONTA (a senha vai para o banco já com hash bcrypt) e já deixa o usuário logado.
// ---------------------------------------------------------------------------
router.post('/cadastro', wrap(async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const telefone = String(req.body.telefone || '').replace(/\D/g, '');
  const senha = String(req.body.senha || '');
  const plano = String(req.body.plano || '');

  const erro =
    nome.length < 2 || nome.length > 100 ? 'Informe seu nome (2 a 100 caracteres).' :
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'E-mail inválido.' :
    email.length > 30 ? 'O e-mail pode ter no máximo 30 caracteres.' :
    !/^\d{10,11}$/.test(telefone) ? 'Telefone inválido (DDD + número, 10 ou 11 dígitos).' :
    senha.length < 8 ? 'A senha deve ter pelo menos 8 caracteres.' :
    Buffer.byteLength(senha) > 72 ? 'A senha pode ter no máximo 72 caracteres.' :
    !plano ? 'Escolha um plano.' : null;
  if (erro) return res.status(400).json({ erro });

  const existe = await db.query('SELECT 1 FROM conta WHERE lower(email) = $1', [email]);
  if (existe.rowCount) return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });

  const hash = await bcrypt.hash(senha, 10);
  try {
    await db.query(`
      INSERT INTO conta (email, telefone, senha, nome, vencimento_assinatura, nome_do_plano)
      VALUES ($1, $2, $3, $4, CURRENT_DATE + 30, $5)
    `, [email, telefone, hash, nome, plano]);
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ erro: 'Plano inválido.' });
    if (e.code === '23505') return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });
    throw e;
  }
  emitirSessao(req, res, { email });
  res.status(201).json({ ok: true });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/login  { email, senha }
// Aceita contas antigas com senha em texto puro (de BD I) e já converte para hash no 1º login.
// ---------------------------------------------------------------------------
router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });

  const chave = req.ip + '|' + email;
  const registro = tentativas.get(chave);
  if (registro && Date.now() >= registro.ate) tentativas.delete(chave);
  else if (registro && registro.n >= MAX_TENTATIVAS)
    return res.status(429).json({ erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });

  const { rows } = await db.query('SELECT email, senha FROM conta WHERE lower(email) = $1', [email]);
  const conta = rows[0];
  let ok = false;
  if (!conta) {
    await bcrypt.compare(senha, HASH_FALSO);       // gasta o mesmo tempo, para não revelar se o e-mail existe
  } else if (conta.senha.startsWith('$2')) {
    ok = await bcrypt.compare(senha, conta.senha);
  } else if (igual(senha, conta.senha)) {          // senha antiga sem hash: confere e já converte
    ok = true;
    await db.query('UPDATE conta SET senha = $1 WHERE email = $2', [await bcrypt.hash(senha, 10), conta.email]);
  }

  if (!ok) {
    const r = tentativas.get(chave) || { n: 0 };
    r.n += 1; r.ate = Date.now() + JANELA_MS;
    tentativas.set(chave, r);
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }
  tentativas.delete(chave);
  emitirSessao(req, res, { email: conta.email });   // sem perfil ainda: o usuário escolhe em seguida
  res.json({ ok: true });
}));

router.post('/saida', (req, res) => { limparSessao(res); res.json({ ok: true }); });

// ---------------------------------------------------------------------------
// A partir daqui é preciso estar logado.
// ---------------------------------------------------------------------------

// GET /api/auth/eu -> quem está logado (conta + perfil escolhido, se houver)
router.get('/eu', exigirLogin, wrap(async (req, res) => {
  const c = await db.query('SELECT email, nome, master FROM conta WHERE email = $1', [req.sessao.email]);
  if (c.rowCount === 0) { limparSessao(res); return res.status(401).json({ erro: 'Conta não encontrada.' }); }

  let perfil = null;
  if (req.sessao.perfil) {
    const p = await db.query(
      'SELECT id, nome, tipo, imagem_de_perfil FROM perfil WHERE id = $1 AND email = $2',
      [req.sessao.perfil, req.sessao.email]);
    perfil = p.rows[0] || null;
  }
  res.json({ conta: c.rows[0], perfil });
}));

// GET /api/auth/perfis -> SOMENTE os perfis da conta logada
router.get('/perfis', exigirLogin, wrap(async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nome, tipo, imagem_de_perfil FROM perfil WHERE email = $1 ORDER BY nome', [req.sessao.email]);
  res.json(rows);
}));

// POST /api/auth/perfis { nome, tipo, imagem_de_perfil } -> cria um perfil na conta
router.post('/perfis', exigirLogin, wrap(async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const tipo = req.body.tipo;
  const imagem = req.body.imagem_de_perfil;
  if (nome.length < 1 || nome.length > 15) return res.status(400).json({ erro: 'O nome do perfil deve ter de 1 a 15 caracteres.' });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: 'Escolha o tipo do perfil.' });
  if (!IMAGENS.includes(imagem)) return res.status(400).json({ erro: 'Escolha uma imagem de perfil.' });

  const total = await db.query('SELECT COUNT(*)::int AS n FROM perfil WHERE email = $1', [req.sessao.email]);
  if (total.rows[0].n >= MAX_PERFIS) return res.status(400).json({ erro: `Cada conta pode ter no máximo ${MAX_PERFIS} perfis.` });

  try {
    const { rows } = await db.query(
      'INSERT INTO perfil (nome, tipo, imagem_de_perfil, email) VALUES ($1, $2, $3, $4) RETURNING id',
      [nome, tipo, imagem, req.sessao.email]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Já existe um perfil com esse nome nesta conta.' });
    throw e;
  }
}));

// POST /api/auth/perfil { id } -> "entra" num perfil (só aceita perfis DESTA conta)
router.post('/perfil', exigirLogin, wrap(async (req, res) => {
  const id = inteiro(req.body.id);
  const { rows } = await db.query('SELECT id FROM perfil WHERE id = $1 AND email = $2', [id, req.sessao.email]);
  if (rows.length === 0) return res.status(403).json({ erro: 'Esse perfil não pertence à sua conta.' });
  emitirSessao(req, res, { email: req.sessao.email, perfil: id });
  res.json({ ok: true });
}));

module.exports = router;
