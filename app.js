const KEY = 'factory-console-v1';
const GATES = [
  ['take', 'The Take', 'Honest assessment done'],
  ['nofake', 'No fake data', 'Zero demo/fake content'],
  ['complement', 'Complement check', 'Feeds the next X product'],
  ['boomerang', 'Boomerang ready', 'Self-heal capable'],
  ['zerocost', '$0 to run', 'Free-only, never pay the rich'],
  ['tap', 'Your tap', 'You approved it'],
  ['pitch', 'The pitch exists', 'Selling job named'],
];

let db = load();
let cur = null; // current market id
let toastTimer;

function load() {
  try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); if (p && Array.isArray(p.markets)) return p; } }
  catch (e) {}
  return { markets: [] };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save.'); } }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(p) { return p + '-' + Date.now().toString(36); }
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200); }
function market() { return db.markets.find(m => m.id === cur); }

function gatesPassed(idea) { return GATES.every(([k]) => idea.gates && idea.gates[k]); }
function ideaStatus(idea) {
  if (idea.shipped) return ['shipped', 'Shipped'];
  if (gatesPassed(idea)) return ['spec', 'Spec ready'];
  const n = GATES.filter(([k]) => idea.gates && idea.gates[k]).length;
  return ['gating', n + '/7 gates'];
}

function render() {
  const nav = document.getElementById('market-nav');
  nav.innerHTML = db.markets.map(m => {
    const specs = m.ideas.filter(gatesPassed).length;
    return `<a class="nav-item ${m.id === cur ? 'active' : ''}" href="#" data-m="${m.id}"><span class="nav-icon">◈</span> ${esc(m.name)} <span class="nav-count">${specs}✓</span></a>`;
  }).join('') || '<div class="dim pad">No markets yet.</div>';

  const totalIdeas = db.markets.reduce((s, m) => s + m.ideas.length, 0);
  const totalSpecs = db.markets.reduce((s, m) => s + m.ideas.filter(gatesPassed).length, 0);
  const shipped = db.markets.reduce((s, m) => s + m.ideas.filter(i => i.shipped).length, 0);
  document.getElementById('home-metrics').innerHTML = `
    <div class="metric"><span class="metric-label">Markets</span><strong>${db.markets.length}</strong></div>
    <div class="metric"><span class="metric-label">Ideas</span><strong>${totalIdeas}</strong></div>
    <div class="metric"><span class="metric-label">Spec ready</span><strong>${totalSpecs}</strong></div>
    <div class="metric"><span class="metric-label">Shipped</span><strong>${shipped}</strong></div>`;

  const m = market();
  document.getElementById('view-home').hidden = !!m;
  document.getElementById('view-market').hidden = !m;
  if (!m) return;
  document.getElementById('m-name').textContent = m.name;
  document.getElementById('m-niche').textContent = m.niche || '';

  document.getElementById('comp-list').innerHTML = m.competitors.map(c => `
    <div class="card">
      <div class="card-head"><strong>${esc(c.name)}</strong>${c.url ? ` <a class="dim" href="${esc(c.url)}" target="_blank" rel="noopener">↗</a>` : ''}
        <span class="card-actions"><button class="btn-small" data-edit-comp="${c.id}">Edit</button><button class="btn-small danger" data-del-comp="${c.id}">×</button></span></div>
      <div class="tear"><span>Money model</span><p>${esc(c.moneyModel) || '<i class="dim">—</i>'}</p></div>
      <div class="tear"><span>Customer engine</span><p>${esc(c.customerEngine) || '<i class="dim">—</i>'}</p></div>
      <div class="tear"><span>Strengths</span><p>${esc(c.strengths) || '<i class="dim">—</i>'}</p></div>
      <div class="tear gap"><span>Gaps (your opening)</span><p>${esc(c.gaps) || '<i class="dim">—</i>'}</p></div>
    </div>`).join('') || '<div class="dim pad">No competitors yet. Add the first one you want to evolve past.</div>';

  document.getElementById('idea-list').innerHTML = m.ideas.map(i => {
    const [sk, sl] = ideaStatus(i);
    return `<div class="card">
      <div class="card-head"><strong>${esc(i.title)}</strong>
        <span class="card-actions"><span class="status st-${sk}">${sl}</span>
        <button class="btn-small" data-edit-idea="${i.id}">Edit</button>
        ${sk === 'spec' ? `<button class="btn-small" data-spec="${i.id}">Spec →</button>` : ''}
        ${!i.shipped && sk === 'spec' ? `<button class="btn-small" data-ship="${i.id}">Ship</button>` : ''}
        <button class="btn-small danger" data-del-idea="${i.id}">×</button></span></div>
      <div class="gates">${GATES.map(([k, label, sub]) => `
        <label class="gate ${i.gates && i.gates[k] ? 'on' : ''}"><input type="checkbox" data-gate="${k}" data-idea="${i.id}" ${i.gates && i.gates[k] ? 'checked' : ''} /><span><strong>${label}</strong><em>${sub}</em></span></label>`).join('')}
      </div>
      ${i.price ? `<div class="tear"><span>Price</span><p>${esc(i.price)}</p></div>` : ''}
      ${i.complements ? `<div class="tear"><span>Complements</span><p>${esc(i.complements)}</p></div>` : ''}
      ${i.sellingJob ? `<div class="tear"><span>Selling job</span><p>${esc(i.sellingJob)}</p></div>` : ''}
    </div>`;
  }).join('') || '<div class="dim pad">No ideas yet. Find a gap, name the evolved version.</div>';
}

