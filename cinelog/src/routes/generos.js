const router = require('express').Router();
const db = require('../db');
const { wrap } = require('../util');

// GET /api/generos -> gêneros distintos (na tabela "genero" cada linha liga um gênero a um título)
router.get('/', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT DISTINCT g.genero AS nome
    FROM genero g
    JOIN titulo t ON t.estudio = g.estudio_titulo AND t.nome = g.nome_titulo
    WHERE (NOT $1::boolean OR t.classificacao_indicativa = 'LIVRE')
    ORDER BY g.genero
  `, [req.infantil]);
  res.json(rows);
}));

module.exports = router;
