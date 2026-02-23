/* Capsule Tasting UI — local-only, stores data in localStorage.
   Design language: dark luxe + gold accents, card grid, sticky filters.
*/

const STORAGE_KEY = 'capsule_tasting_v1';

const DEFAULT_TAGS = [
  'chocolatey','nutty','caramel','fruity','floral','citrus','spicy','woody',
  'sweet','bitter','acidic','smooth','creamy','bold','light','roasty'
];

const SEED_CATALOG = [
  // minimal seed; you can import the full catalog from ./nespresso-original-catalog.json
  { id: 'original:arpeggio', name: 'Arpeggio', system: 'original', type: 'espresso', intensity: 9, tags: ['ispirazione italiana'] },
  { id: 'original:volluto', name: 'Volluto', system: 'original', type: 'espresso', intensity: 4, tags: ['espresso'] },
  { id: 'original:roma', name: 'Roma', system: 'original', type: 'espresso', intensity: 8, tags: ['ispirazione italiana'] },
];

function nowISODate(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

function clamp(n, min, max){
  const x = Number(n);
  if(Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function normalizeTasting(t){
  if(!t || typeof t !== 'object') return null;
  return {
    ...t,
    rating: clamp(t.rating ?? 0, 0, 5),
    acidity: clamp(t.acidity ?? 0, 0, 5),
    bitterness: clamp(t.bitterness ?? 0, 0, 5),
    aroma: clamp(t.aroma ?? 0, 0, 5),
    intensity: t.intensity == null ? null : clamp(t.intensity, 0, 13),
  };
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { catalog: SEED_CATALOG, tastings: [] };
    const parsed = JSON.parse(raw);
    const catalogRaw = Array.isArray(parsed.catalog) ? parsed.catalog : SEED_CATALOG;
    const catalog = dedupeCatalog(catalogRaw);
    const tastingsRaw = Array.isArray(parsed.tastings) ? parsed.tastings : [];
    const tastings = tastingsRaw.map(normalizeTasting).filter(Boolean);
    return { catalog, tastings };
  }catch{
    return { catalog: SEED_CATALOG, tastings: [] };
  }
}

function save(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

async function autoLoadCatalogIfEmpty(){
  // If the user has only the tiny seed catalog (or nothing), auto-load Nespresso catalog once.
  const hasRealCatalog = Array.isArray(state.catalog) && state.catalog.length > 10;
  const alreadyAutoLoaded = localStorage.getItem('capsule_tasting_autoloaded_v1') === '1';
  if(hasRealCatalog || alreadyAutoLoaded) return false;

  // Ensure there's an initial state to expand from.
  if(!Array.isArray(state.catalog) || state.catalog.length === 0){
    state = { catalog: SEED_CATALOG, tastings: Array.isArray(state.tastings) ? state.tastings : [] };
  }

  try{
    const res = await fetch('./nespresso-original-catalog.json', { cache: 'no-store' });
    if(!res.ok) throw new Error(`catalog fetch failed (${res.status})`);
    const parsed = await res.json();
    const incomingRaw = Array.isArray(parsed.catalog) ? parsed.catalog : [];
    if(incomingRaw.length === 0) throw new Error('empty catalog');

    // normalize + replace
    const incoming = normalizeCatalog(incomingRaw);
    state = { catalog: dedupeCatalog(incoming), tastings: state.tastings };
    save(state);
    localStorage.setItem('capsule_tasting_autoloaded_v1', '1');
    return true;
  }catch(e){
    // Best-effort debug breadcrumb
    try{ localStorage.setItem('capsule_tasting_autoload_error_v1', String(e)); }catch(_){/* ignore */}
    return false;
  }
}

// Elements
const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const q = document.getElementById('q');
const system = document.getElementById('system');
const type = document.getElementById('type');
const intensity = document.getElementById('intensity');
const intensityVal = document.getElementById('intensityVal');
const sort = document.getElementById('sort');
const resetFilters = document.getElementById('resetFilters');

const tagFilter = document.getElementById('tagFilter');

const modal = document.getElementById('modal');
const addBtn = document.getElementById('addBtn');
const form = document.getElementById('form');

const capsuleName = document.getElementById('capsuleName');
const capsuleSystem = document.getElementById('capsuleSystem');
const capsuleType = document.getElementById('capsuleType');
const capsuleIntensity = document.getElementById('capsuleIntensity');
const capsuleNotes = document.getElementById('capsuleNotes');
const capsuleAcidity = document.getElementById('capsuleAcidity');
const capsuleBitterness = document.getElementById('capsuleBitterness');
const capsuleAroma = document.getElementById('capsuleAroma');
const acidityVal = document.getElementById('acidityVal');
const bitternessVal = document.getElementById('bitternessVal');
const aromaVal = document.getElementById('aromaVal');

const capsuleRating = document.getElementById('capsuleRating');
const ratingVal = document.getElementById('ratingVal');
const capsuleDate = document.getElementById('capsuleDate');

const tagPicker = document.getElementById('tagPicker');

const loadNespressoBtn = document.getElementById('loadNespressoBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const wipeBtn = document.getElementById('wipeBtn');

// Views (catalog vs detail/log/stats)
const viewCatalog = document.getElementById('viewCatalog');
const viewDetail = document.getElementById('viewDetail');
const viewLog = document.getElementById('viewLog');
const viewStats = document.getElementById('viewStats');

const backBtn = document.getElementById('backBtn');
const detailTitle = document.getElementById('detailTitle');
const detailMeta = document.getElementById('detailMeta');
const barIntensity = document.getElementById('barIntensity');
const valIntensity = document.getElementById('valIntensity');
const detailTastings = document.getElementById('detailTastings');
const detailLogBtn = document.getElementById('detailLogBtn');

// Log view
const logList = document.getElementById('logList');
const logNewBtn = document.getElementById('logNewBtn');

// Stats view
const statsBlocks = document.getElementById('statsBlocks');

let ui = {
  query: '',
  system: 'original',
  type: 'all',
  minIntensity: 0,
  sort: 'featured',
  tagOn: new Set(),
};

function getMyStatsByCapsuleId(){
  const m = new Map();
  for(const t of state.tastings){
    const arr = m.get(t.capsuleId) || [];
    arr.push(t);
    m.set(t.capsuleId, arr);
  }
  const out = new Map();
  for(const [id, arr] of m.entries()){
    const avg = arr.reduce((s,x)=>s+(x.rating||0),0)/arr.length;
    const last = arr.map(x=>x.date).sort().at(-1);
    out.set(id, { count: arr.length, avgRating: avg, lastDate: last });
  }
  return out;
}

function dedupeCatalog(catalog){
  // Prevent exact duplicates of the same capsule concept (same system + same name)
  // while keeping the first seen ID stable.
  const normName = (s)=>String(s||'').trim().toLowerCase();
  const out = [];
  const byKey = new Map();

  for(const c of (catalog||[])){
    if(!c || !c.name) continue;
    const system = c.system || 'original';
    const key = `${system}:${normName(c.name)}`;
    const prev = byKey.get(key);
    if(!prev){
      const copy = { ...c, system };
      byKey.set(key, copy);
      out.push(copy);
    }else{
      // merge: keep existing id, merge missing fields
      const merged = {
        ...prev,
        ...c,
        id: prev.id || c.id,
        name: prev.name || c.name,
        system,
        tags: Array.from(new Set([...(prev.tags||[]), ...(c.tags||[])])),
      };
      // keep the object reference in out by mutating
      Object.assign(prev, merged);
    }
  }
  return out;
}

function uniqTags(){
  const s = new Set(DEFAULT_TAGS);
  for(const c of state.catalog){
    (c.tags||[]).forEach(t=>s.add(t));
  }
  for(const t of state.tastings){
    (t.tags||[]).forEach(x=>s.add(x));
  }
  return Array.from(s).sort((a,b)=>a.localeCompare(b));
}

function renderTagDropdown(container, tags, setRef, {onChange}={}){
  container.innerHTML = '';

  for(const tag of tags){
    const id = `tag-${container.id}-${tag}`.replace(/[^a-z0-9:_-]/gi,'-');

    const row = document.createElement('div');
    row.className = 'checkRow';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = setRef.has(tag);

    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = tag;

    cb.addEventListener('change', ()=>{
      if(cb.checked) setRef.add(tag);
      else setRef.delete(tag);
      if(typeof onChange === 'function') onChange();
    });

    row.appendChild(cb);
    row.appendChild(lab);
    container.appendChild(row);
  }
}

function matchCapsule(c){
  const text = `${c.name} ${(c.tags||[]).join(' ')}`.toLowerCase();
  const qq = ui.query.trim().toLowerCase();
  if(qq && !text.includes(qq)) return false;

  // Original-only app
  if(c.system !== 'original') return false;

  // Optional filters (UI may hide them, but logic stays safe)
  if(ui.type !== 'all' && c.type !== ui.type) return false;
  if(ui.minIntensity > 0 && (c.intensity||0) < ui.minIntensity) return false;
  if(ui.tagOn.size){
    const set = new Set(c.tags||[]);
    for(const t of ui.tagOn) if(!set.has(t)) return false;
  }
  return true;
}

function getSorted(list){
  const stats = getMyStatsByCapsuleId();
  const arr = [...list];
  switch(ui.sort){
    case 'intensity_desc':
      arr.sort((a,b)=>(b.intensity||0)-(a.intensity||0));
      break;
    case 'intensity_asc':
      arr.sort((a,b)=>(a.intensity||0)-(b.intensity||0));
      break;
    case 'rating_desc':
      arr.sort((a,b)=>((stats.get(b.id)?.avgRating||-1) - (stats.get(a.id)?.avgRating||-1)));
      break;
    case 'recent':
      arr.sort((a,b)=>((stats.get(b.id)?.lastDate||'') > (stats.get(a.id)?.lastDate||'') ? 1 : -1));
      break;
    default:
      // featured: stable-ish
      arr.sort((a,b)=>a.name.localeCompare(b.name));
  }
  return arr;
}

function cardEl(c){
  const stats = getMyStatsByCapsuleId().get(c.id);
  const el = document.createElement('article');
  el.className = 'card';
  el.role = 'listitem';

  const avg = stats ? stats.avgRating : null;
  const count = stats ? stats.count : 0;

  el.innerHTML = `
    <div class="card__hero">
      <div class="badge">ORIGINAL • Intensity ${c.intensity ?? '—'}</div>
    </div>
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(c.name)}</h3>
      <div class="card__meta">
        <span class="tag">${labelType(c.type)}</span>
        ${c.collection ? `<span class="tag">${escapeHtml(c.collection)}</span>` : ''}
      </div>
    </div>
    <div class="card__footer">
      <div>
        <div class="rating">${avg===null ? '—' : `${avg.toFixed(1)}/5`}</div>
        <div class="small">${count ? `${count} tasting${count>1?'s':''}` : 'Not tasted yet'}</div>
      </div>
      <button class="btn btn--secondary" type="button">Log</button>
    </div>
  `;

  const btn = el.querySelector('button');
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); openModal(c); });

  // Single click opens the product-like detail page
  el.addEventListener('click', ()=>openDetail(c));
  return el;
}

function labelType(t){
  switch(t){
    case 'espresso': return 'Espresso';
    case 'lungo': return 'Lungo';
    case 'ristretto': return 'Ristretto';
    case 'milk': return 'With milk';
    default: return t;
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

function setView(name){
  viewCatalog.hidden = name !== 'catalog';
  viewDetail.hidden = name !== 'detail';
  viewLog.hidden = name !== 'log';
  viewStats.hidden = name !== 'stats';
}

function showCatalog(){
  setView('catalog');
}

function showDetail(){
  setView('detail');
}

function showLog(){
  setView('log');
}

function showStats(){
  setView('stats');
}

function render(){
  if(intensityVal) intensityVal.textContent = ui.minIntensity === 0 ? 'Any' : `≥ ${ui.minIntensity}`;

  const filtered = state.catalog.filter(matchCapsule);
  const sorted = getSorted(filtered);

  grid.innerHTML = '';
  for(const c of sorted){
    grid.appendChild(cardEl(c));
  }

  empty.hidden = sorted.length !== 0;
}

function openModal(capsule){
  modal.setAttribute('aria-hidden','false');
  modal.dataset.capsuleId = capsule?.id || '';

  // seed form
  capsuleName.value = capsule?.name || '';
  capsuleSystem.value = 'original';
  capsuleType.value = capsule?.type || 'espresso';
  capsuleIntensity.value = capsule?.intensity ?? 8;

  capsuleAcidity.value = 3;
  capsuleBitterness.value = 3;
  capsuleAroma.value = 4;
  acidityVal.textContent = '3/5';
  bitternessVal.textContent = '3/5';
  aromaVal.textContent = '4/5';

  capsuleNotes.value = '';
  capsuleRating.value = 4;
  ratingVal.textContent = '4/5';
  capsuleDate.value = nowISODate();

  // tag picker
  const tags = uniqTags();
  const chosen = new Set();
  renderTagDropdown(tagPicker, tags, chosen);
  tagPicker.dataset.bind = '1';
  tagPicker._chosen = chosen;

  setTimeout(()=>capsuleName.focus(), 0);
}

function closeModal(){
  modal.setAttribute('aria-hidden','true');
  modal.dataset.capsuleId = '';
}

let currentDetailId = null;

function openDetail(c){
  if(!c) return;
  currentDetailId = c.id;
  const stats = getMyStatsByCapsuleId().get(c.id);

  detailTitle.textContent = c.name;
  detailMeta.innerHTML = `
    <span class="tag">${labelType(c.type)}</span>
    <span class="tag">Original</span>
    ${c.collection ? `<span class="tag">${escapeHtml(c.collection)}</span>` : ''}
  `;

  const pct = Math.round(((c.intensity||0) / 13) * 100);
  barIntensity.style.width = `${pct}%`;
  valIntensity.textContent = String(c.intensity ?? '—');

  // recent tastings for this capsule
  const list = state.tastings
    .filter(t=>t.capsuleId === c.id)
    .sort((a,b)=> (a.date < b.date ? 1 : -1))
    .slice(0,6);

  detailTastings.innerHTML = '';
  if(list.length === 0){
    const div = document.createElement('div');
    div.className = 'empty';
    div.innerHTML = `<div class="empty__title">Not tasted yet</div><div class="empty__sub">Log your first tasting for ${escapeHtml(c.name)}.</div>`;
    detailTastings.appendChild(div);
  }else{
    for(const t of list){
      const row = document.createElement('div');
      row.className = 'tastingItem';
      row.innerHTML = `
        <div class="tastingItem__left">
          <div class="tastingItem__title">${t.rating ?? '—'}/5 • ${escapeHtml(t.date)}</div>
          <div class="tastingItem__sub">Acidity ${t.acidity ?? '—'}/5 · Bitterness ${t.bitterness ?? '—'}/5 · Aroma ${t.aroma ?? '—'}/5</div>
        </div>
        <div class="tastingItem__right">
          <div class="small">${(t.tags||[]).slice(0,3).map(escapeHtml).join(' · ')}</div>
        </div>
      `;
      detailTastings.appendChild(row);
    }
  }

  detailLogBtn.onclick = ()=>openModal(c);

  showDetail();
  history.replaceState(null,'', `#capsule/${encodeURIComponent(c.id)}`);
}

function ensureCapsuleInCatalog({ name, system, type, intensity, tags }){
  // Catalog entries should be treated as product data (not edited during tasting log).
  // If the capsule isn't found, we create a minimal entry, but we do NOT overwrite existing product fields.
  const norm = String(name||'').trim().toLowerCase();
  let cap = state.catalog.find(c=>String(c.name||'').trim().toLowerCase() === norm && c.system === system);
  if(!cap){
    cap = {
      id: `${system}:${norm}`.replaceAll(/[^a-z0-9:_-]/g,'-'),
      name: String(name||'').trim(),
      system,
      type,
      intensity: clampInt(intensity, 0, 13),
      tags: Array.from(new Set(tags||[])).slice(0,12),
    };
    state.catalog.push(cap);
  }else{
    // Only merge tags from tasting into catalog (optional), never change product attributes.
    cap.tags = Array.from(new Set([...(cap.tags||[]), ...(tags||[])]));
  }
  return cap;
}

function clampInt(v, min, max){
  const n = Number(v);
  if(Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function renderLog(){
  if(!logList) return;
  const items = [...(state.tastings||[])].sort((a,b)=> (a.date < b.date ? 1 : -1));
  logList.innerHTML = '';

  if(items.length === 0){
    const div = document.createElement('div');
    div.className = 'empty';
    div.innerHTML = `<div class="empty__title">No tastings yet</div><div class="empty__sub">Log your first capsule to start building your history.</div>`;
    logList.appendChild(div);
    return;
  }

  for(const t of items){
    const row = document.createElement('div');
    row.className = 'tastingItem';
    row.innerHTML = `
      <div class="tastingItem__left">
        <div class="tastingItem__title">${escapeHtml(t.name)} — ${(t.rating ?? '—')}/5</div>
        <div class="tastingItem__sub">${escapeHtml(t.date)} · Acidity ${t.acidity ?? '—'}/5 · Bitterness ${t.bitterness ?? '—'}/5 · Aroma ${t.aroma ?? '—'}/5</div>
      </div>
      <div class="tastingItem__right">
        <button class="btn btn--secondary" type="button">Open</button>
      </div>
    `;

    row.querySelector('button')?.addEventListener('click', ()=>{
      const cap = state.catalog.find(c=>c.id===t.capsuleId) || { id: t.capsuleId, name: t.name, type: t.type, intensity: t.intensity, collection: null };
      setActiveTopNav('catalog');
      openDetail(cap);
    });

    logList.appendChild(row);
  }
}

function renderStats(){
  if(!statsBlocks) return;
  const tastings = state.tastings||[];
  const total = tastings.length;
  const avg = total ? (tastings.reduce((s,x)=>s+(x.rating||0),0)/total) : null;
  const unique = new Set(tastings.map(t=>t.capsuleId)).size;

  statsBlocks.innerHTML = '';
  const blocks = [
    {title:'Total tastings', val: String(total)},
    {title:'Unique capsules', val: String(unique)},
    {title:'Average rating', val: avg==null ? '—' : `${avg.toFixed(1)}/5`},
  ];

  for(const b of blocks){
    const row = document.createElement('div');
    row.className = 'tastingItem';
    row.innerHTML = `<div class="tastingItem__left"><div class="tastingItem__title">${escapeHtml(b.title)}</div><div class="tastingItem__sub">&nbsp;</div></div><div class="tastingItem__right"><div class="rating">${escapeHtml(b.val)}</div></div>`;
    statsBlocks.appendChild(row);
  }
}

function setActiveTopNav(view){
  for(const b of document.querySelectorAll('.topnav .chip')){
    b.classList.toggle('chip--active', b.dataset.view === view);
  }
}

function navigateView(view){
  if(view === 'catalog'){
    setActiveTopNav('catalog');
    showCatalog();
    render();
    return;
  }
  if(view === 'log'){
    setActiveTopNav('log');
    showLog();
    renderLog();
    return;
  }
  if(view === 'stats'){
    setActiveTopNav('stats');
    showStats();
    renderStats();
    return;
  }
}

// Events
q.addEventListener('input', (e)=>{ ui.query = e.target.value; navigateView('catalog'); });

// Filters might be removed from the UI; guard listeners.
if(type) type.addEventListener('change', (e)=>{ ui.type = e.target.value; navigateView('catalog'); });
if(intensity) intensity.addEventListener('input', (e)=>{ ui.minIntensity = Number(e.target.value); navigateView('catalog'); });
if(sort) sort.addEventListener('change', (e)=>{ ui.sort = e.target.value; navigateView('catalog'); });

for(const b of document.querySelectorAll('.topnav .chip')){
  b.addEventListener('click', ()=>navigateView(b.dataset.view));
}

backBtn.addEventListener('click', ()=>{
  currentDetailId = null;
  setActiveTopNav('catalog');
  showCatalog();
  history.replaceState(null,'', '#');
});

if(resetFilters){
  resetFilters.addEventListener('click', ()=>{
    ui = { query:'', system:'original', type:'all', minIntensity:0, sort:'featured', tagOn: new Set() };
    q.value = '';
    if(system) system.value = 'original';
    if(type) type.value = 'all';
    if(intensity) intensity.value = 0;
    if(sort) sort.value = 'featured';
    if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});
    render();
  });
}

if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});

if(addBtn) addBtn.addEventListener('click', ()=>openModal(null));
logNewBtn?.addEventListener('click', ()=>openModal(null));

capsuleAcidity.addEventListener('input', ()=>{ acidityVal.textContent = `${capsuleAcidity.value}/5`; });
capsuleBitterness.addEventListener('input', ()=>{ bitternessVal.textContent = `${capsuleBitterness.value}/5`; });
capsuleAroma.addEventListener('input', ()=>{ aromaVal.textContent = `${capsuleAroma.value}/5`; });

capsuleRating.addEventListener('input', ()=>{
  ratingVal.textContent = `${capsuleRating.value}/5`;
});

modal.addEventListener('click', (e)=>{
  if(e.target?.dataset?.close === '1') closeModal();
});

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
});

