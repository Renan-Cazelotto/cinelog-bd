const router = require('express').Router();
const db = require('../db');
const { wrap, inteiro } = require('../util');

// IMPORTANTE: a PK de perfil é (email, nome). O email NUNCA sai na API; o site usa perfil.id.
// Os JOINs abaixo "traduzem" id -> (email, nome) para chegar nas tabelas de avaliação etc.

// GET /api/perfis -> lista de perfis (fase simples: o usuário escolhe um perfil no lugar de logar)
router.get('/', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.id, p.nome, p.tipo, p.imagem_de_perfil, COUNT(a.nota)::int AS total_avaliacoes
    FROM perfil p
    LEFT JOIN avalia_filme a ON a.email = p.email AND a.perfil = p.nome
    GROUP BY p.id, p.email, p.nome, p.tipo, p.imagem_de_perfil
    ORDER BY p.nome
  `);
  res.json(rows);
}));

// GET /api/perfis/:id -> cabeçalho do perfil + estatísticas + gêneros mais avaliados
router.get('/:id', wrap(async (req, res) => {
  const id = inteiro(req.params.id);
  const perfil = await db.query(`
    SELECT p.id, p.nome, p.tipo, p.imagem_de_perfil,
           COUNT(a.nota)::int                  AS filmes_avaliados,
           ROUND(AVG(a.nota), 2)               AS media_das_notas,
           COALESCE(SUM(t.duracao), 0)::int    AS minutos_assistidos,
           (SELECT COUNT(*) FROM lista_de_desejo_filme l
             WHERE l.email = p.email AND l.perfil = p.nome)::int AS na_watchlist,
           (SELECT COUNT(*) FROM curte_filme c
             WHERE c.email = p.email AND c.perfil = p.nome)::int AS curtidos
    FROM perfil p
    LEFT JOIN avalia_filme a ON a.email = p.email AND a.perfil = p.nome
    LEFT JOIN titulo t       ON t.estudio = a.estudio AND t.nome = a.nome_do_filme
    WHERE p.id = $1
    GROUP BY p.id, p.email, p.nome, p.tipo, p.imagem_de_perfil
  `, [id]);
  if (perfil.rowCount === 0) return res.status(404).json({ erro: 'Perfil não encontrado.' });

  const generos = await db.query(`
    SELECT g.genero, COUNT(*)::int AS total
    FROM avalia_filme a
    JOIN perfil p ON p.email = a.email AND p.nome = a.perfil
    JOIN genero g ON g.estudio_titulo = a.estudio AND g.nome_titulo = a.nome_do_filme
    WHERE p.id = $1
    GROUP BY g.genero
    ORDER BY total DESC, g.genero
    LIMIT 5
  `, [id]);

  res.json({ ...perfil.rows[0], generos_favoritos: generos.rows });
}));

// GET /api/perfis/:id/avaliacoes -> filmes que o perfil avaliou (mais recentes primeiro)
router.get('/:id/avaliacoes', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.id, t.nome, t.ano_de_lancamento, t.poster_url, a.nota, a.comentario, a.criado_em
    FROM avalia_filme a
    JOIN perfil p ON p.email = a.email AND p.nome = a.perfil
    JOIN titulo t ON t.estudio = a.estudio AND t.nome = a.nome_do_filme
    WHERE p.id = $1
    ORDER BY a.criado_em DESC
    LIMIT 60
  `, [inteiro(req.params.id)]);
  res.json(rows);
}));

// GET /api/perfis/:id/watchlist -> lista de desejos do perfil
router.get('/:id/watchlist', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.id, t.nome, t.ano_de_lancamento, t.poster_url
    FROM lista_de_desejo_filme l
    JOIN perfil p ON p.email = l.email AND p.nome = l.perfil
    JOIN titulo t ON t.estudio = l.estudio AND t.nome = l.nome_do_filme
    WHERE p.id = $1
    ORDER BY t.nome
  `, [inteiro(req.params.id)]);
  res.json(rows);
}));

module.exports = router;
