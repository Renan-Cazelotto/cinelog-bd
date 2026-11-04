const router = require('express').Router();
const db = require('../db');
const { wrap, inteiro } = require('../util');
const { exigirPerfil, exigirMaster } = require('../auth');

// Em `titulo` a PK é (estudio, nome). Para a URL usamos titulo.id (criado na migração)
// e os JOINs "traduzem" id -> (estudio, nome) para chegar em filme, avalia_filme etc.

// Ordenações permitidas (lista branca: ORDER BY não aceita parâmetros $1).
const ORDENS = {
  nota: 'nota_media DESC NULLS LAST, total DESC, t.nome',
  populares: 'total DESC, t.nome',
  recentes: 't.ano_de_lancamento DESC, t.nome',
  titulo: 't.nome',
};

// ---------------------------------------------------------------------------
// GET /api/filmes?busca=&genero=&ordem=&pagina=
// Tela Explorar: filmes com média e total de notas, filtrando por título e gênero.
// ---------------------------------------------------------------------------
router.get('/', wrap(async (req, res) => {
  const busca = (req.query.busca || '').trim() || null;
  const genero = (req.query.genero || '').trim() || null;
  const ordem = ORDENS[req.query.ordem] || ORDENS.nota;
  const limite = 48;
  const offset = (Math.max(inteiro(req.query.pagina) || 1, 1) - 1) * limite;

  const { rows } = await db.query(`
    SELECT t.id, t.nome, t.estudio, t.ano_de_lancamento, t.poster_url,
           ROUND(AVG(a.nota), 1) AS nota_media,
           COUNT(a.nota)::int    AS total
    FROM filme f
    JOIN titulo t ON t.estudio = f.estudio AND t.nome = f.nome
    LEFT JOIN avalia_filme a ON a.estudio = f.estudio AND a.nome_do_filme = f.nome
    WHERE ($1::text IS NULL OR t.nome ILIKE '%' || $1 || '%')
      AND ($2::text IS NULL OR EXISTS (
            SELECT 1 FROM genero g
            WHERE g.estudio_titulo = t.estudio AND g.nome_titulo = t.nome AND g.genero = $2) AND (NOT $5::boolean OR t.classificacao_indicativa = 'LIVRE'))
    GROUP BY t.id, t.estudio, t.nome, t.ano_de_lancamento, t.poster_url
    ORDER BY ${ordem}
    LIMIT $3 OFFSET $4
  `, [busca, genero, limite, offset, req.infantil]);

  res.json(rows);
}));

// ---------------------------------------------------------------------------
// GET /api/filmes/:id  -> página do filme (o "meu" usa o perfil logado):
// dados + diretores/elenco/gêneros + histograma + reviews + estado do perfil.
// ---------------------------------------------------------------------------
router.get('/:id', wrap(async (req, res) => {
  const id = inteiro(req.params.id);
  const perfil = req.sessao.perfil || null;   // perfil da sessão (não vem mais da URL)

  const filme = await db.query(`
    SELECT t.id, t.nome, t.estudio, t.ano_de_lancamento, t.duracao,
           t.classificacao_indicativa, t.descricao, t.poster_url,
      (SELECT STRING_AGG(d.diretor, ', ' ORDER BY d.diretor) FROM diretores d
        WHERE d.estudio_titulo = t.estudio AND d.nome_titulo = t.nome) AS diretores,
      (SELECT STRING_AGG(e.ator, ', ' ORDER BY e.ator) FROM elenco e
        WHERE e.estudio_titulo = t.estudio AND e.nome_titulo = t.nome) AS elenco,
      (SELECT STRING_AGG(g.genero, ', ' ORDER BY g.genero) FROM genero g
        WHERE g.estudio_titulo = t.estudio AND g.nome_titulo = t.nome) AS generos,
      (SELECT ROUND(AVG(a.nota), 1) FROM avalia_filme a
        WHERE a.estudio = t.estudio AND a.nome_do_filme = t.nome) AS nota_media
    FROM titulo t
    JOIN filme f ON f.estudio = t.estudio AND f.nome = t.nome
    WHERE t.id = $1
      AND (NOT $2::boolean OR t.classificacao_indicativa = 'LIVRE')
  `, [id, req.infantil]);
  if (filme.rowCount === 0) return res.status(404).json({ erro: 'Filme não encontrado.' });
  const f = filme.rows[0];

  const [histograma, reviews, meu] = await Promise.all([
    // generate_series garante as 5 notas na resposta, mesmo as que ninguém deu (total = 0)
    db.query(`
      SELECT n.nota, COUNT(a.nota)::int AS total
      FROM generate_series(1, 5) AS n(nota)
      LEFT JOIN avalia_filme a
        ON a.nota = n.nota AND a.estudio = $1 AND a.nome_do_filme = $2
      GROUP BY n.nota ORDER BY n.nota
    `, [f.estudio, f.nome]),

    db.query(`
      SELECT p.id AS id_perfil, p.nome AS perfil, a.nota, a.comentario, a.criado_em
      FROM avalia_filme a
      JOIN perfil p ON p.email = a.email AND p.nome = a.perfil
      WHERE a.estudio = $1 AND a.nome_do_filme = $2
      ORDER BY a.criado_em DESC
      LIMIT 50
    `, [f.estudio, f.nome]),

    // O que o perfil escolhido já fez com este filme (nota, watchlist, curtida)
    perfil === null ? { rows: [{}] } : db.query(`
      SELECT
        (SELECT a.nota FROM avalia_filme a
          WHERE a.email = p.email AND a.perfil = p.nome
            AND a.estudio = $2 AND a.nome_do_filme = $3)            AS minha_nota,
        EXISTS (SELECT 1 FROM lista_de_desejo_filme l
          WHERE l.email = p.email AND l.perfil = p.nome
            AND l.estudio = $2 AND l.nome_do_filme = $3)            AS na_watchlist,
        EXISTS (SELECT 1 FROM curte_filme c
          WHERE c.email = p.email AND c.perfil = p.nome
            AND c.estudio = $2 AND c.nome_do_filme = $3)            AS curtido
      FROM perfil p WHERE p.id = $1
    `, [perfil, f.estudio, f.nome]),
  ]);

  res.json({
    ...f,
    total_avaliacoes: histograma.rows.reduce((s, r) => s + r.total, 0),
    histograma: histograma.rows,
    reviews: reviews.rows,
    meu: meu.rows[0] || {},
  });
}));