form.addEventListener('submit', (e)=>{
  e.preventDefault();

  const chosen = tagPicker._chosen ? Array.from(tagPicker._chosen) : [];

  const cap = ensureCapsuleInCatalog({
    name: capsuleName.value,
    system: capsuleSystem.value,
    type: capsuleType.value,
    intensity: capsuleIntensity.value,
    tags: chosen,
  });

  // Defensive: if fields are readonly/disabled, prefer existing catalog values.
  const capType = cap?.type || capsuleType.value;
  const capIntensity = cap?.intensity ?? Number(capsuleIntensity.value);

  state.tastings.push({
    id: crypto.randomUUID(),
    capsuleId: cap.id,
    name: cap.name,
    system: cap.system,
    type: capType,
    intensity: capIntensity,

    acidity: clampInt(capsuleAcidity.value, 0, 5),
    bitterness: clampInt(capsuleBitterness.value, 0, 5),
    aroma: clampInt(capsuleAroma.value, 0, 5),

    rating: clampInt(capsuleRating.value, 0, 5),
    notes: capsuleNotes.value.trim(),
    tags: chosen,
    date: capsuleDate.value,
    createdAt: new Date().toISOString(),
  });

  save(state);
  closeModal();
  if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});

  // If the user is currently viewing this capsule's detail page, refresh it.
  if(currentDetailId && currentDetailId === cap.id && !viewDetail.hidden){
    openDetail(cap);
  }else{
    render();
  }
});

