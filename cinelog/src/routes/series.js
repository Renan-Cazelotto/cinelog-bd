const router = require('express').Router();
const db = require('../db');
const { wrap, inteiro, serieLivre } = require('../util');
const { exigirPerfil, exigirMaster } = require('../auth');

// Estrutura: serie (PK nome) -> temporada (PK nome + nome_da_serie) -> episodio (PK estudio + nome, que também é um titulo).
// Para as URLs usamos serie.id, temporada.id e titulo.id (criados em migracao.sql / migracao_series.sql).

const ORDENS = {
  nota: 'nota_media DESC NULLS LAST, total DESC, s.nome',
  populares: 'total DESC, s.nome',
  titulo: 's.nome',
};

const lista = (v) => [...new Set(
  (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim()).filter(Boolean)
)];
const faltando = (b, campos) => campos.filter((c) => !String(b[c] ?? '').trim());

// GET /api/series?busca=&ordem=&pagina=  -> Explorar séries
router.get('/', wrap(async (req, res) => {
  const busca = (req.query.busca || '').trim() || null;
  const ordem = ORDENS[req.query.ordem] || ORDENS.nota;
  const limite = 48;
  const offset = (Math.max(inteiro(req.query.pagina) || 1, 1) - 1) * limite;

  const { rows } = await db.query(`
    SELECT s.id, s.nome, s.poster_url,
           (SELECT COUNT(*)::int FROM temporada t WHERE t.nome_da_serie = s.nome) AS temporadas,
           ROUND(AVG(a.nota), 1) AS nota_media,
           COUNT(a.nota)::int    AS total
    FROM serie s
    LEFT JOIN avalia_serie a ON a.nome_da_serie = s.nome
    WHERE ($1::text IS NULL OR s.nome ILIKE '%' || $1 || '%')
      AND (NOT $4::boolean OR ${serieLivre('s.nome')})
    GROUP BY s.id, s.nome, s.poster_url
    ORDER BY ${ordem}
    LIMIT $2 OFFSET $3
  `, [busca, limite, offset, req.infantil]);
}));