// ---------------------------------------------------------------------------
// POST /api/filmes -> (somente conta MASTER) cadastra um filme completo. TRANSAÇÃO: ou grava tudo, ou nada
// (titulo -> filme -> gêneros -> diretores -> elenco).
// ---------------------------------------------------------------------------
const lista = (v) => [...new Set(
  (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim()).filter(Boolean)
)];

router.post('/', exigirMaster, wrap(async (req, res) => {   // só contas master
  const b = req.body;
  const obrigatorios = ['nome', 'estudio', 'ano_de_lancamento', 'duracao', 'classificacao_indicativa', 'descricao'];
  const faltando = obrigatorios.filter((c) => !String(b[c] ?? '').trim());
  if (faltando.length) return res.status(400).json({ erro: 'Preencha: ' + faltando.join(', ') + '.' });

  const nome = b.nome.trim();
  const estudio = b.estudio.trim();

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const novo = await client.query(`
      INSERT INTO titulo (estudio, nome, ano_de_lancamento, classificacao_indicativa, descricao, duracao, poster_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [estudio, nome, b.ano_de_lancamento, b.classificacao_indicativa, b.descricao, b.duracao, b.poster_url || null]);

    await client.query('INSERT INTO filme (estudio, nome) VALUES ($1, $2)', [estudio, nome]);

    for (const g of lista(b.generos))
      await client.query('INSERT INTO genero (genero, estudio_titulo, nome_titulo) VALUES ($1, $2, $3)', [g, estudio, nome]);
    for (const d of lista(b.diretores))
      await client.query('INSERT INTO diretores (diretor, estudio_titulo, nome_titulo) VALUES ($1, $2, $3)', [d, estudio, nome]);
    for (const a of lista(b.elenco))
      await client.query('INSERT INTO elenco (ator, estudio_titulo, nome_titulo) VALUES ($1, $2, $3)', [a, estudio, nome]);

    await client.query('COMMIT');
    res.status(201).json(novo.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/filmes/:id/avaliacoes  { nota, comentario }
// Cria OU atualiza (upsert) a avaliação do perfil para o filme.
// ---------------------------------------------------------------------------
router.post('/:id/avaliacoes', exigirPerfil, wrap(async (req, res) => {
  const idFilme = inteiro(req.params.id);
  const idPerfil = req.sessao.perfil;   // sempre o perfil logado: ninguém avalia "como" outro perfil
  const nota = inteiro(req.body.nota);
  const comentario = (req.body.comentario || '').trim() || null;

  if (!(nota >= 1 && nota <= 5)) return res.status(400).json({ erro: 'A nota deve ser de 1 a 5.' });

  const r = await db.query(`
    INSERT INTO avalia_filme (nota, estudio, nome_do_filme, email, perfil, comentario)
    SELECT $3::int, t.estudio, t.nome, p.email, p.nome, $4
    FROM titulo t, perfil p
    WHERE t.id = $1 AND p.id = $2
      AND (p.tipo <> 'Infantil' OR t.classificacao_indicativa = 'LIVRE')
    ON CONFLICT (estudio, nome_do_filme, email, perfil)
    DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, criado_em = now()
  `, [idFilme, idPerfil, nota, comentario]);

  if (r.rowCount === 0) return res.status(404).json({ erro: 'Filme ou perfil não encontrado.' });
  res.status(201).json({ ok: true });
}));

// ---------------------------------------------------------------------------
// POST /api/filmes/:id/watchlist  e  POST /api/filmes/:id/curtir  (perfil = o da sessão)
// As duas tabelas têm as mesmas colunas, então compartilham a função "alternar":
// se o registro existe, remove; senão, cria. (O nome da tabela vem de constantes
// nossas, nunca do usuário.)
// ---------------------------------------------------------------------------
function alternar(tabela) {
  return wrap(async (req, res) => {
    const idFilme = inteiro(req.params.id);
    const idPerfil = req.sessao.perfil;

    const del = await db.query(`
      DELETE FROM ${tabela} AS x
      USING titulo t, perfil p
      WHERE t.id = $1 AND p.id = $2
        AND x.estudio = t.estudio AND x.nome_do_filme = t.nome
        AND x.email = p.email AND x.perfil = p.nome
    `, [idFilme, idPerfil]);
    if (del.rowCount > 0) return res.json({ ativo: false });

    const ins = await db.query(`
      INSERT INTO ${tabela} (estudio, nome_do_filme, email, perfil)
      SELECT t.estudio, t.nome, p.email, p.nome
      FROM titulo t, perfil p
      WHERE t.id = $1 AND p.id = $2
        AND (p.tipo <> 'Infantil' OR t.classificacao_indicativa = 'LIVRE')
    `, [idFilme, idPerfil]);
    if (ins.rowCount === 0) return res.status(404).json({ erro: 'Filme ou perfil não encontrado.' });
    res.json({ ativo: true });
  });
}
router.post('/:id/watchlist', exigirPerfil, alternar('lista_de_desejo_filme'));
router.post('/:id/curtir', exigirPerfil, alternar('curte_filme'));

module.exports = router;
