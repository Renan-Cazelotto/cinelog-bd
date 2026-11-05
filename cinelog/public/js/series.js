// Tela Explorar séries: busca, ordenação, grade de pôsteres, "carregar mais" e cadastro de série.
const POR_PAGINA = 48;   // igual ao `limite` da rota GET /api/series
let pagina = 1;
let exibidos = 0;

function cardSerie(s) {
  const temps = s.temporadas === 1 ? '1 temporada' : `${s.temporadas} temporadas`;
  return `<a class="card" href="serie.html?id=${s.id}">
    ${posterHtml(s)}
    <span class="card-info"><strong>${esc(s.nome)}</strong>
    <span class="suave">${temps}</span>
    <span class="estrelas" aria-label="Nota média ${notaFmt(s.nota_media)} de 5">${s.total ? estrelas(s.nota_media) : ''}</span></span></a>`;
}

async function carregar(recomecar = true) {
  if (recomecar) { pagina = 1; exibidos = 0; $('#grade').innerHTML = ''; }
  const params = new URLSearchParams({ busca: $('#busca').value, ordem: $('#ordem').value, pagina });
  try {
    const series = await api('/api/series?' + params);
    exibidos += series.length;
    $('#grade').insertAdjacentHTML('beforeend', series.map(cardSerie).join(''));
    $('#contagem').textContent = exibidos
      ? `${exibidos} ${exibidos === 1 ? 'série' : 'séries'}${series.length === POR_PAGINA ? ' (há mais)' : ''}`
      : `Nenhuma série encontrada. Tente outra busca${SESSAO.conta.master ? ' ou adicione uma série nova' : ''}.`;
    $('#mais').hidden = series.length < POR_PAGINA;
  } catch (e) { aviso(e.message); }
}

// ---- Eventos ----
let atraso;
$('#busca').addEventListener('input', () => { clearTimeout(atraso); atraso = setTimeout(carregar, 300); });
$('#ordem').addEventListener('change', () => carregar());
$('#filtros').addEventListener('submit', (e) => e.preventDefault());
$('#mais').addEventListener('click', () => { pagina += 1; carregar(false); });

$('#btn-novo').addEventListener('click', () => { $('#erro-novo').textContent = ''; $('#dlg-novo').showModal(); });
document.querySelectorAll('dialog [data-fechar]').forEach((b) =>
  b.addEventListener('click', () => b.closest('dialog').close()));

$('#form-novo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = e.target.elements;
  try {
    const nova = await api('/api/series', { method: 'POST', body: {
      nome: c.nome.value, descricao: c.descricao.value, poster_url: c.poster_url.value,
    } });
    location.href = `serie.html?id=${nova.id}`;   // vai direto para a página da série criada
  } catch (err) { $('#erro-novo').textContent = err.message; }
});

iniciarCabecalho().then((sessao) => {
  $('#btn-novo').hidden = !sessao.conta.master;   // só conta master vê (o servidor também exige)
  carregar();
});