// GET /api/series/episodio/:id  -> página de um episódio (id = titulo.id)
router.get('/episodio/:id', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.id, t.nome, t.estudio, t.ano_de_lancamento, t.duracao, t.classificacao_indicativa,
           t.descricao, t.poster_url, e.temporada, e.numero AS numero_episodio, e.nome_da_serie,
           s.id AS id_serie,
      (SELECT STRING_AGG(d.diretor, ', ' ORDER BY d.diretor) FROM diretores d
        WHERE d.estudio_titulo = t.estudio AND d.nome_titulo = t.nome) AS diretores,
      (SELECT STRING_AGG(x.ator, ', ' ORDER BY x.ator) FROM elenco x
        WHERE x.estudio_titulo = t.estudio AND x.nome_titulo = t.nome) AS elenco
    FROM titulo t
    JOIN episodio e ON e.estudio = t.estudio AND e.nome = t.nome
    JOIN serie s    ON s.nome = e.nome_da_serie
    WHERE t.id = $1
      AND (NOT $2::boolean OR ${serieLivre('s.nome')})
  `, [inteiro(req.params.id), req.infantil]);
  if (!rows.length) return res.status(404).json({ erro: 'Episódio não encontrado.' });
  res.json(rows[0]);
}));

// GET /api/series/:id  -> série + temporadas com episódios + histograma + reviews + estado do perfil logado
router.get('/:id', wrap(async (req, res) => {
  const id = inteiro(req.params.id);
  const perfil = req.sessao.perfil || null;   // perfil da sessão (não vem da URL)

  const serie = await db.query(`
    SELECT s.id, s.nome, s.descricao, s.poster_url,
           (SELECT ROUND(AVG(a.nota), 1) FROM avalia_serie a WHERE a.nome_da_serie = s.nome) AS nota_media
    FROM serie s
    WHERE s.id = $1
      AND (NOT $2::boolean OR ${serieLivre('s.nome')})
  `, [id, req.infantil]);
  if (!serie.rowCount) return res.status(404).json({ erro: 'Série não encontrada.' });
  const s = serie.rows[0];

  const [temporadas, episodios, histograma, reviews, meu] = await Promise.all([
    db.query(`
      SELECT id, nome, descricao, ano_de_lancamento, numero
      FROM temporada WHERE nome_da_serie = $1
      ORDER BY numero NULLS LAST, ano_de_lancamento, nome
    `, [s.nome]),
    db.query(`
      SELECT e.temporada, e.numero, t.id, t.nome, t.duracao, t.poster_url
      FROM episodio e
      JOIN titulo t ON t.estudio = e.estudio AND t.nome = e.nome
      WHERE e.nome_da_serie = $1
      ORDER BY e.numero NULLS LAST, t.id
    `, [s.nome]),
    db.query(`
      SELECT n.nota, COUNT(a.nota)::int AS total
      FROM generate_series(1, 5) AS n(nota)
      LEFT JOIN avalia_serie a ON a.nota = n.nota AND a.nome_da_serie = $1
      GROUP BY n.nota ORDER BY n.nota
    `, [s.nome]),
    db.query(`
      SELECT p.id AS id_perfil, p.nome AS perfil, a.nota, a.comentario, a.criado_em
      FROM avalia_serie a
      JOIN perfil p ON p.email = a.email AND p.nome = a.perfil
      WHERE a.nome_da_serie = $1
      ORDER BY a.criado_em DESC LIMIT 50
    `, [s.nome]),
    perfil === null ? { rows: [{}] } : db.query(`
      SELECT
        (SELECT a.nota FROM avalia_serie a
          WHERE a.email = p.email AND a.perfil = p.nome AND a.nome_da_serie = $2) AS minha_nota,
        EXISTS (SELECT 1 FROM lista_de_desejos_serie l
          WHERE l.email = p.email AND l.perfil = p.nome AND l.nome_da_serie = $2) AS na_watchlist
      FROM perfil p WHERE p.id = $1
    `, [perfil, s.nome]),
  ]);

  res.json({
    ...s,
    total_avaliacoes: histograma.rows.reduce((soma, r) => soma + r.total, 0),
    temporadas: temporadas.rows.map((t) => ({
      ...t, episodios: episodios.rows.filter((e) => e.temporada === t.nome),
    })),
    histograma: histograma.rows,
    reviews: reviews.rows,
    meu: meu.rows[0] || {},
  });
}));

// POST /api/series  { nome, descricao, poster_url? }  (somente conta MASTER)
router.post('/', exigirMaster, wrap(async (req, res) => {
  const b = req.body;
  const f = faltando(b, ['nome', 'descricao']);
  if (f.length) return res.status(400).json({ erro: 'Preencha: ' + f.join(', ') + '.' });
  if (b.nome.trim().length > 30) return res.status(400).json({ erro: 'O nome da série aceita até 30 caracteres.' });

  const { rows } = await db.query(
    'INSERT INTO serie (nome, descricao, poster_url) VALUES ($1, $2, $3) RETURNING id',
    [b.nome.trim(), b.descricao.trim(), (b.poster_url || '').trim() || null]);
  res.status(201).json(rows[0]);
}));

// POST /api/series/:id/temporadas  (somente MASTER) { nome?, descricao?, ano_de_lancamento }
router.post('/:id/temporadas', exigirMaster, wrap(async (req, res) => {
  const b = req.body;
  const ano = inteiro(b.ano_de_lancamento);
  if (!ano) return res.status(400).json({ erro: 'Informe o ano de lançamento.' });

  const s = await db.query(`
    SELECT nome, (SELECT COALESCE(MAX(numero), 0) + 1 FROM temporada WHERE nome_da_serie = serie.nome) AS prox
    FROM serie WHERE id = $1`, [inteiro(req.params.id)]);
  if (!s.rowCount) return res.status(404).json({ erro: 'Série não encontrada.' });

  const { nome: nomeSerie, prox } = s.rows[0];
  const nome = (b.nome || '').trim() || `Temporada ${prox}`;
  if (nome.length > 30) return res.status(400).json({ erro: 'O nome da temporada aceita até 30 caracteres.' });

  const { rows } = await db.query(`
    INSERT INTO temporada (nome, descricao, ano_de_lancamento, nome_da_serie, numero)
    VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [nome, (b.descricao || '').trim(), ano, nomeSerie, prox]);
  res.status(201).json(rows[0]);
}));