function specText(m, i) {
  const gateLines = GATES.map(([k, l]) => `  [${i.gates && i.gates[k] ? 'x' : ' '}] ${l}`).join('\n');
  return `BUILD SPEC — ${i.title}\nMarket: ${m.name}${m.niche ? ' (' + m.niche + ')' : ''}\nPrice: ${i.price || 'TBD'}\nComplements: ${i.complements || 'TBD'}\nSelling job: ${i.sellingJob || 'TBD'}\n\nFireproof gates:\n${gateLines}\n\nNotes: ${i.notes || '—'}\n\nBoomerang: copy → upgrade copy → swap. Never touch live.\nIssued: ${new Date().toLocaleDateString()}`;
}

// --- events ---
document.getElementById('market-nav').addEventListener('click', e => {
  const a = e.target.closest('[data-m]'); if (!a) return;
  e.preventDefault(); cur = a.dataset.m;
  document.getElementById('view-spec').hidden = true; render();
});
document.getElementById('brand-home').addEventListener('click', e => { e.preventDefault(); cur = null; document.getElementById('view-spec').hidden = true; render(); });
document.getElementById('spec-back').addEventListener('click', () => { document.getElementById('view-spec').hidden = true; render(); });

document.getElementById('main').addEventListener('click', e => {
  const t = e.target;
  const gate = t.dataset.gate;
  if (gate) { const i = market().ideas.find(x => x.id === t.dataset.idea); i.gates = i.gates || {}; i.gates[gate] = t.checked; save(); render(); return; }
  if (t.dataset.spec) {
    const m = market(), i = m.ideas.find(x => x.id === t.dataset.spec);
    document.getElementById('spec-text').textContent = specText(m, i);
    document.getElementById('view-market').hidden = true; document.getElementById('view-home').hidden = true;
    document.getElementById('view-spec').hidden = false;
    document.getElementById('spec-copy').onclick = () => { navigator.clipboard.writeText(document.getElementById('spec-text').textContent).then(() => toast('Spec copied.')); };
    return;
  }
  if (t.dataset.ship) { const i = market().ideas.find(x => x.id === t.dataset.ship); i.shipped = true; save(); render(); toast('Shipped. Boomerang watches it now.'); return; }
  if (t.dataset.delComp) { const m = market(); m.competitors = m.competitors.filter(x => x.id !== t.dataset.delComp); save(); render(); return; }
  if (t.dataset.delIdea) { const m = market(); m.ideas = m.ideas.filter(x => x.id !== t.dataset.delIdea); save(); render(); return; }
  if (t.dataset.editComp) return openModal('comp', t.dataset.editComp);
  if (t.dataset.editIdea) return openModal('idea', t.dataset.editIdea);
  if (t.id === 'm-delete') { db.markets = db.markets.filter(x => x.id !== cur); cur = null; save(); render(); return; }
  if (t.id === 'add-comp-open') return openModal('comp');
  if (t.id === 'add-idea-open') return openModal('idea');
});
document.getElementById('add-market-open').addEventListener('click', () => openModal('market'));

