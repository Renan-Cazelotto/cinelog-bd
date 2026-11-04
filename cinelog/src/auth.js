// Sessão por cookie assinado (JWT). O cookie é httpOnly: o JavaScript do navegador não consegue lê-lo.
// Conteúdo do token: { email (da conta), perfil (id do perfil escolhido, ou ausente) }.
require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./db');
const { wrap } = require('./util');

const SEGREDO = process.env.JWT_SECRET;
if (!SEGREDO || SEGREDO.length < 16) {
  console.error('Defina JWT_SECRET no .env (mínimo 16 caracteres). Para gerar um:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const NOME_COOKIE = 'sessao';
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;   // 7 dias

function emitirSessao(req, res, dados) {
  const token = jwt.sign(dados, SEGREDO, { expiresIn: '7d' });
  res.cookie(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',        // o navegador não envia o cookie em requisições vindas de outros sites
    secure: req.secure,     // true em HTTPS (Render); false em http://localhost
    maxAge: DURACAO_MS,
  });
}
const limparSessao = (res) => res.clearCookie(NOME_COOKIE);

// Devolve os dados do token ou null (sem cookie, token inválido ou expirado).
function lerSessao(req) {
  const token = req.cookies && req.cookies[NOME_COOKIE];
  if (!token) return null;
  try { return jwt.verify(token, SEGREDO); } catch { return null; }
}

// --- Middlewares ---
function exigirLogin(req, res, next) {
  const sessao = lerSessao(req);
  if (!sessao) return res.status(401).json({ erro: 'Faça login para continuar.' });
  req.sessao = sessao;
  next();
}

function exigirPerfil(req, res, next) {
  if (!req.sessao.perfil) return res.status(403).json({ erro: 'Escolha um perfil para continuar.' });
  next();
}

// A permissão é consultada no banco a cada uso (não fica "congelada" no token):
// se a conta deixar de ser master, o acesso some na hora.
const exigirMaster = wrap(async (req, res, next) => {
  const { rows } = await db.query('SELECT master FROM conta WHERE email = $1', [req.sessao.email]);
  if (!rows[0] || !rows[0].master) return res.status(403).json({ erro: 'Apenas contas master podem fazer isso.' });
  next();
});

// Descobre se o perfil da sessão é Infantil (consultado no banco a cada requisição)
const carregarTipoPerfil = wrap(async (req, res, next) => {
  req.infantil = false;
  if (req.sessao.perfil) {
    const { rows } = await db.query(
      'SELECT tipo FROM perfil WHERE id = $1 AND email = $2',
      [req.sessao.perfil, req.sessao.email]);
    req.infantil = rows[0]?.tipo === 'Infantil';
  }
  next();
});

module.exports = { emitirSessao, limparSessao, lerSessao, exigirLogin, exigirPerfil, exigirMaster };
