const router = require('express').Router();
const db = require('../db');
const { wrap } = require('../util');

// GET /api/generos -> gêneros distintos (na tabela "genero" cada linha liga um gênero a um título)
router.get('/', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT DISTINCT genero AS nome FROM genero ORDER BY genero');
  res.json(rows);
}));

module.exports = router;
