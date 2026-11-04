
CREATE TABLE plano_assinatura
(
  nome_do_plano     VARCHAR(20) NOT NULL,
  numero_de_telas   INT NOT NULL,
  valor             FLOAT NOT NULL,
  PRIMARY KEY (nome_do_plano),
  CONSTRAINT chk_nome_plano CHECK (nome_do_plano IN ('Premium', 'Padrao', 'PadraoComAd')),
  CONSTRAINT chk_numero_telas CHECK (numero_de_telas IN (2, 4))
);

CREATE TABLE conta
(
  email                   VARCHAR(30) NOT NULL,
  telefone                VARCHAR(11) NOT NULL,
  senha                   VARCHAR(30) NOT NULL,
  nome                    VARCHAR(100) NOT NULL,
  vencimento_assinatura   DATE NOT NULL,
  nome_do_plano           VARCHAR(20) NOT NULL,
  PRIMARY KEY (email),
  FOREIGN KEY (nome_do_plano) REFERENCES plano_assinatura(nome_do_plano)
);

CREATE TABLE dados_de_pagamento
(
  numero_do_cartao      VARCHAR(16) NOT NULL,
  nome_do_titular       VARCHAR(100) NOT NULL,
  cpf                   VARCHAR(11) NOT NULL,
  data_de_validade      DATE NOT NULL,
  bandeira              VARCHAR(20) NOT NULL,
  cep                   VARCHAR(8) NOT NULL,
  rua                   VARCHAR(30) NOT NULL,
  bairro                VARCHAR(30) NOT NULL,
  cidade                VARCHAR(30) NOT NULL,
  estado                VARCHAR(30) NOT NULL,
  numero                VARCHAR(10) NOT NULL,
  complemento           VARCHAR(10),
  email_dono_da_conta   VARCHAR(30) NOT NULL,
  PRIMARY KEY (numero_do_cartao),
  FOREIGN KEY (email_dono_da_conta) REFERENCES conta(email),
  CONSTRAINT chk_bandeira CHECK (bandeira IN ('VISA', 'MASTERCARD', 'ELO'))
);

CREATE TABLE titulo
(
  estudio                     VARCHAR(30) NOT NULL,
  ano_de_lancamento           INT NOT NULL,
  nome                        VARCHAR(100) NOT NULL,
  classificacao_indicativa    VARCHAR(10) NOT NULL,
  descricao                   VARCHAR(1000) NOT NULL,
  duracao                     INT NOT NULL,
  PRIMARY KEY (estudio, nome),
  CONSTRAINT chk_classificacao_indicativa CHECK (classificacao_indicativa IN ('LIVRE', '6', '10', '12', '14', '16', '18'))
);

CREATE TABLE diretores
(
  diretor           VARCHAR(30) NOT NULL,
  estudio_titulo    VARCHAR(30) NOT NULL,
  nome_titulo       VARCHAR(100) NOT NULL,
  PRIMARY KEY (diretor, estudio_titulo, nome_titulo),
  FOREIGN KEY (estudio_titulo, nome_titulo) REFERENCES titulo(estudio, nome)
);

CREATE TABLE genero
(
  genero            VARCHAR(15) NOT NULL,
  estudio_titulo    VARCHAR(30) NOT NULL,
  nome_titulo       VARCHAR(100) NOT NULL,
  PRIMARY KEY (genero, estudio_titulo, nome_titulo),
  FOREIGN KEY (estudio_titulo, nome_titulo) REFERENCES titulo(estudio, nome)
);

CREATE TABLE elenco
(
  ator              VARCHAR(30) NOT NULL,
  estudio_titulo    VARCHAR(30) NOT NULL,
  nome_titulo       VARCHAR(100) NOT NULL,
  PRIMARY KEY (ator, estudio_titulo, nome_titulo),
  FOREIGN KEY (estudio_titulo, nome_titulo) REFERENCES titulo(estudio, nome)
);

CREATE TABLE filme
(
  estudio   VARCHAR(30) NOT NULL,
  nome      VARCHAR(100) NOT NULL,
  PRIMARY KEY (estudio, nome),
  FOREIGN KEY (estudio, nome) REFERENCES titulo(estudio, nome)
);