if(exportBtn){
  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capsule-tasting-export-${nowISODate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

if(importInput){
  importInput.addEventListener('change', async ()=>{
    const f = importInput.files?.[0];
    if(!f) return;
    try{
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      if(!parsed || typeof parsed !== 'object') throw new Error('bad json');
      state = {
        catalog: dedupeCatalog(Array.isArray(parsed.catalog) ? parsed.catalog : state.catalog),
        tastings: (Array.isArray(parsed.tastings) ? parsed.tastings : state.tastings).map(normalizeTasting).filter(Boolean),
      };
      save(state);
      if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});
      render();
    }catch(err){
      alert('Import failed: ' + err.message);
    }finally{
      importInput.value = '';
    }
  });
}

function normalizeDrinkTypeFromName(name){
  const n = (name||'').toLowerCase();
  if(n.includes('lungo')) return 'lungo';
  if(n.includes('ristretto')) return 'ristretto';
  if(n.includes('espresso')) return 'espresso';
  return null;
}

function normalizeCatalog(incoming){
  // Merge duplicates by capsule name (Nespresso page repeats some capsules in promo sections).
  const normName = (s)=>String(s||'').trim().toLowerCase();
  const m = new Map();

  for(const c of incoming){
    if(!c || !c.name) continue;
    const key = normName(c.name);
    const prev = m.get(key);

    const inferredType = normalizeDrinkTypeFromName(c.name) || normalizeDrinkTypeFromName(prev?.name) || c.type || prev?.type || 'espresso';
    const collections = new Set([...(prev?.collections||[]), ...(prev?.collection?[prev.collection]:[]), ...(c.collections||[]), ...(c.collection?[c.collection]:[])]
      .filter(Boolean));

    const merged = {
      ...(prev||{}),
      ...c,
      // stable ID: include normalized name only (one capsule concept), not collection
      id: `original:${key}`.replace(/[^a-z0-9:_-]/g,'-'),
      system: 'original',
      type: inferredType,
      // Keep the best intensity we have
      intensity: (c.intensity ?? prev?.intensity) ?? null,
      // Prefer a non-null price if any
      pricePerCapsuleEUR: (c.pricePerCapsuleEUR ?? prev?.pricePerCapsuleEUR) ?? null,
      // Store a primary collection but also keep all of them
      collection: c.collection || prev?.collection || null,
      collections: Array.from(collections),
      // Merge tags
      tags: Array.from(new Set([...(prev?.tags||[]), ...(c.tags||[])])),
    };

    // Force type inference from final name (fixes cases like "Tokyo Lungo" coming in as espresso).
    merged.type = normalizeDrinkTypeFromName(merged.name) || merged.type || 'espresso';

    m.set(key, merged);
  }

  return Array.from(m.values());
}