// --- modal ---
const modal = document.getElementById('modal');
let modalKind = null, modalId = null;
function field(name, label, val, type) {
  if (type === 'area') return `<label>${label}<textarea name="${name}" rows="2">${esc(val)}</textarea></label>`;
  return `<label>${label}<input name="${name}" value="${esc(val)}" /></label>`;
}
function openModal(kind, id) {
  modalKind = kind; modalId = id || null;
  const m = market();
  let title = '', fields = '';
  if (kind === 'market') {
    const o = id ? m : { name: '', niche: '' };
    title = id ? 'Edit market' : 'New market';
    fields = field('name', 'Market name', o.name) + field('niche', 'Niche / notes', o.niche);
  } else if (kind === 'comp') {
    const o = id ? m.competitors.find(x => x.id === id) : {};
    title = id ? 'Edit competitor' : 'Add competitor';
    fields = field('name', 'Name', o.name) + field('url', 'URL', o.url)
      + field('moneyModel', 'Money model', o.moneyModel, 'area')
      + field('customerEngine', 'Customer engine', o.customerEngine, 'area')
      + field('strengths', 'Strengths', o.strengths, 'area')
      + field('gaps', 'Gaps (your opening)', o.gaps, 'area');
  } else {
    const o = id ? m.ideas.find(x => x.id === id) : {};
    title = id ? 'Edit idea' : 'New product idea';
    fields = field('title', 'Product title', o.title) + field('price', 'Price', o.price)
      + field('complements', 'Complements (which X product)', o.complements)
      + field('sellingJob', 'Selling job', o.sellingJob, 'area')
      + field('notes', 'Notes', o.notes, 'area');
  }
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-fields').innerHTML = fields;
  modal.hidden = false;
}
document.getElementById('modal-cancel').addEventListener('click', () => modal.hidden = true);
modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
document.getElementById('modal-form').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const v = n => String(fd.get(n) || '').trim();
  if (modalKind === 'market') {
    if (!v('name')) return;
    if (modalId) { const m = market(); m.name = v('name'); m.niche = v('niche'); }
    else { const m = { id: uid('mkt'), name: v('name'), niche: v('niche'), competitors: [], ideas: [] }; db.markets.unshift(m); cur = m.id; }
  } else if (modalKind === 'comp') {
    const m = market(); if (!v('name')) return;
    const o = { name: v('name'), url: v('url'), moneyModel: v('moneyModel'), customerEngine: v('customerEngine'), strengths: v('strengths'), gaps: v('gaps') };
    if (modalId) Object.assign(m.competitors.find(x => x.id === modalId), o);
    else m.competitors.unshift({ id: uid('cmp'), ...o });
  } else {
    const m = market(); if (!v('title')) return;
    const o = { title: v('title'), price: v('price'), complements: v('complements'), sellingJob: v('sellingJob'), notes: v('notes') };
    if (modalId) Object.assign(m.ideas.find(x => x.id === modalId), o);
    else m.ideas.unshift({ id: uid('idea'), gates: {}, shipped: false, ...o });
  }
  save(); modal.hidden = true; render(); toast('Saved.');
});

render();