CREATE TABLE trailer_filme
(
  trailer             INT NOT NULL,
  estudio_do_filme    VARCHAR(30) NOT NULL,
  nome_do_filme       VARCHAR(100) NOT NULL,
  PRIMARY KEY (trailer, estudio_do_filme, nome_do_filme),
  FOREIGN KEY (estudio_do_filme, nome_do_filme) REFERENCES filme(estudio, nome)
);

CREATE TABLE serie
(
  nome        VARCHAR(30) NOT NULL,
  descricao   VARCHAR(1000) NOT NULL,
  PRIMARY KEY (nome)
);

CREATE TABLE temporada
(
  nome                VARCHAR(30) NOT NULL,
  descricao           VARCHAR(1000) NOT NULL,
  ano_de_lancamento   INT NOT NULL,
  nome_da_serie       VARCHAR(30) NOT NULL,
  PRIMARY KEY (nome, nome_da_serie),
  FOREIGN KEY (nome_da_serie) REFERENCES serie(nome)
);

CREATE TABLE episodio
(
  estudio         VARCHAR(30) NOT NULL,
  nome            VARCHAR(100) NOT NULL,
  temporada       VARCHAR(30) NOT NULL,
  nome_da_serie   VARCHAR(30) NOT NULL,
  PRIMARY KEY (estudio, nome),
  FOREIGN KEY (estudio, nome) REFERENCES titulo(estudio, nome),
  FOREIGN KEY (temporada, nome_da_serie) REFERENCES temporada(nome, nome_da_serie)
);

CREATE TABLE perfil
(
  nome                VARCHAR(15) NOT NULL,
  tipo                VARCHAR(10) NOT NULL,
  imagem_de_perfil    VARCHAR(10) NOT NULL,
  email               VARCHAR(30) NOT NULL,
  PRIMARY KEY (email, nome),
  FOREIGN KEY (email) REFERENCES conta(email),
  CONSTRAINT chk_tipo_perfil CHECK (tipo IN ('Infantil', 'Adulto')),
  CONSTRAINT chk_imagem_perfil CHECK (imagem_de_perfil IN ('img1', 'img2', 'img3', 'img4'))
);

CREATE TABLE trailer_temporada
(
  trailer         INT NOT NULL,
  temporada       VARCHAR(30) NOT NULL,
  nome_da_serie   VARCHAR(30) NOT NULL,
  PRIMARY KEY (trailer, temporada, nome_da_serie),
  FOREIGN KEY (temporada, nome_da_serie) REFERENCES temporada(nome, nome_da_serie)
);

CREATE TABLE trailer_serie
(
  trailer   INT NOT NULL,
  serie     VARCHAR(30) NOT NULL,
  PRIMARY KEY (trailer, serie),
  FOREIGN KEY (serie) REFERENCES serie(nome)
);

CREATE TABLE assistir
(
  tempo_assistido   INT NOT NULL,
  email             VARCHAR(30) NOT NULL,
  perfil            VARCHAR(15) NOT NULL,
  estudio           VARCHAR(30) NOT NULL,
  nome_do_titulo    VARCHAR(100) NOT NULL,
  PRIMARY KEY (email, perfil, estudio, nome_do_titulo),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome),
  FOREIGN KEY (estudio, nome_do_titulo) REFERENCES titulo(estudio, nome)
);

CREATE TABLE arquivo
(
  qualidade         INT NOT NULL,
  tamanho           INT NOT NULL,
  estudio           VARCHAR(30) NOT NULL,
  nome_do_titulo    VARCHAR(100) NOT NULL,
  PRIMARY KEY (estudio, nome_do_titulo, qualidade),
  FOREIGN KEY (estudio, nome_do_titulo) REFERENCES titulo(estudio, nome)
);

CREATE TABLE baixa
(
  data_download     DATE NOT NULL,
  email             VARCHAR(30) NOT NULL,
  perfil            VARCHAR(15) NOT NULL,
  estudio           VARCHAR(30) NOT NULL,
  nome_do_titulo    VARCHAR(100) NOT NULL,
  qualidade         INT NOT NULL,
  PRIMARY KEY (email, perfil, estudio, nome_do_titulo, qualidade),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome),
  FOREIGN KEY (estudio, nome_do_titulo, qualidade) REFERENCES arquivo(estudio, nome_do_titulo, qualidade)
);

