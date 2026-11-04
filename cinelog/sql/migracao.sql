-- Passo 2: ajustes no banco de BD I para o site. Pode rodar mais de uma vez.
BEGIN;

-- ids simples para URLs (as PKs compostas continuam como estão)
ALTER TABLE titulo ADD COLUMN IF NOT EXISTS id SERIAL UNIQUE;
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS id SERIAL UNIQUE;

-- pôster do filme
ALTER TABLE titulo ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE serie ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- review e data na avaliação
ALTER TABLE avalia_filme ADD COLUMN IF NOT EXISTS comentario TEXT;
ALTER TABLE avalia_filme ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now();

-- curtidas (o coração)
CREATE TABLE IF NOT EXISTS curte_filme (
  estudio         VARCHAR(30)  NOT NULL,
  nome_do_filme   VARCHAR(100) NOT NULL,
  email           VARCHAR(30)  NOT NULL,
  perfil          VARCHAR(15)  NOT NULL,
  PRIMARY KEY (estudio, nome_do_filme, email, perfil),
  FOREIGN KEY (estudio, nome_do_filme) REFERENCES filme(estudio, nome),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome)
);

-- login: a senha agora guarda um hash bcrypt (60 caracteres), então a coluna precisa ser maior
ALTER TABLE conta ALTER COLUMN senha TYPE VARCHAR(100);
-- permissão especial: só contas master podem cadastrar filmes
ALTER TABLE conta ADD COLUMN IF NOT EXISTS master BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_avalia_filme_filme ON avalia_filme(estudio, nome_do_filme);

COMMIT;
