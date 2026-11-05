// Faz erros de funções async caírem no tratador de erros do Express (server.js).
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Converte "12" em 12; devolve null se não for um inteiro válido.
const inteiro = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) ? n : null; };

// Trecho de SQL: "a série cujo nome está em `col` é livre" (tem episódios e todos são LIVRE).
// `col` é sempre uma constante nossa (ex.: 's.nome'), nunca algo vindo do usuário.
const serieLivre = (col) => `(
  EXISTS (SELECT 1 FROM episodio ep WHERE ep.nome_da_serie = ${col})
  AND NOT EXISTS (
    SELECT 1 FROM episodio ep
    JOIN titulo tt ON tt.estudio = ep.estudio AND tt.nome = ep.nome
    WHERE ep.nome_da_serie = ${col} AND tt.classificacao_indicativa <> 'LIVRE'))`;

module.exports = { wrap, inteiro, serieLivre };
