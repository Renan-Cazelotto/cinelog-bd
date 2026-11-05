-- Passo 3: séries, temporadas e episódios. Pode rodar mais de uma vez.
-- Pré-requisito: migracao.sql (passo 2) já aplicado (usa titulo.id).
BEGIN;

-- ids simples para as URLs
ALTER TABLE serie     ADD COLUMN IF NOT EXISTS id SERIAL UNIQUE;
ALTER TABLE temporada ADD COLUMN IF NOT EXISTS id SERIAL UNIQUE;

-- pôster da série e ordem de temporadas/episódios
ALTER TABLE serie     ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE temporada ADD COLUMN IF NOT EXISTS numero INT;
ALTER TABLE episodio  ADD COLUMN IF NOT EXISTS numero INT;

-- review e data na avaliação de série
ALTER TABLE avalia_serie ADD COLUMN IF NOT EXISTS comentario TEXT;
ALTER TABLE avalia_serie ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now();

-- numera o que já existe (só onde ainda está vazio)
UPDATE temporada t SET numero = x.n
FROM (SELECT nome, nome_da_serie,
             ROW_NUMBER() OVER (PARTITION BY nome_da_serie ORDER BY ano_de_lancamento, nome) AS n
      FROM temporada) x
WHERE t.nome = x.nome AND t.nome_da_serie = x.nome_da_serie AND t.numero IS NULL;

UPDATE episodio e SET numero = x.n
FROM (SELECT e2.estudio, e2.nome,
             ROW_NUMBER() OVER (PARTITION BY e2.nome_da_serie, e2.temporada ORDER BY t.id) AS n
      FROM episodio e2
      JOIN titulo t ON t.estudio = e2.estudio AND t.nome = e2.nome) x
WHERE e.estudio = x.estudio AND e.nome = x.nome AND e.numero IS NULL;

CREATE INDEX IF NOT EXISTS idx_episodio_temporada ON episodio(nome_da_serie, temporada);
CREATE INDEX IF NOT EXISTS idx_avalia_serie_serie ON avalia_serie(nome_da_serie);

COMMIT;
