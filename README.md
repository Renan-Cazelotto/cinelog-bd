## Conta padrão  !!!IMPORTANTE!!!

Contas de usuários comuns, que não podem adicionar filmes, séries, temporadas e episódios, apenas avaliações e curtidas. Algumas contas de teste:\
  -*Login*: beatriz@email.com          *Senha*: bia456\
  -*Login*: carlos.lima@email.com      *Senha*: carlos123\
  -*Login*: diego.fer@email.com        *Senha*: diego123\
  -*Login*: fernanda@email.com         *Senha*: fer12345

## Conta master  !!!IMPORTANTE!!!

Nenhuma conta é master por padrão, então pelo já atribuímos isso a uma para realizar os testes: \
*Login*: alessandro@email.com\
*Senha*: senha123

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

## Créditos

Pôsteres via TMDB pegos manualmente.

Autores: Renan Cazelotto e Nívea Batoni.
