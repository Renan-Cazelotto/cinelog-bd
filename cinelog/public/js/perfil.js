// Página de perfil: estatísticas, gêneros favoritos e abas Avaliados / Watchlist.
const idParam = new URLSearchParams(location.search).get('id');

async function carregar() {
  const id = idParam || Perfil.id();
  if (!id) {
    $('#conteudo').innerHTML = '<p class="suave">Escolha um perfil no topo da página.</p>';
    return;
  }
  try {
    const base = `/api/perfis/${encodeURIComponent(id)}`;
    const [p, avaliados, watchlist] = await Promise.all([api(base), api(base + '/avaliacoes'), api(base + '/watchlist')]);
    document.title = `${p.nome} – CineLog`;
    render(p, avaliados, watchlist);
  } catch (e) {
    $('#conteudo').innerHTML = `<p class="erro">${esc(e.message)}</p><p><a href="index.html">Voltar aos filmes</a></p>`;
  }
}

function render(p, avaliados, watchlist) {
  const horas = Math.round(p.minutos_assistidos / 60);
  const stats = [
    [p.filmes_avaliados, 'Avaliados'],
    [notaFmt(p.media_das_notas), 'Nota média'],
    [horas + ' h', 'Assistidas'],
    [p.curtidos, 'Curtidos'],
    [p.na_watchlist, 'Na watchlist'],
  ];
  $('#conteudo').innerHTML = `
    <div class="perfil-topo">
      ${avatar(p.nome, p.imagem_de_perfil, true)}
      <div>
        <h1>${esc(p.nome)}</h1>
        <span class="chip">${esc(p.tipo)}</span>
      </div>
    </div>

    <div class="estatisticas">
      ${stats.map(([v, r]) => `<div class="painel"><strong>${esc(v)}</strong><span class="suave">${r}</span></div>`).join('')}
    </div>

    ${p.generos_favoritos.length ? `<p><span class="suave">Gêneros mais avaliados: </span>
      ${p.generos_favoritos.map((g) => `<span class="chip">${esc(g.genero)} · ${g.total}</span>`).join('')}</p>` : ''}

    <div class="abas" role="tablist">
      <button role="tab" id="aba-aval" aria-selected="true" aria-controls="painel-aval">Avaliados (${avaliados.length})</button>
      <button role="tab" id="aba-wl" aria-selected="false" aria-controls="painel-wl">Watchlist (${watchlist.length})</button>
    </div>

    <section id="painel-aval" role="tabpanel" aria-labelledby="aba-aval">
      ${avaliados.length ? `<div class="grade">${avaliados.map((f) =>
        cardFilme(f, `<span class="estrelas" aria-label="${f.nota} de 5">${estrelas(f.nota)}</span>`)).join('')}</div>`
        : '<p class="suave">Ainda não avaliou nenhum filme.</p>'}
    </section>
    <section id="painel-wl" role="tabpanel" aria-labelledby="aba-wl" hidden>
      ${watchlist.length ? `<div class="grade">${watchlist.map((f) => cardFilme(f)).join('')}</div>`
        : '<p class="suave">A watchlist está vazia.</p>'}
    </section>`;

  document.querySelectorAll('.abas [role=tab]').forEach((aba) => aba.addEventListener('click', () => {
    const queroAval = aba.id === 'aba-aval';
    $('#aba-aval').setAttribute('aria-selected', queroAval);
    $('#aba-wl').setAttribute('aria-selected', !queroAval);
    $('#painel-aval').hidden = !queroAval;
    $('#painel-wl').hidden = queroAval;
  }));
}

// Se a página mostra "o perfil escolhido" (sem ?id=), trocar o perfil no topo recarrega.
iniciarCabecalho(() => { if (!idParam) carregar(); }).then(carregar);
