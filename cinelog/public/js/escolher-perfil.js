// Depois do login: o usuário escolhe um dos perfis DA SUA CONTA (ou cria um novo).
const IMAGENS = ['img1', 'img2', 'img3', 'img4'];
const MAX_PERFIS = 5;   // igual ao limite do servidor

async function carregar() {
  const [eu, perfis] = await Promise.all([api('/api/auth/eu'), api('/api/auth/perfis')]);
  $('#conta-nome').textContent = eu.conta.nome;
  $('#perfis').innerHTML = perfis.map((p) => `
    <button type="button" class="perfil-card" data-id="${p.id}">
      ${avatar(p.nome, p.imagem_de_perfil, true)}
      <strong>${esc(p.nome)}</strong><small class="suave">${esc(p.tipo)}</small>
    </button>`).join('') + (perfis.length < MAX_PERFIS ? `
    <button type="button" class="perfil-card" id="btn-novo-perfil">
      <span class="avatar grande mais" aria-hidden="true">+</span><strong>Novo perfil</strong>
    </button>` : '');
  if (perfis.length === 0) abrirFormulario();   // conta sem perfil: já abre o formulário
}

function abrirFormulario() { $('#form-perfil').hidden = false; $('#form-perfil').elements.nome.focus(); }

$('#perfis').addEventListener('click', async (e) => {
  if (e.target.closest('#btn-novo-perfil')) return abrirFormulario();
  const card = e.target.closest('[data-id]');
  if (!card) return;
  try {
    await api('/api/auth/perfil', { method: 'POST', body: { id: Number(card.dataset.id) } });
    location.href = 'index.html';
  } catch (err) { aviso(err.message); }
});

$('#cancelar-perfil').addEventListener('click', () => { $('#form-perfil').hidden = true; });

$('#imagens').innerHTML = IMAGENS.map((img, i) => `
  <label class="opcao-avatar"><input type="radio" name="imagem_de_perfil" value="${img}" ${i === 0 ? 'checked' : ''}>
  ${avatar('?', img)}</label>`).join('');

$('#form-perfil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = e.target.elements;
  try {
    const novo = await api('/api/auth/perfis', { method: 'POST', body: {
      nome: c.nome.value, tipo: c.tipo.value, imagem_de_perfil: e.target.querySelector('input[name=imagem_de_perfil]:checked').value,
    } });
    await api('/api/auth/perfil', { method: 'POST', body: { id: novo.id } });   // já entra no perfil criado
    location.href = 'index.html';
  } catch (err) { $('#erro-perfil').textContent = err.message; }
});

$('#btn-sair').addEventListener('click', async () => {
  await api('/api/auth/saida', { method: 'POST' }).catch(() => {});
  location.href = 'login.html';
});

carregar().catch((e) => aviso(e.message));
