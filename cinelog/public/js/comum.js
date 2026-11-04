// Funções compartilhadas pelas três páginas (carregue este arquivo primeiro).
const $ = (sel, raiz = document) => raiz.querySelector(sel);

// Escapa texto vindo do banco antes de usar em innerHTML (evita XSS).
const esc = (t) => String(t ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// fetch + JSON; transforma erros da API em exceções com a mensagem do servidor.
async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const dados = await res.json().catch(() => ({}));
  // Sessão ausente/expirada: volta para a tela de login (menos na própria tela de login).
  if (res.status === 401 && !location.pathname.endsWith('login.html')) {
    location.href = 'login.html';
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!res.ok) throw new Error(dados.erro || 'Algo deu errado. Tente de novo.');
  return dados;
}

const estrelas = (n) => { const r = Math.round(Number(n) || 0); return '★'.repeat(r) + '☆'.repeat(5 - r); };
const notaFmt = (n) => (n == null ? '–' : Number(n).toFixed(1));
const dataFmt = (d) => new Date(d).toLocaleDateString('pt-BR');
const hue = (txt) => [...String(txt)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

// Pôster: usa a imagem de titulo.poster_url quando existir; senão (ou se a imagem não carregar)
// mostra um bloco colorido gerado a partir do título.
function fundoPoster(nome) {
  const h = hue(nome);
  return `linear-gradient(160deg,hsl(${h} 50% 34%),hsl(${(h + 55) % 360} 55% 16%))`;
}
function posterHtml(f) {
  if (f.poster_url) {
    // referrerpolicy evita bloqueio de "hotlink" por alguns servidores de imagem
    return `<div class="poster"><img src="${esc(f.poster_url)}" alt="Pôster de ${esc(f.nome)}" data-nome="${esc(f.nome)}" loading="lazy" referrerpolicy="no-referrer"></div>`;
  }
  return `<div class="poster" role="img" aria-label="Sem pôster: ${esc(f.nome)}" style="background:${fundoPoster(f.nome)}">${esc(f.nome)}</div>`;
}
// Se uma imagem de pôster falhar (link quebrado, sem internet), troca pelo bloco colorido.
// O evento "error" de <img> não borbulha, por isso usamos a fase de captura (true).
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.closest('.poster')) return;
  const caixa = img.closest('.poster');
  const nome = img.dataset.nome || '';
  caixa.style.background = fundoPoster(nome);
  caixa.setAttribute('role', 'img');
  caixa.setAttribute('aria-label', 'Sem pôster: ' + nome);
  caixa.textContent = nome;
}, true);

// Card da grade. `linha` é o texto/HTML sob o título (ex.: estrelas).
function cardFilme(f, linha = '') {
  return `<a class="card" href="filme.html?id=${f.id}">
    ${posterHtml(f)}
    <span class="card-info"><strong>${esc(f.nome)}</strong>
    <span class="suave">${esc(f.ano_de_lancamento ?? '')}</span> ${linha}</span></a>`;
}

const HUES_AVATAR = { img1: 20, img2: 160, img3: 210, img4: 290 };
function avatar(nome, imagem, grande = false) {
  const h = HUES_AVATAR[imagem] ?? hue(nome);
  return `<span class="avatar ${grande ? 'grande' : ''}" aria-hidden="true" style="background:hsl(${h} 50% 38%)">${esc(String(nome)[0]?.toUpperCase() || '?')}</span>`;
}

let avisoTimer;
function aviso(texto) {
  const el = $('#aviso');
  el.textContent = texto;
  el.classList.add('visivel');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('visivel'), 2800);
}

// Dados de quem está logado ({ conta: {nome, email, master}, perfil: {...} | null }), preenchido por iniciarCabecalho().
let SESSAO = null;

// Confere o login, preenche o cabeçalho e devolve a sessão. Sem perfil escolhido, leva à tela de escolha.
async function iniciarCabecalho() {
  SESSAO = await api('/api/auth/eu');
  if (!SESSAO.perfil) {
    location.href = 'escolher-perfil.html';
    return new Promise(() => {});   // interrompe o restante da página enquanto redireciona
  }
  const p = SESSAO.perfil;
  const link = $('#link-perfil');
  if (link) link.href = `perfil.html?id=${p.id}`;
  $('#usuario').innerHTML = `
    ${avatar(p.nome, p.imagem_de_perfil)} <span>${esc(p.nome)}</span>
    ${SESSAO.conta.master ? '<span class="chip" title="Conta com permissão para adicionar filmes">Master</span>' : ''}
    <a href="escolher-perfil.html">Trocar perfil</a>
    <button type="button" id="btn-sair">Sair</button>`;
  $('#btn-sair').addEventListener('click', async () => {
    await api('/api/auth/saida', { method: 'POST' }).catch(() => {});
    location.href = 'login.html';
  });
  return SESSAO;
}
