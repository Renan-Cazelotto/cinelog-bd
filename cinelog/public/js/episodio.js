// Página de um episódio (somente leitura): dados, diretores/elenco e link de volta para a série.
const idEpisodio = new URLSearchParams(location.search).get('id');

(async function iniciar() {
  await iniciarCabecalho();
  try {
    const e = await api(`/api/series/episodio/${encodeURIComponent(idEpisodio)}`);
    document.title = `${e.nome} – ${e.nome_da_serie} – CineLog`;
    $('#conteudo').innerHTML = `
      <p class="migalha"><a href="series.html">Séries</a> › <a href="serie.html?id=${e.id_serie}">${esc(e.nome_da_serie)}</a> › ${esc(e.temporada)}</p>
      <article class="filme">
        ${posterHtml(e)}
        <div>
          <h1>${e.numero_episodio ? `<span class="ano">${esc(e.numero_episodio)}.</span> ` : ''}${esc(e.nome)} <span class="ano">${esc(e.ano_de_lancamento)}</span></h1>
          <p class="dirigido">${e.diretores ? `Dirigido por <strong>${esc(e.diretores)}</strong> · ` : ''}${esc(e.duracao)} min · Classificação ${esc(e.classificacao_indicativa)} · ${esc(e.estudio)}</p>
          <p class="sinopse">${esc(e.descricao)}</p>
          ${e.elenco ? `<div class="secao"><h2>Elenco</h2><p class="elenco">${esc(e.elenco)}</p></div>` : ''}
          <p><a href="serie.html?id=${e.id_serie}">← Voltar para ${esc(e.nome_da_serie)}</a></p>
        </div>
      </article>`;
  } catch (err) {
    $('#conteudo').innerHTML = `<p class="erro">${esc(err.message)}</p><p><a href="series.html">Voltar às séries</a></p>`;
  }
})();
