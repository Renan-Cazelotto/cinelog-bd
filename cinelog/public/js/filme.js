// Página do filme: dados, histograma, ações (watchlist/curtir), avaliação e reviews.
const idFilme = new URLSearchParams(location.search).get('id');
let notaEscolhida = 0;   // nota selecionada no formulário (0 = nenhuma)

const rotuloWatchlist = (on) => (on ? '✓ Na watchlist' : '+ Watchlist');
const rotuloCurtir = (on) => (on ? '♥ Curtido' : '♡ Curtir');

async function carregar() {
  try {
    const f = await api(`/api/filmes/${encodeURIComponent(idFilme)}`);
    document.title = `${f.nome} (${f.ano_de_lancamento}) – CineLog`;
    render(f);
  } catch (e) {
    $('#conteudo').innerHTML = `<p class="erro">${esc(e.message)}</p><p><a href="index.html">Voltar aos filmes</a></p>`;
  }
}

function render(f) {
  const meu = f.meu || {};
  const minha = f.reviews.find((r) => String(r.id_perfil) === String(SESSAO.perfil.id));
  notaEscolhida = meu.minha_nota || 0;
  const maior = Math.max(1, ...f.histograma.map((h) => h.total));

  const painelAvaliar = `
    <div class="acoes">
      <button type="button" data-acao="watchlist" aria-pressed="${!!meu.na_watchlist}">${rotuloWatchlist(meu.na_watchlist)}</button>
      <button type="button" data-acao="curtir" aria-pressed="${!!meu.curtido}">${rotuloCurtir(meu.curtido)}</button>
    </div>
    <form class="form-aval" id="form-aval">
      <div id="seletor" class="seletor-estrelas" role="group" aria-label="Sua nota">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-nota="${n}" aria-label="${n} ${n === 1 ? 'estrela' : 'estrelas'}" class="${n <= notaEscolhida ? 'ligada' : ''}">★</button>`).join('')}
      </div>
      <label>Sua review (opcional)
        <textarea name="comentario" rows="3">${esc(minha?.comentario || '')}</textarea>
      </label>
      <p class="erro" id="erro-aval" role="alert"></p>
      <button type="submit" class="primario">${meu.minha_nota ? 'Atualizar avaliação' : 'Publicar avaliação'}</button>
    </form>`;

  $('#conteudo').innerHTML = `
  <article class="filme">
    ${posterHtml(f)}
    <div>
      <h1>${esc(f.nome)} <span class="ano">${esc(f.ano_de_lancamento)}</span></h1>
      <p class="dirigido">${f.diretores ? `Dirigido por <strong>${esc(f.diretores)}</strong> · ` : ''}${esc(f.duracao)} min · Classificação ${esc(f.classificacao_indicativa)} · ${esc(f.estudio)}</p>
      <p>${(f.generos || '').split(', ').filter(Boolean).map((g) => `<span class="chip">${esc(g)}</span>`).join('')}</p>
      <p class="sinopse">${esc(f.descricao)}</p>
      ${f.elenco ? `<div class="secao"><h2>Elenco</h2><p class="elenco">${esc(f.elenco)}</p></div>` : ''}

      <div class="duas-colunas">
        <section class="painel" aria-label="Nota média">
          <div class="media">${notaFmt(f.nota_media)} <small>/ 5 · ${f.total_avaliacoes} ${f.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}</small></div>
          <div class="histograma" aria-label="Distribuição das notas">
            ${f.histograma.slice().reverse().map((h) => `
              <div><span>${h.nota} ★</span><span class="barra"><span style="width:${(h.total / maior) * 100}%"></span></span><span>${h.total}</span></div>`).join('')}
          </div>
        </section>
        <section class="painel" aria-label="Sua avaliação">${painelAvaliar}</section>
      </div>

      <div class="secao">
        <h2>Avaliações</h2>
        ${f.reviews.length ? `<ul class="avaliacoes">${f.reviews.map((r) => `
          <li>${avatar(r.perfil)}
            <div>
              <div class="quem">
                <a href="perfil.html?id=${r.id_perfil}"><strong>${esc(r.perfil)}</strong></a>
                <span class="estrelas" aria-label="${r.nota} de 5">${estrelas(r.nota)}</span>
                <span class="suave">${dataFmt(r.criado_em)}</span>
              </div>
              ${r.comentario ? `<p>${esc(r.comentario)}</p>` : ''}
            </div>
          </li>`).join('')}</ul>` : '<p class="suave">Ninguém avaliou ainda. Seja o primeiro!</p>'}
      </div>
    </div>
  </article>`;
}

// ---- Eventos (delegados: o HTML é redesenhado a cada carregar) ----
$('#conteudo').addEventListener('click', async (e) => {
  const estrela = e.target.closest('[data-nota]');
  if (estrela) {
    notaEscolhida = Number(estrela.dataset.nota);
    document.querySelectorAll('#seletor [data-nota]').forEach((b) =>
      b.classList.toggle('ligada', Number(b.dataset.nota) <= notaEscolhida));
    return;
  }
  const acao = e.target.closest('[data-acao]');
  if (acao) {
    try {
      const r = await api(`/api/filmes/${idFilme}/${acao.dataset.acao}`, { method: 'POST' });
      acao.setAttribute('aria-pressed', r.ativo);
      acao.textContent = acao.dataset.acao === 'watchlist' ? rotuloWatchlist(r.ativo) : rotuloCurtir(r.ativo);
    } catch (err) { aviso(err.message); }
  }
});

$('#conteudo').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!notaEscolhida) { $('#erro-aval').textContent = 'Escolha de 1 a 5 estrelas.'; return; }
  try {
    await api(`/api/filmes/${idFilme}/avaliacoes`, { method: 'POST', body: {
      nota: notaEscolhida, comentario: e.target.elements.comentario.value,
    } });
    aviso('Avaliação salva');
    carregar();
  } catch (err) { $('#erro-aval').textContent = err.message; }
});

iniciarCabecalho().then(carregar);
