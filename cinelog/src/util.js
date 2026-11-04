// Faz erros de funções async caírem no tratador de erros do Express (server.js).
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Converte "12" em 12; devolve null se não for um inteiro válido.
const inteiro = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) ? n : null; };

module.exports = { wrap, inteiro };
