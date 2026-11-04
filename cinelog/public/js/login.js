// Tela de login e cadastro de CONTA. Depois de entrar, o usuário escolhe um perfil da conta.
const abas = { entrar: ['#aba-entrar', '#painel-entrar'], cadastro: ['#aba-cadastro', '#painel-cadastro'] };
function mostrar(qual) {
  for (const [nome, [aba, painel]] of Object.entries(abas)) {
    $(aba).setAttribute('aria-selected', nome === qual);
    $(painel).hidden = nome !== qual;
  }
}
$('#aba-entrar').addEventListener('click', () => mostrar('entrar'));
$('#aba-cadastro').addEventListener('click', () => mostrar('cadastro'));

$('#painel-entrar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = e.target.elements;
  try {
    await api('/api/auth/login', { method: 'POST', body: { email: c.email.value, senha: c.senha.value } });
    location.href = 'escolher-perfil.html';
  } catch (err) { $('#erro-entrar').textContent = err.message; }
});

$('#painel-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = e.target.elements;
  try {
    await api('/api/auth/cadastro', { method: 'POST', body: {
      nome: c.nome.value, email: c.email.value, telefone: c.telefone.value, senha: c.senha.value, plano: c.plano.value,
    } });
    location.href = 'escolher-perfil.html';   // conta criada e já logada: falta criar/escolher o perfil
  } catch (err) { $('#erro-cadastro').textContent = err.message; }
});

(async function iniciar() {
  // Já está logado? Vai direto para o site.
  try { await api('/api/auth/eu'); location.href = 'index.html'; return; } catch { /* não logado: segue na tela */ }

  try {
    const planos = await api('/api/auth/planos');
    $('#plano').innerHTML = planos.length
      ? planos.map((p) => `<option value="${esc(p.nome_do_plano)}">${esc(p.nome_do_plano)} · ${p.numero_de_telas} telas · R$ ${Number(p.valor).toFixed(2).replace('.', ',')}</option>`).join('')
      : '<option value="">Nenhum plano cadastrado</option>';
  } catch (e) { aviso(e.message); }
})();