CREATE TABLE avalia_filme
(
  nota              INT NOT NULL,
  estudio           VARCHAR(30) NOT NULL,
  nome_do_filme     VARCHAR(100) NOT NULL,
  email             VARCHAR(30) NOT NULL,
  perfil            VARCHAR(15) NOT NULL,
  PRIMARY KEY (estudio, nome_do_filme, email, perfil),
  FOREIGN KEY (estudio, nome_do_filme) REFERENCES filme(estudio, nome),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome),
  CONSTRAINT chk_nota_filme CHECK (nota BETWEEN 1 AND 5)
);

CREATE TABLE lista_de_desejo_filme
(
  estudio         VARCHAR(30) NOT NULL,
  nome_do_filme   VARCHAR(100) NOT NULL,
  email           VARCHAR(30) NOT NULL,
  perfil          VARCHAR(15) NOT NULL,
  PRIMARY KEY (estudio, nome_do_filme, email, perfil),
  FOREIGN KEY (estudio, nome_do_filme) REFERENCES filme(estudio, nome),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome)
);

CREATE TABLE recomendacao_filme
(
  estudio         VARCHAR(30) NOT NULL,
  nome_do_filme   VARCHAR(100) NOT NULL,
  email           VARCHAR(30) NOT NULL,
  perfil          VARCHAR(15) NOT NULL,
  PRIMARY KEY (estudio, nome_do_filme, email, perfil),
  FOREIGN KEY (estudio, nome_do_filme) REFERENCES filme(estudio, nome),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome)
);

CREATE TABLE avalia_serie
(
  nota            INT NOT NULL,
  email           VARCHAR(30) NOT NULL,
  perfil          VARCHAR(15) NOT NULL,
  nome_da_serie   VARCHAR(30) NOT NULL,
  PRIMARY KEY (email, perfil, nome_da_serie),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome),
  FOREIGN KEY (nome_da_serie) REFERENCES serie(nome),
  CONSTRAINT chk_nota_serie CHECK (nota BETWEEN 1 AND 5)
);

CREATE TABLE lista_de_desejos_serie
(
  email           VARCHAR(30) NOT NULL,
  perfil          VARCHAR(15) NOT NULL,
  nome_da_serie   VARCHAR(30) NOT NULL,
  PRIMARY KEY (email, perfil, nome_da_serie),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome),
  FOREIGN KEY (nome_da_serie) REFERENCES serie(nome)
);

CREATE TABLE recomendacao_serie
(
  nome_da_serie   VARCHAR(30) NOT NULL,
  email           VARCHAR(30) NOT NULL,
  perfil          VARCHAR(15) NOT NULL,
  PRIMARY KEY (nome_da_serie, email, perfil),
  FOREIGN KEY (nome_da_serie) REFERENCES serie(nome),
  FOREIGN KEY (email, perfil) REFERENCES perfil(email, nome)
);

CREATE TABLE categoria_recomendacao_filme
(
  categoria         VARCHAR(30) NOT NULL,
  estudio           VARCHAR(30) NOT NULL,
  nome_do_filme     VARCHAR(100) NOT NULL,
  email             VARCHAR(30) NOT NULL,
  perfil            VARCHAR(15) NOT NULL,
  PRIMARY KEY (categoria, estudio, nome_do_filme, email, perfil),
  FOREIGN KEY (estudio, nome_do_filme, email, perfil) REFERENCES recomendacao_filme(estudio, nome_do_filme, email, perfil)
);

CREATE TABLE categoria_recomendacao_serie
(
  categoria       VARCHAR(30) NOT NULL,
  nome_da_serie   VARCHAR(30) NOT NULL,
  email           VARCHAR(30) NOT NULL,
  perfil          VARCHAR(15) NOT NULL,
  PRIMARY KEY (categoria, nome_da_serie, email, perfil),
  FOREIGN KEY (nome_da_serie, email, perfil) REFERENCES recomendacao_serie(nome_da_serie, email, perfil)
);