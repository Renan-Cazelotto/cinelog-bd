// Ponto de entrada: monta o Express, registra as rotas da API e serve o front-end.
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());                                  // lê o corpo das requisições em JSON
app.use(express.static(path.join(__dirname, 'public')));  // serve HTML/CSS/JS da pasta public

// --- API (cada arquivo em src/routes cuida de um "assunto") ---
app.use('/api/filmes', require('./src/routes/filmes'));
app.use('/api/generos', require('./src/routes/generos'));
app.use('/api/perfis', require('./src/routes/perfis'));

// --- Tratamento central de erros ---
// Erros do PostgreSQL chegam com um código (err.code); traduzimos os mais comuns.
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
