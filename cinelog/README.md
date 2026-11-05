# CineLog – avaliação de filmes estilo Letterboxd (Banco de Dados II, Parte 1)

Node.js + Express + PostgreSQL (Neon), sobre o banco `streaming.sql` de BD I.
Login por **conta** (e-mail + senha), acesso aos **perfis da conta** e cadastro de filmes só para **contas master**.

## Rodando
1. Crie o projeto no Neon e copie a connection string.
2. `cp .env.example .env` e preencha:
   - `DATABASE_URL` com a string do Neon;
   - `JWT_SECRET` com um segredo (gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. `npm install`
4. Banco novo (vazio): `npm run db:init -- streaming.sql migracao.sql`
   Banco que já tem o `streaming.sql`: `npm run db:init` (roda só `migracao.sql`; pode repetir sem erro).
5. (opcional) `npm run senhas:hash` converte para hash as senhas antigas em texto puro. Sem isso, cada conta
   antiga é convertida sozinha no primeiro login.
6. `npm run dev` → http://localhost:3000

### Tornar uma conta master
Crie a conta pela tela "Criar conta" (ou use uma já existente) e rode no banco (DataGrip/Neon):
```sql
UPDATE conta SET master = true WHERE email = 'seu@email.com';
```
(Para remover a permissão: `... SET master = false ...`. A permissão é consultada no banco a cada uso.)

## Como funciona o login
1. **Conta:** `POST /api/auth/login` confere e-mail e senha (bcrypt) na tabela `conta` e grava um cookie de sessão
   assinado (JWT, `httpOnly`, `SameSite=Lax`, 7 dias; `Secure` em HTTPS).
2. **Perfil:** em `escolher-perfil.html` o usuário vê **só os perfis da própria conta** (ou cria um, máximo 5) e entra em um deles.
   O servidor só aceita perfis cuja `email` seja a da conta logada.
3. **Ações:** avaliar, curtir e watchlist usam sempre o perfil da **sessão**; o navegador não envia mais `id_perfil`,
   então ninguém consegue agir "como" outro perfil.
4. **Master:** `POST /api/filmes` exige `conta.master = true` (o botão "Adicionar filme" também só aparece para elas).
5. Todas as rotas da API (exceto `/api/auth/login`, `/cadastro` e `/planos`) e as páginas do site exigem login.
   Sem sessão, páginas redirecionam para `login.html` e a API responde 401.
6. Proteções extras: bloqueio temporário após 10 senhas erradas (por IP + e-mail), mensagem de erro igual para
   "e-mail inexistente" e "senha errada", senha com 8 a 72 caracteres, e-mail único sem diferenciar maiúsculas.

O cadastro cria uma `conta` com o plano escolhido (lista de `plano_assinatura`) e vencimento em 30 dias.
`dados_de_pagamento` não é usado pelo site.

## Rotas
| Rota | Quem pode |
|---|---|
| `POST /api/auth/cadastro` · `/login` · `GET /api/auth/planos` | Público |
| `POST /api/auth/saida` · `GET /api/auth/eu` · `GET`/`POST /api/auth/perfis` · `POST /api/auth/perfil` | Logado |
| `GET /api/filmes?busca=&genero=&ordem=&pagina=` · `GET /api/filmes/:id` · `GET /api/generos` | Logado |
| `POST /api/filmes/:id/avaliacoes` · `/watchlist` · `/curtir` | Logado, com perfil escolhido |
| `GET /api/perfis/:id` · `/:id/avaliacoes` · `/:id/watchlist` | Logado |
| `POST /api/filmes` (cadastrar filme) | **Conta master** |

O `email` das contas nunca aparece nas respostas de perfis e avaliações; o site usa `perfil.id` / `titulo.id`.

## Telas (pasta `public/`)
| Página | O que tem |
|---|---|
| `login.html` | Entrar / Criar conta |
| `escolher-perfil.html` | Perfis da conta, criar perfil |
| `index.html` | Explorar: busca, gênero, ordenação, grade; "Adicionar filme" (master) |
| `filme.html?id=` | Dados, histograma, watchlist, curtir, avaliar, reviews |
| `perfil.html?id=` | Estatísticas, gêneros mais avaliados, abas Avaliados / Watchlist |

`js/comum.js` reúne o que as páginas usam (fetch com redirecionamento ao login, cabeçalho com a sessão, pôster com
fallback) e `css/style.css` guarda o tema nas variáveis do `:root`.

## Pôsteres
O site mostra a imagem da coluna `titulo.poster_url`. Sem pôster (ou se o link falhar), aparece um bloco colorido
com o título. Se usar imagens do TMDB, mantenha o aviso de atribuição do rodapé.

## Estrutura
- `server.js`: Express, cookies, proteção das páginas/rotas e tradução de erros do PostgreSQL
- `src/auth.js`: sessão (JWT em cookie) e middlewares `exigirLogin`, `exigirPerfil`, `exigirMaster`
- `src/routes/`: `auth`, `filmes`, `perfis`, `generos` (todo o SQL está aqui)
- `sql/streaming.sql` · `sql/migracao.sql` (colunas novas, `conta.master`, `senha` maior) · `sql/init.js` · `sql/hash-senhas.js`

## Deploy (Render)
Web Service com `npm install` / `npm start` e as variáveis `DATABASE_URL` (Neon) e `JWT_SECRET`.
Depois do primeiro deploy, torne sua conta master com o `UPDATE` acima.

## Séries, temporadas e episódios
Rodar uma vez: `npm run db:init -- migracao_series.sql` (depois de `migracao.sql`).

| Rota | O que faz |
|---|---|
| `GET /api/series?busca=&ordem=&pagina=` | Explorar séries (média, total de notas, nº de temporadas) |
| `GET /api/series/:id` | Série com temporadas e episódios, histograma, reviews e o que o perfil logado já fez |
| `GET /api/series/episodio/:id` | Página de um episódio (`id` = `titulo.id`) |
| `POST /api/series` · `/:id/temporadas` · `/temporadas/:id/episodios` | Cadastro (**somente conta master**) |
| `POST /api/series/:id/avaliacoes` · `/watchlist` | `{nota, comentario}` / alterna; sempre com o perfil da sessão |

Telas: `series.html`, `serie.html?id=`, `episodio.html?id=` (+ `css/series.css`).
