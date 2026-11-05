// Ponto de entrada: monta o Express, a sessão por cookie, as rotas da API e o front-end.
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { lerSessao, exigirLogin } = require('./src/auth');   // (encerra com aviso se faltar JWT_SECRET)

const app = express();
app.set('trust proxy', 1);      // atrás do proxy do Render: req.secure e req.ip passam a funcionar
app.use(express.json());
app.use(cookieParser());

// Páginas que exigem login: sem sessão, redireciona para a tela de login.
const PAGINAS_PROTEGIDAS = new Set(['/', '/index.html', '/filme.html', '/perfil.html', '/escolher-perfil.html',
  '/series.html', '/serie.html', '/episodio.html']);
app.use((req, res, next) => {
  if (PAGINAS_PROTEGIDAS.has(req.path) && !lerSessao(req)) return res.redirect('/login.html');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// --- API ---
app.use('/api/auth', require('./src/routes/auth'));                         // login, cadastro, perfis da conta
app.use('/api/filmes', exigirLogin, require('./src/routes/filmes'));        // tudo abaixo exige login
app.use('/api/series', exigirLogin, require('./src/routes/series'));
app.use('/api/generos', exigirLogin, require('./src/routes/generos'));
app.use('/api/perfis', exigirLogin, require('./src/routes/perfis'));

// --- Tratamento central de erros ---
const ERROS_PG = {
  '23503': [400, 'Referência inválida: o filme ou o perfil não existe (ou não é um filme).'],
  '23505': [409, 'Esse registro já existe.'],
  '23514': [400, 'Algum valor não é permitido (ex.: classificação indicativa).'],
  '22001': [400, 'Algum texto é longo demais para o campo.'],
};
app.use((err, req, res, next) => {
  console.error(err);
  if (ERROS_PG[err.code]) return res.status(ERROS_PG[err.code][0]).json({ erro: ERROS_PG[err.code][1] });
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CineLog rodando em http://localhost:${PORT}`));
