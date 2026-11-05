// Página da série: dados, temporadas com episódios, nota/histograma, watchlist, avaliação e reviews.
const idSerie = new URLSearchParams(location.search).get('id');
let notaEscolhida = 0;      // nota selecionada no formulário (0 = nenhuma)
let temporadaAlvo = null;   // id da temporada que receberá o novo episódio

const rotuloWatchlist = (on) => (on ? '✓ Na watchlist' : '+ Watchlist');
const souMaster = () => !!(SESSAO && SESSAO.conta.master);   // só master cadastra temporada/episódio

async function carregar() {
  try {
    const s = await api(`/api/series/${encodeURIComponent(idSerie)}`);
    document.title = `${s.nome} – CineLog`;
    render(s);
  } catch (e) {
    $('#conteudo').innerHTML = `<p class="erro">${esc(e.message)}</p><p><a href="series.html">Voltar às séries</a></p>`;
  }
}

function htmlTemporada(t) {
  const eps = t.episodios.length;
  return `
    <details class="temporada" open>
      <summary><strong>${esc(t.nome)}</strong>
        <span class="suave">${esc(t.ano_de_lancamento)} · ${eps} ${eps === 1 ? 'episódio' : 'episódios'}</span></summary>
      ${t.descricao ? `<p class="suave">${esc(t.descricao)}</p>` : ''}
      ${eps ? `<ol class="episodios">${t.episodios.map((e) => `
        <li><a href="episodio.html?id=${e.id}">
          <span class="num">${esc(e.numero ?? '')}</span>
          <span class="mini" style="background:${fundoPoster(e.nome)}">${e.poster_url
            ? `<img src="${esc(e.poster_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
          <span>${esc(e.nome)}</span>
          <span class="suave">${esc(e.duracao)} min</span></a></li>`).join('')}</ol>`
        : '<p class="suave">Nenhum episódio ainda.</p>'}
      ${souMaster() ? `<button type="button" data-novo-ep="${t.id}" data-temporada="${esc(t.nome)}">+ Episódio</button>` : ''}
    </details>`;
}

function render(s) {
  const meu = s.meu || {};
  const minha = s.reviews.find((r) => String(r.id_perfil) === String(SESSAO.perfil.id));
  notaEscolhida = meu.minha_nota || 0;
  const maior = Math.max(1, ...s.histograma.map((h) => h.total));

  const painelAvaliar = `
    <div class="acoes">
      <button type="button" data-acao="watchlist" aria-pressed="${!!meu.na_watchlist}">${rotuloWatchlist(meu.na_watchlist)}</button>
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
    ${posterHtml(s)}
    <div>
      <h1>${esc(s.nome)}</h1>
      <p class="dirigido">${s.temporadas.length} ${s.temporadas.length === 1 ? 'temporada' : 'temporadas'}</p>
      <p class="sinopse">${esc(s.descricao)}</p>

      <div class="duas-colunas">
        <section class="painel" aria-label="Nota média">
          <div class="media">${notaFmt(s.nota_media)} <small>/ 5 · ${s.total_avaliacoes} ${s.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}</small></div>
          <div class="histograma" aria-label="Distribuição das notas">
            ${s.histograma.slice().reverse().map((h) => `
              <div><span>${h.nota} ★</span><span class="barra"><span style="width:${(h.total / maior) * 100}%"></span></span><span>${h.total}</span></div>`).join('')}
          </div>
        </section>
        <section class="painel" aria-label="Sua avaliação">${painelAvaliar}</section>
      </div>

      <div class="secao">
        <div class="cab-secao"><h2>Temporadas</h2>${souMaster() ? '<button type="button" id="btn-temporada">+ Temporada</button>' : ''}</div>
        ${s.temporadas.length ? s.temporadas.map(htmlTemporada).join('') : '<p class="suave">Nenhuma temporada cadastrada ainda.</p>'}
      </div>

      <div class="secao">
        <h2>Avaliações</h2>
        ${s.reviews.length ? `<ul class="avaliacoes">${s.reviews.map((r) => `
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

// ---- Eventos da página (delegados: o HTML é redesenhado a cada carregar) ----
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
      const r = await api(`/api/series/${idSerie}/watchlist`, { method: 'POST' });
      acao.setAttribute('aria-pressed', r.ativo);
      acao.textContent = rotuloWatchlist(r.ativo);
    } catch (err) { aviso(err.message); }
    return;
  }
  if (e.target.closest('#btn-temporada')) {
    $('#form-temporada').reset(); $('#erro-temporada').textContent = '';
    $('#dlg-temporada').showModal();
    return;
  }
  const novoEp = e.target.closest('[data-novo-ep]');
  if (novoEp) {
    temporadaAlvo = novoEp.dataset.novoEp;
    $('#titulo-episodio').textContent = `Novo episódio · ${novoEp.dataset.temporada}`;
    $('#form-episodio').reset(); $('#erro-episodio').textContent = '';
    $('#dlg-episodio').showModal();
  }
});

$('#conteudo').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!notaEscolhida) { $('#erro-aval').textContent = 'Escolha de 1 a 5 estrelas.'; return; }
  try {
    await api(`/api/series/${idSerie}/avaliacoes`, { method: 'POST', body: {
      nota: notaEscolhida, comentario: e.target.elements.comentario.value,
    } });
    aviso('Avaliação salva');
    carregar();
  } catch (err) { $('#erro-aval').textContent = err.message; }
});

// ---- Diálogos (ficam fora do #conteudo, então os eventos são ligados uma vez só) ----
document.querySelectorAll('dialog [data-fechar]').forEach((b) =>
  b.addEventListener('click', () => b.closest('dialog').close()));

$('#form-temporada').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = e.target.elements;
  try {
    await api(`/api/series/${idSerie}/temporadas`, { method: 'POST', body: {
      nome: c.nome.value, ano_de_lancamento: c.ano_de_lancamento.value, descricao: c.descricao.value,
    } });
    $('#dlg-temporada').close();
    aviso('Temporada criada');
    carregar();
  } catch (err) { $('#erro-temporada').textContent = err.message; }
});

$('#form-episodio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = e.target.elements;
  try {
    await api(`/api/series/temporadas/${temporadaAlvo}/episodios`, { method: 'POST', body: {
      nome: c.nome.value, estudio: c.estudio.value, ano_de_lancamento: c.ano_de_lancamento.value,
      duracao: c.duracao.value, classificacao_indicativa: c.classificacao_indicativa.value,
      descricao: c.descricao.value, poster_url: c.poster_url.value,
      diretores: c.diretores.value, elenco: c.elenco.value,
    } });
    $('#dlg-episodio').close();
    aviso('Episódio criado');
    carregar();
  } catch (err) { $('#erro-episodio').textContent = err.message; }
});

iniciarCabecalho().then(carregar);
