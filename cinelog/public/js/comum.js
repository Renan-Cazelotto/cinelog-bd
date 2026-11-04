// Funções compartilhadas pelas três páginas (carregue este arquivo primeiro).
const $ = (sel, raiz = document) => raiz.querySelector(sel);

// Escapa texto vindo do banco antes de usar em innerHTML (evita XSS).
const esc = (t) => String(t ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Perfil "logado" (fase simples: escolhido no cabeçalho e guardado no navegador).
const Perfil = {
  id() { try { return localStorage.getItem('perfil') || ''; } catch { return ''; } },
  salvar(id) { try { localStorage.setItem('perfil', id); } catch { /* ignora */ } },
};

// fetch + JSON; transforma erros da API em exceções com a mensagem do servidor.
async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro || 'Algo deu errado. Tente de novo.');
  return dados;
}

const estrelas = (n) => { const r = Math.round(Number(n) || 0); return '★'.repeat(r) + '☆'.repeat(5 - r); };
const notaFmt = (n) => (n == null ? '–' : Number(n).toFixed(1));
const dataFmt = (d) => new Date(d).toLocaleDateString('pt-BR');
const hue = (txt) => [...String(txt)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

// Pôster: imagem se existir; senão um bloco colorido gerado a partir do título.
function posterHtml(f) {
  if (f.poster_url) return `<div class="poster"><img src="${esc(f.poster_url)}" alt="Pôster de ${esc(f.nome)}" loading="lazy"></div>`;
  const h = hue(f.nome);
  return `<div class="poster" role="img" aria-label="Sem pôster: ${esc(f.nome)}" style="background:linear-gradient(160deg,hsl(${h} 50% 34%),hsl(${(h + 55) % 360} 55% 16%))">${esc(f.nome)}</div>`;
}

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

// Preenche o seletor de perfil do cabeçalho. `aoMudar` roda quando o usuário troca de perfil.
async function iniciarCabecalho(aoMudar) {
  const sel = $('#perfil-atual');
  const link = $('#link-perfil');
  const atualizarLink = () => { link.href = Perfil.id() ? `perfil.html?id=${Perfil.id()}` : 'perfil.html'; };
  try {
    const perfis = await api('/api/perfis');
    if (!perfis.some((p) => String(p.id) === Perfil.id()) && perfis.length) Perfil.salvar(String(perfis[0].id));
    sel.innerHTML = perfis.length
      ? perfis.map((p) => `<option value="${p.id}" ${String(p.id) === Perfil.id() ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')
      : '<option value="">(nenhum perfil)</option>';
  } catch (e) { aviso(e.message); }
  atualizarLink();
  sel.addEventListener('change', () => { Perfil.salvar(sel.value); atualizarLink(); if (aoMudar) aoMudar(); });
}