async function loadNespressoCatalog({mode}={mode:'merge'}){
  // mode: merge | replace
  const url = './nespresso-original-catalog.json';
  const res = await fetch(url, { cache: 'no-store' });
  if(!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  const parsed = await res.json();

  const incomingRaw = Array.isArray(parsed.catalog) ? parsed.catalog : [];
  if(incomingRaw.length === 0) throw new Error('Catalog file was empty or invalid');

  const incoming = normalizeCatalog(incomingRaw);

  if(mode === 'replace'){
    state = { catalog: incoming, tastings: state.tastings };
  }else{
    const byId = new Map(state.catalog.map(c=>[c.id,c]));
    for(const c of incoming){
      if(!c || !c.id) continue;
      byId.set(c.id, { ...byId.get(c.id), ...c });
    }
    state = { catalog: Array.from(byId.values()), tastings: state.tastings };
  }

  save(state);
  if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});
  showCatalog();
  render();
}

if(loadNespressoBtn){
  loadNespressoBtn.addEventListener('click', async ()=>{
    try{
      const hasExisting = state.catalog && state.catalog.length > 10;
      const mode = hasExisting
        ? (confirm('Replace your current catalog with the Nespresso catalog?\n\nOK = Replace\nCancel = Merge') ? 'replace' : 'merge')
        : 'replace';

      await loadNespressoCatalog({mode});
      localStorage.setItem('capsule_tasting_autoloaded_v1', '1');
      alert(`Loaded Nespresso catalog (${state.catalog.length} items).`);
    }catch(err){
      alert('Load failed: ' + err.message);
    }
  });
}

if(wipeBtn){
  wipeBtn.addEventListener('click', ()=>{
    const ok = confirm('Clear all local data (catalog + tastings)? This cannot be undone.');
    if(!ok) return;
    state = { catalog: SEED_CATALOG, tastings: [] };
    save(state);
    if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});
    showCatalog();
    render();
  });
}

// Initial render
render();

// Auto-load catalog on first run (best-effort)
autoLoadCatalogIfEmpty().then((did)=>{
  if(did) render();
});

// Small UX polish: upgrade tag list when data changes
window.addEventListener('storage', (e)=>{
  if(e.key === STORAGE_KEY){
    state = load();
    if(tagFilter) renderTagDropdown(tagFilter, uniqTags(), ui.tagOn, {onChange: ()=>{ showCatalog(); render(); }});
    render();
  }
});