// POST /api/series/temporadas/:id/episodios -> (somente MASTER) cria o episódio. TRANSAÇÃO: titulo -> episodio -> diretores -> elenco
router.post('/temporadas/:id/episodios', exigirMaster, wrap(async (req, res) => {
  const b = req.body;
  const f = faltando(b, ['nome', 'estudio', 'ano_de_lancamento', 'duracao', 'classificacao_indicativa', 'descricao']);
  if (f.length) return res.status(400).json({ erro: 'Preencha: ' + f.join(', ') + '.' });
  const nome = b.nome.trim();
  const estudio = b.estudio.trim();

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const t = await client.query(`
      SELECT nome, nome_da_serie,
             (SELECT COALESCE(MAX(e.numero), 0) + 1 FROM episodio e
               WHERE e.nome_da_serie = temporada.nome_da_serie AND e.temporada = temporada.nome) AS prox
      FROM temporada WHERE id = $1`, [inteiro(req.params.id)]);
    if (!t.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ erro: 'Temporada não encontrada.' }); }
    const { nome: temporada, nome_da_serie: serie, prox } = t.rows[0];

    const novo = await client.query(`
      INSERT INTO titulo (estudio, nome, ano_de_lancamento, classificacao_indicativa, descricao, duracao, poster_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [estudio, nome, b.ano_de_lancamento, b.classificacao_indicativa, b.descricao, b.duracao, (b.poster_url || '').trim() || null]);

    await client.query(
      'INSERT INTO episodio (estudio, nome, temporada, nome_da_serie, numero) VALUES ($1, $2, $3, $4, $5)',
      [estudio, nome, temporada, serie, prox]);
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

// POST /api/series/:id/avaliacoes  { nota, comentario }  (cria ou atualiza; perfil = o da sessão)
router.post('/:id/avaliacoes', exigirPerfil, wrap(async (req, res) => {
  const idPerfil = req.sessao.perfil;
  const nota = inteiro(req.body.nota);
  const comentario = (req.body.comentario || '').trim() || null;
  if (!(nota >= 1 && nota <= 5)) return res.status(400).json({ erro: 'A nota deve ser de 1 a 5.' });

  const r = await db.query(`
    INSERT INTO avalia_serie (nota, email, perfil, nome_da_serie, comentario)
    SELECT $3::int, p.email, p.nome, s.nome, $4
    FROM serie s, perfil p
    WHERE s.id = $1 AND p.id = $2
      AND (p.tipo <> 'Infantil' OR ${serieLivre('s.nome')})
    ON CONFLICT (email, perfil, nome_da_serie)
    DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, criado_em = now()
  `, [inteiro(req.params.id), idPerfil, nota, comentario]);
  if (!r.rowCount) return res.status(404).json({ erro: 'Série ou perfil não encontrado.' });
  res.status(201).json({ ok: true });
}));

// POST /api/series/:id/watchlist  -> liga/desliga (perfil = o da sessão)
router.post('/:id/watchlist', exigirPerfil, wrap(async (req, res) => {
  const idSerie = inteiro(req.params.id);
  const idPerfil = req.sessao.perfil;

  const del = await db.query(`
    DELETE FROM lista_de_desejos_serie x USING serie s, perfil p
    WHERE s.id = $1 AND p.id = $2
      AND x.nome_da_serie = s.nome AND x.email = p.email AND x.perfil = p.nome
  `, [idSerie, idPerfil]);
  if (del.rowCount) return res.json({ ativo: false });

  const ins = await db.query(`
    INSERT INTO lista_de_desejos_serie (email, perfil, nome_da_serie)
     SELECT p.email, p.nome, s.nome
    FROM serie s, perfil p
    WHERE s.id = $1 AND p.id = $2
      AND (p.tipo <> 'Infantil' OR ${serieLivre('s.nome')})
  `, [idSerie, idPerfil]);
  if (!ins.rowCount) return res.status(404).json({ erro: 'Série ou perfil não encontrado.' });
  res.json({ ativo: true });
}));

module.exports = router;
