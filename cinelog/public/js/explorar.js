// Tela Explorar: filtros, grade de pôsteres, "carregar mais" e cadastro de filme.
const POR_PAGINA = 48;   // igual ao `limite` da rota GET /api/filmes
let pagina = 1;
let exibidos = 0;

async function carregar(recomecar = true) {
  if (recomecar) { pagina = 1; exibidos = 0; $('#grade').innerHTML = ''; }
  const params = new URLSearchParams({
    busca: $('#busca').value, genero: $('#genero').value, ordem: $('#ordem').value, pagina,
  });
  try {
    const filmes = await api('/api/filmes?' + params);
    exibidos += filmes.length;
    $('#grade').insertAdjacentHTML('beforeend', filmes.map((f) =>
      cardFilme(f, `<span class="estrelas" aria-label="Nota média ${notaFmt(f.nota_media)} de 5">${f.total ? estrelas(f.nota_media) : ''}</span>`)).join(''));
    $('#contagem').textContent = exibidos
      ? `${exibidos} ${exibidos === 1 ? 'filme' : 'filmes'}${filmes.length === POR_PAGINA ? ' (há mais)' : ''}`
      : 'Nenhum filme encontrado. Tente outra busca ou adicione um filme novo.';
    $('#mais').hidden = filmes.length < POR_PAGINA;
  } catch (e) { aviso(e.message); }
}

// ---- Eventos ----
let atraso;
$('#busca').addEventListener('input', () => { clearTimeout(atraso); atraso = setTimeout(carregar, 300); });
['#genero', '#ordem'].forEach((s) => $(s).addEventListener('change', () => carregar()));
$('#filtros').addEventListener('submit', (e) => e.preventDefault());
$('#mais').addEventListener('click', () => { pagina += 1; carregar(false); });

$('#btn-novo').addEventListener('click', () => $('#dlg-novo').showModal());
$('#cancelar-novo').addEventListener('click', () => $('#dlg-novo').close());

$('#form-novo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const c = f.elements;   // acesso por nome do campo (mais robusto que f.nome)
  const marcados = [...f.querySelectorAll('input[name=genero]:checked')].map((i) => i.value);
  const generos = [...marcados, ...c.outros_generos.value.split(',')];
  try {
    const novo = await api('/api/filmes', { method: 'POST', body: {
      nome: c.nome.value, estudio: c.estudio.value, ano_de_lancamento: c.ano_de_lancamento.value,
      duracao: c.duracao.value, classificacao_indicativa: c.classificacao_indicativa.value,
      descricao: c.descricao.value, poster_url: c.poster_url.value,
      diretores: c.diretores.value, elenco: c.elenco.value, generos,
    } });
    location.href = `filme.html?id=${novo.id}`;   // vai direto para a página do filme criado
  } catch (err) { $('#erro-novo').textContent = err.message; }
});

// ---- Inicialização ----
(async function iniciar() {
  await iniciarCabecalho();
  try {
    const generos = await api('/api/generos');
    $('#genero').insertAdjacentHTML('beforeend', generos.map((g) => `<option>${esc(g.nome)}</option>`).join(''));
    $('#lista-generos').innerHTML = generos.map((g) =>
      `<label><input type="checkbox" name="genero" value="${esc(g.nome)}"> ${esc(g.nome)}</label>`).join('');
  } catch (e) { aviso(e.message); }
  carregar();
})();
