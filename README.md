# CineLog

Um espaço para registrar e avaliar filmes e séries, no estilo Letterboxd. Cada pessoa entra com a sua conta, escolhe um dos perfis (até cinco por conta) e guarda ali as próprias notas, curtidas e a lista de títulos que quer assistir.

**Acesse o site:** https://cinelog-bd.onrender.com

Projeto de Banco de Dados II, construído sobre o banco de dados de streaming que criamos em Banco de Dados I.

## Para que serve

Em vez de mostrar tabelas soltas, o CineLog responde perguntas que fazem sentido para quem gosta de cinema:

- Quais filmes têm as melhores notas? Quais são de um gênero específico?
- O que outras pessoas acharam de um filme e como as notas se distribuem?
- Quais séries existem, com quantas temporadas e episódios?
- O que eu já avaliei, quanto tempo de filme isso soma e quais são meus gêneros favoritos?

Além de consultar, dá para inserir dados: avaliar com nota e comentário, curtir, salvar na watchlist e criar perfis. Contas **master** também cadastram filmes, séries, temporadas e episódios.

O **perfil infantil** só enxerga conteúdo com classificação livre. Uma série só aparece para ele se todos os seus episódios forem livres.

## Como o banco é usado

As telas são alimentadas por consultas com junção de tabelas, agregações e filtros, por exemplo:

- **Explorar filmes:** `filme`, `titulo` e `avalia_filme`, com média e total de notas, busca por título, filtro por gênero e ordenação.
- **Página do filme:** diretores, elenco e gêneros reunidos numa só linha, histograma de notas e as reviews com o nome de quem avaliou.
- **Perfil:** estatísticas calculadas a partir das avaliações e os gêneros mais avaliados.
- **Séries:** a hierarquia série, temporada e episódio, com notas e reviews.

## Tecnologias

Node.js e Express no servidor, PostgreSQL hospedado no Neon, HTML, CSS e JavaScript puro no front-end, e publicação no Render. A senha é guardada com bcrypt e o login usa um cookie de sessão.

## Rodando localmente

Você precisa do Node.js 18 ou superior e de um banco PostgreSQL (usamos o Neon).

```bash
git clone https://github.com/Renan-Cazelotto/cinelog-bd.git
cd cinelog-bd/cinelog
npm install
```

Crie um arquivo `.env` dentro de `cinelog/`:

```
DATABASE_URL=a connection string do seu banco
JWT_SECRET=um segredo qualquer com pelo menos 16 caracteres
```

Prepare o banco. Se ele estiver vazio:

```bash
npm run db:init -- streaming.sql migracao.sql migracao_series.sql
```

Se ele já tiver as tabelas de `streaming.sql`, rode só as migrações:

```bash
npm run db:init -- migracao.sql migracao_series.sql
```

Depois é só iniciar com `npm run dev` e abrir http://localhost:3000.

## Conta master

Para cadastrar filmes e séries, crie uma conta pelo site e rode no banco:

```sql
UPDATE conta SET master = true WHERE email = 'seu@email.com';
```

## Publicação no Render

Web Service com a pasta raiz `cinelog`, comando de build `npm install`, comando de início `npm start` e as variáveis `DATABASE_URL` e `JWT_SECRET`.

## Créditos

Pôsteres via TMDB. *This product uses the TMDB API but is not endorsed or certified by TMDB.*

Autores: Renan Cazelotto e _(demais integrantes)_.
