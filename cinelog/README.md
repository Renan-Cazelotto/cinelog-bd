# CineLog – back-end estilo Letterboxd (Banco de Dados II, Parte 1)

Node.js + Express + PostgreSQL (Neon), sobre o banco `streaming.sql` de BD I.
**Status:** back-end e telas prontos e testados (API + páginas rodando contra um PostgreSQL local).
Falta apenas conectar ao seu Neon e popular o catálogo/pôsteres.

## Rodando
1. Crie o projeto no Neon e copie a connection string.
2. `cp .env.example .env` e cole a string em `DATABASE_URL`.
3. `npm install`
4. Banco novo (vazio): `npm run db:init -- streaming.sql migracao.sql`
   Banco que já tem o `streaming.sql`: `npm run db:init` (roda só `migracao.sql`; pode repetir sem erro).
5. `npm run dev` → http://localhost:3000

## Rotas
| Rota | O que faz |
|---|---|
| `GET /api/filmes?busca=&genero=&ordem=nota\|populares\|recentes\|titulo&pagina=` | Explorar: média e total de notas |
| `GET /api/filmes/:id?perfil=` | Página do filme: diretores, elenco, gêneros, histograma, reviews e o que o perfil já fez |
| `POST /api/filmes` | Cadastra filme (transação: titulo, filme, gêneros, diretores, elenco) |
| `POST /api/filmes/:id/avaliacoes` | `{id_perfil, nota 1-5, comentario}` (cria ou atualiza) |
| `POST /api/filmes/:id/watchlist` · `/curtir` | `{id_perfil}` alterna ligado/desligado |
| `GET /api/perfis` · `/:id` · `/:id/avaliacoes` · `/:id/watchlist` | Perfis, estatísticas e listas |
| `GET /api/generos` | Gêneros distintos |

O `email` do perfil nunca sai na API: o site usa `perfil.id` / `titulo.id` (criados na migração)
e os JOINs convertem para as chaves compostas `(email, nome)` e `(estudio, nome)`.

## Telas (pasta `public/`)
| Página | Arquivo | O que tem |
|---|---|---|
| Explorar | `index.html` + `js/explorar.js` | Busca, filtro de gênero, ordenação, grade de pôsteres, "carregar mais", cadastro de filme |
| Filme | `filme.html?id=` + `js/filme.js` | Dados, diretores/elenco, nota média, histograma, watchlist, curtir, avaliar com review, lista de avaliações |
| Perfil | `perfil.html?id=` + `js/perfil.js` | Estatísticas, gêneros mais avaliados, abas Avaliados / Watchlist |

`js/comum.js` reúne o que as três usam (fetch, escape de HTML, pôster, cabeçalho com seletor de perfil)
e `css/style.css` guarda o tema nas variáveis do `:root`. O perfil escolhido no topo fica salvo no navegador.

## Estrutura
- `server.js`: Express, arquivos estáticos e tradução de erros do PostgreSQL
- `src/db.js`: pool de conexão · `src/util.js`: helpers
- `src/routes/`: filmes, perfis, generos (todo o SQL está aqui)
- `sql/streaming.sql` (banco de BD I) · `sql/migracao.sql` (passo 2) · `sql/init.js`

## Deploy (Render)
Web Service com `npm install` / `npm start` e a variável `DATABASE_URL` do Neon.
