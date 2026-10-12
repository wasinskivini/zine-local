// ---------- Config ----------

const PAGE_DEFS = [
  { key: 'capa',  name: 'CAPA',       max: 2 },
  { key: 'p2',    name: 'PÁG 2',      max: 4 },
  { key: 'p3',    name: 'PÁG 3',      max: 4 },
  { key: 'p4',    name: 'PÁG 4',      max: 4 },
  { key: 'p5',    name: 'PÁG 5',      max: 4 },
  { key: 'p6',    name: 'PÁG 6',      max: 4 },
  { key: 'p7',    name: 'PÁG 7',      max: 4 },
  { key: 'contracapa', name: 'CONTRACAPA', max: 2 },
];

// Reading-order index -> physical position on the printed sheet
// (row 0 = top row, printed upside-down; row 1 = bottom row, right-way up)
const PRINT_MAP = [
  { row: 1, col: 3, rotate: false }, // capa
  { row: 0, col: 3, rotate: true },  // p2
  { row: 0, col: 2, rotate: true },  // p3
  { row: 0, col: 1, rotate: true },  // p4
  { row: 0, col: 0, rotate: true },  // p5
  { row: 1, col: 0, rotate: false }, // p6
  { row: 1, col: 1, rotate: false }, // p7
  { row: 1, col: 2, rotate: false }, // contracapa
];

const POSTER_DEF = { key: 'poster', name: 'PÔSTER (verso da folha)', max: Infinity };

const PRINT_W = 3508; // A4 landscape @ 300dpi
const PRINT_H = 2480;
const PANEL_W = PRINT_W / 4;
const PANEL_H = PRINT_H / 2;

const CSS_PANEL_W = 220; // deve bater com .page-canvas { width } no style.css
const CSS_PANEL_H = CSS_PANEL_W / 0.7071;
const PX_SCALE = CSS_PANEL_W / PANEL_W; // px de tela por px de impressão — vale tanto pros blocos quanto pro pôster

function getPageDef(pageRef) {
  return pageRef === 'poster' ? POSTER_DEF : PAGE_DEFS[pageRef];
}

function getPage(pageRef) {
  return pageRef === 'poster' ? state.poster : state.pages[pageRef];
}

// altura de impressão usada como referência pro tamanho padrão de texto
function refHeight(pageRef) {
  return pageRef === 'poster' ? PRINT_H : PANEL_H;
}

const FONT_OPTIONS = [
  { key: 'elite',   css: "'Special Elite', monospace", label: 'Elite' },
  { key: 'marker',  css: "'Permanent Marker', cursive", label: 'Marcador' },
  { key: 'caveat',  css: "'Caveat', cursive",           label: 'Manuscrita' },
  { key: 'bebas',   css: "'Bebas Neue', sans-serif",    label: 'Cartaz' },
  { key: 'courier', css: "'Courier Prime', monospace",  label: 'Datilo' },
];

const SHAPE_PALETTE = ['#1a1a1a', '#b5471b', '#c9a227', '#4a6b4f', '#3b5b7a', '#faf6ea'];
const SHAPE_KEYS = ['tape', 'torn', 'stamp', 'halftone', 'burst', 'scribble', 'arrow'];

// gera o contorno pontudo de um burst (estrela de pontas afiadas, tipo "POW!" de quadrinho)
function radialPath(points, outerR, innerR, cx = 50, cy = 50) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
  }
  return d + 'Z';
}

// gera uma borda serrilhada de selo postal, com "mordidas" arredondadas ao redor do círculo
function scallopPath(bumps, r, depth, cx = 50, cy = 50) {
  let d = '';
  const step = (Math.PI * 2) / bumps;
  for (let i = 0; i <= bumps; i++) {
    const a = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) {
      d += `M${x.toFixed(2)},${y.toFixed(2)} `;
    } else {
      const aMid = a - step / 2;
      const qx = cx + (r + depth) * Math.cos(aMid);
      const qy = cy + (r + depth) * Math.sin(aMid);
      d += `Q${qx.toFixed(2)},${qy.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)} `;
    }
  }
  return d + 'Z';
}

// gera um retângulo com bordas rasgadas tipo pedaço de papel arrancado
function jaggedRectPath(amp) {
  const pts = [];
  const segsPerEdge = 6;
  function edge(x0, y0, x1, y1, seed) {
    for (let i = 0; i <= segsPerEdge; i++) {
      const t = i / segsPerEdge;
      let x = x0 + (x1 - x0) * t;
      let y = y0 + (y1 - y0) * t;
      if (i > 0 && i < segsPerEdge) {
        const j = Math.sin(t * 11 + seed) * amp;
        if (x0 === x1) x += j; else y += j;
      }
      pts.push([x, y]);
    }
  }
  edge(2, 2, 98, 2, 0.4);
  edge(98, 2, 98, 98, 1.7);
  edge(98, 98, 2, 98, 3.1);
  edge(2, 98, 2, 2, 5.2);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} `;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} `;
  return d + 'Z';
}

// gera uma tira de fita adesiva: topo/base retos, pontas curtas rasgadas
function tapePath(amp) {
  const pts = [[2, 4], [98, 4]];
  const segs = 5;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push([98 + Math.sin(t * 12.3) * amp, 4 + (96 - 4) * t]);
  }
  pts.push([98, 96], [2, 96]);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push([2 + Math.sin(t * 9.7 + 1.5) * amp, 96 - (96 - 4) * t]);
  }
  let d = `M${pts[0][0]},${pts[0][1]} `;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} `;
  return d + 'Z';
}

// gera uma faixa ondulada tipo rabisco de marcador/caneta
function scribblePath() {
  const top = [], bottom = [];
  const freq = (Math.PI * 2 * 2) / 100;
  const amp = 16, half = 9;
  for (let x = 0; x <= 100; x += 5) {
    const cy = 50 + amp * Math.sin(x * freq);
    top.push([x, cy - half]);
    bottom.push([x, cy + half]);
  }
  let d = `M${top[0][0]},${top[0][1].toFixed(1)} `;
  for (let i = 1; i < top.length; i++) d += `L${top[i][0]},${top[i][1].toFixed(1)} `;
  for (let i = bottom.length - 1; i >= 0; i--) d += `L${bottom[i][0]},${bottom[i][1].toFixed(1)} `;
  return d + 'Z';
}

const SHAPE_PATHS = {
  torn: jaggedRectPath(4),
  tape: tapePath(3),
  stamp: scallopPath(16, 42, 6),
  burst: radialPath(10, 48, 20),
  scribble: scribblePath(),
  arrow: 'M2 40 H62 V20 L98 50 L62 80 V60 H2 Z',
};
const HALFTONE_CELL_CSS = 10; // px, referência na escala da tela

// ---------- State ----------

let state = { pages: PAGE_DEFS.map(() => ({ items: [] })), poster: { items: [] } };
let zCounter = 1;
let saveTimer = null;

// ---------- IndexedDB ----------

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('zine-builder', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('state');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveState() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(state, 'main');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}

async function loadState() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readonly');
    const req = tx.objectStore('state').get('main');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Build editor UI ----------

const editorEl = document.getElementById('editor');
const posterEl = document.getElementById('poster-editor');
let idSeq = 1;

function buildPageBlock(pageRef) {
  const def = getPageDef(pageRef);
  const page = getPage(pageRef);
  const isPoster = pageRef === 'poster';

  const pageEl = document.createElement('div');
  pageEl.className = isPoster ? 'page poster-block' : 'page';

  const label = document.createElement('div');
  label.className = 'page-label';
  label.textContent = isPoster ? def.name : `${pageRef + 1} · ${def.name}`;
  pageEl.appendChild(label);

  const isCover = !isPoster && (def.key === 'capa' || def.key === 'contracapa');
  const canvas = document.createElement('div');
  canvas.className = (isPoster ? 'poster-canvas' : 'page-canvas') + (isCover ? ' cover' : '');
  canvas.dataset.pageRef = pageRef;

  if (page.items.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'drop-hint';
    hint.textContent = isPoster
      ? 'arraste fotos para o pôster — é o verso inteiro da folha, revelado quando ela é aberta totalmente'
      : `arraste até ${def.max} foto${def.max > 1 ? 's' : ''}`;
    canvas.appendChild(hint);
  }

  page.items
    .slice()
    .sort((a, b) => zOrder(a) - zOrder(b))
    .forEach(item => canvas.appendChild(renderItem(pageRef, item)));

  setupDropZone(canvas, pageRef);
  pageEl.appendChild(canvas);

  const toolbar = document.createElement('div');
  toolbar.className = 'panel-toolbar';

  const addPhotoBtn = document.createElement('button');
  addPhotoBtn.textContent = '📷 foto';
  addPhotoBtn.onclick = () => openFilePicker(pageRef);

  const addTextBtn = document.createElement('button');
  addTextBtn.textContent = '✎ frase';
  addTextBtn.onclick = () => addTextItem(pageRef);

  const addShapeBtn = document.createElement('button');
  addShapeBtn.textContent = '◆ forma';
  addShapeBtn.onclick = () => addShapeItem(pageRef);

  toolbar.appendChild(addPhotoBtn);
  toolbar.appendChild(addTextBtn);
  toolbar.appendChild(addShapeBtn);
  pageEl.appendChild(toolbar);

  return pageEl;
}

function render() {
  editorEl.innerHTML = '';
  PAGE_DEFS.forEach((def, pageIdx) => editorEl.appendChild(buildPageBlock(pageIdx)));

  posterEl.innerHTML = '';
  posterEl.appendChild(buildPageBlock('poster'));
}

function renderItem(pageRef, item) {
  const el = document.createElement('div');
  el.className = 'item ' + (item.type === 'text' ? 'text-item' : item.type === 'shape' ? 'shape-item' : 'photo');
  el.dataset.id = item.id;
  el.style.left = item.x + '%';
  el.style.top = item.y + '%';
  el.style.width = item.w + '%';
  el.style.height = item.h + '%';
  el.style.zIndex = item.z;

  const visual = document.createElement('div');
  visual.className = 'item-visual';
  visual.style.transform = `rotate(${item.rot}deg)`;
  el.appendChild(visual);

  const bar = document.createElement('div');
  bar.className = 'bar';

  if (item.type === 'text') {
    const fontDef = FONT_OPTIONS.find(f => f.key === item.font) || FONT_OPTIONS[0];
    const textEl = document.createElement('div');
    textEl.className = 'text-content';
    textEl.textContent = item.text || '';
    textEl.style.fontFamily = fontDef.css;
    textEl.style.fontSize = (item.fontSizePx * PX_SCALE) + 'px';
    textEl.style.color = item.color || '#1a1a1a';
    visual.appendChild(textEl);

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      enterEdit(el, textEl, item);
    });

    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.title = 'editar frase';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      enterEdit(el, textEl, item);
    };

    const fontBtn = document.createElement('button');
    fontBtn.textContent = 'Aa';
    fontBtn.title = 'mudar letra (' + fontDef.label + ')';
    fontBtn.onclick = (e) => {
      e.stopPropagation();
      const idx = FONT_OPTIONS.findIndex(f => f.key === item.font);
      item.font = FONT_OPTIONS[(idx + 1) % FONT_OPTIONS.length].key;
      render();
      scheduleSave();
    };

    const sizeDownBtn = document.createElement('button');
    sizeDownBtn.textContent = 'A−';
    sizeDownBtn.title = 'diminuir tamanho';
    sizeDownBtn.onclick = (e) => {
      e.stopPropagation();
      item.fontSizePx = Math.max(20, item.fontSizePx - 10);
      textEl.style.fontSize = (item.fontSizePx * PX_SCALE) + 'px';
      scheduleSave();
    };

    const sizeUpBtn = document.createElement('button');
    sizeUpBtn.textContent = 'A+';
    sizeUpBtn.title = 'aumentar tamanho';
    sizeUpBtn.onclick = (e) => {
      e.stopPropagation();
      item.fontSizePx = Math.min(800, item.fontSizePx + 10);
      textEl.style.fontSize = (item.fontSizePx * PX_SCALE) + 'px';
      scheduleSave();
    };

    const colorBtn = document.createElement('button');
    colorBtn.textContent = '🎨';
    colorBtn.title = 'mudar cor da letra';
    colorBtn.onclick = (e) => {
      e.stopPropagation();
      const idx = SHAPE_PALETTE.indexOf(item.color);
      item.color = SHAPE_PALETTE[(idx + 1) % SHAPE_PALETTE.length];
      textEl.style.color = item.color;
      scheduleSave();
    };

    bar.appendChild(fontBtn);
    bar.appendChild(colorBtn);
    bar.appendChild(sizeDownBtn);
    bar.appendChild(sizeUpBtn);
    bar.appendChild(editBtn);
  } else if (item.type === 'shape') {
    const shapeEl = document.createElement('div');
    shapeEl.className = 'shape-content';
    renderShapeVisual(shapeEl, item);
    visual.appendChild(shapeEl);

    const shapeBtn = document.createElement('button');
    shapeBtn.textContent = '⇆';
    shapeBtn.title = 'mudar forma';
    shapeBtn.onclick = (e) => {
      e.stopPropagation();
      const idx = SHAPE_KEYS.indexOf(item.shape);
      item.shape = SHAPE_KEYS[(idx + 1) % SHAPE_KEYS.length];
      renderShapeVisual(shapeEl, item);
      scheduleSave();
    };

    const colorBtn = document.createElement('button');
    colorBtn.textContent = '🎨';
    colorBtn.title = 'mudar cor';
    colorBtn.onclick = (e) => {
      e.stopPropagation();
      const idx = SHAPE_PALETTE.indexOf(item.color);
      item.color = SHAPE_PALETTE[(idx + 1) % SHAPE_PALETTE.length];
      renderShapeVisual(shapeEl, item);
      scheduleSave();
    };

    bar.appendChild(shapeBtn);
    bar.appendChild(colorBtn);
  } else {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(item.blob);
    visual.appendChild(img);
  }

  const rotBtn = document.createElement('button');
  rotBtn.textContent = '⟳';
  rotBtn.title = 'girar 90°';
  rotBtn.onclick = (e) => {
    e.stopPropagation();
    item.rot = (item.rot + 90) % 360;
    visual.style.transform = `rotate(${item.rot}deg)`;
    scheduleSave();
  };

  const delBtn = document.createElement('button');
  delBtn.textContent = '×';
  delBtn.title = 'remover';
  delBtn.onclick = (e) => {
    e.stopPropagation();
    const page = getPage(pageRef);
    page.items = page.items.filter(p => p.id !== item.id);
    el.remove();
    scheduleSave();
  };

  bar.appendChild(rotBtn);
  bar.appendChild(delBtn);
  el.appendChild(bar);

  const handle = document.createElement('div');
  handle.className = 'handle';
  el.appendChild(handle);

  setupDrag(el, item);
  setupResize(handle, el, item);

  el.addEventListener('pointerdown', () => {
    item.z = ++zCounter;
    el.style.zIndex = item.z;
  });

  return el;
}

// ---------- Edição de texto inline ----------

function enterEdit(el, textEl, item) {
  el.classList.add('editing');
  textEl.contentEditable = 'true';
  textEl.focus();
  document.execCommand('selectAll', false, null);

  function commit() {
    textEl.contentEditable = 'false';
    el.classList.remove('editing');
    item.text = textEl.textContent.trim();
    textEl.removeEventListener('blur', commit);
    textEl.removeEventListener('keydown', onKeydown);
    if (!item.text) {
      const page = [...state.pages, state.poster].find(p => p.items.includes(item));
      if (page) page.items = page.items.filter(p => p.id !== item.id);
      el.remove();
    }
    scheduleSave();
  }

  function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textEl.blur();
    } else if (e.key === 'Escape') {
      textEl.blur();
    }
  }

  textEl.addEventListener('blur', commit);
  textEl.addEventListener('keydown', onKeydown);
}

// ---------- Drag / resize dentro do bloco ----------

function setupDrag(el, item) {
  el.addEventListener('pointerdown', (e) => {
    if (el.classList.contains('editing')) return;
    if (e.target.closest('.bar') || e.target.closest('.handle')) return;
    e.preventDefault();
    const canvas = el.parentElement;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startLeft = item.x, startTop = item.y;

    function onMove(ev) {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      item.x = clamp(startLeft + dxPct, 0, 100 - item.w);
      item.y = clamp(startTop + dyPct, 0, 100 - item.h);
      el.style.left = item.x + '%';
      el.style.top = item.y + '%';
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      scheduleSave();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function setupResize(handle, el, item) {
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = el.parentElement;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startW = item.w, startH = item.h;

    function onMove(ev) {
      const dwPct = ((ev.clientX - startX) / rect.width) * 100;
      const dhPct = ((ev.clientY - startY) / rect.height) * 100;
      item.w = clamp(startW + dwPct, 8, 100 - item.x);
      item.h = clamp(startH + dhPct, 8, 100 - item.y);
      el.style.width = item.w + '%';
      el.style.height = item.h + '%';
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      scheduleSave();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function clamp(v, min, max) {
  if (max < min) max = min;
  return Math.min(max, Math.max(min, v));
}

// ---------- Upload de fotos ----------

function setupDropZone(canvas, pageRef) {
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvas.classList.add('dragover');
  });
  canvas.addEventListener('dragleave', () => canvas.classList.remove('dragover'));
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    canvas.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach(file => addPhoto(pageRef, file));
  });
  canvas.addEventListener('click', (e) => {
    if (e.target !== canvas && e.target.className !== 'drop-hint') return;
    openFilePicker(pageRef);
  });
}

function openFilePicker(pageRef) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = () => Array.from(input.files).forEach(file => addPhoto(pageRef, file));
  input.click();
}

function zOrder(item) {
  // fotos sempre ficam atrás; frases e formas sempre na frente, na ordem de clique/criação
  return (item.type === 'photo' ? 0 : 1) * 1e9 + item.z;
}

function addItem(pageRef, partial) {
  const def = getPageDef(pageRef);
  const page = getPage(pageRef);
  const photoCountBefore = page.items.filter(i => i.type === 'photo').length;

  if (partial.type === 'photo' && photoCountBefore >= def.max) return null;

  let layout;
  if (partial.type === 'text') {
    layout = { x: 15, y: 43, w: 70, h: 14 };
  } else if (partial.type === 'shape') {
    layout = defaultShapeLayout(partial.shape);
  } else {
    layout = autoLayout(photoCountBefore + 1, photoCountBefore);
  }

  const item = Object.assign(
    {
      id: idSeq++, x: layout.x, y: layout.y, w: layout.w, h: layout.h,
      rot: (partial.type === 'shape' && partial.shape === 'tape') ? -6 : 0,
      z: ++zCounter,
    },
    partial
  );
  if (item.type === 'text') {
    if (item.font === undefined) item.font = 'elite';
    if (item.fontSizePx === undefined) item.fontSizePx = (item.h / 100) * refHeight(pageRef) * 0.6;
    if (item.color === undefined) item.color = SHAPE_PALETTE[0];
  }
  page.items.push(item);
  render();
  scheduleSave();
  return item;
}

function addPhoto(pageRef, blob) {
  addItem(pageRef, { type: 'photo', blob });
}

function addTextItem(pageRef) {
  const item = addItem(pageRef, { type: 'text', text: '' });
  if (!item) return;
  const el = (pageRef === 'poster' ? posterEl : editorEl).querySelector(`[data-id="${item.id}"]`);
  const textEl = el && el.querySelector('.text-content');
  if (el && textEl) enterEdit(el, textEl, item);
}

function addShapeItem(pageRef) {
  addItem(pageRef, { type: 'shape', shape: 'tape', color: SHAPE_PALETTE[0] });
}

function defaultShapeLayout(shape) {
  if (shape === 'tape' || shape === 'scribble') return { x: 30, y: 6, w: 40, h: 10 };
  return { x: 32, y: 35, w: 36, h: 30 };
}

function renderShapeVisual(shapeEl, item) {
  shapeEl.innerHTML = '';
  shapeEl.removeAttribute('style');
  shapeEl.style.width = '100%';
  shapeEl.style.height = '100%';
  shapeEl.style.display = 'block';
  if (item.shape === 'halftone') {
    shapeEl.style.backgroundImage = `radial-gradient(circle, ${item.color} 38%, transparent 40%)`;
    shapeEl.style.backgroundSize = `${HALFTONE_CELL_CSS}px ${HALFTONE_CELL_CSS}px`;
  } else {
    const opacity = item.shape === 'tape' || item.shape === 'scribble' ? '0.6' : '1';
    shapeEl.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;opacity:${opacity}"><path d="${SHAPE_PATHS[item.shape]}" fill="${item.color}"/></svg>`;
  }
}

// posição/tamanho inicial (em %) de acordo com quantos itens já existem no bloco
function autoLayout(totalAfterAdd, indexBeforeAdd) {
  if (totalAfterAdd <= 1) return { x: 0, y: 0, w: 100, h: 100 };
  if (totalAfterAdd === 2) {
    return indexBeforeAdd === 0
      ? { x: 0, y: 0, w: 100, h: 50 }
      : { x: 0, y: 50, w: 100, h: 50 };
  }
  if (totalAfterAdd === 3) {
    const slots = [
      { x: 0, y: 0, w: 100, h: 34 },
      { x: 0, y: 34, w: 100, h: 33 },
      { x: 0, y: 67, w: 100, h: 33 },
    ];
    return slots[indexBeforeAdd];
  }
  const slots = [
    { x: 0, y: 0, w: 50, h: 50 },
    { x: 50, y: 0, w: 50, h: 50 },
    { x: 0, y: 50, w: 50, h: 50 },
    { x: 50, y: 50, w: 50, h: 50 },
  ];
  return slots[indexBeforeAdd] || slots[3];
}

// ---------- Export para impressão ----------

function loadImage(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(blob);
  });
}

function drawCover(ctx, img, dx, dy, dw, dh) {
  const ir = img.width / img.height;
  const dr = dw / dh;
  let sx, sy, sw, sh;
  if (ir > dr) {
    sh = img.height;
    sw = sh * dr;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / dr;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawWrappedText(ctx, text, maxWidth, maxHeight, fontPx, fontCss, color) {
  ctx.font = `${fontPx}px ${fontCss || "'Special Elite', monospace"}`;
  ctx.fillStyle = color || '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineHeight = fontPx * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = -totalHeight / 2 + lineHeight / 2;
  lines.forEach((line, i) => ctx.fillText(line, 0, startY + i * lineHeight));
}

async function ensureFontsLoaded() {
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.all(FONT_OPTIONS.map(f => document.fonts.load(`40px ${f.css}`)));
      await document.fonts.ready;
    } catch (e) {}
  }
}

// desenha um item num canvas já posicionado/escalado; pw/ph em px de impressão
async function drawItemToCanvas(ctx, item, pw, ph) {
  if (item.type === 'text') {
    const fontDef = FONT_OPTIONS.find(f => f.key === item.font) || FONT_OPTIONS[0];
    drawWrappedText(ctx, item.text || '', pw * 0.94, ph, item.fontSizePx, fontDef.css, item.color);
  } else if (item.type === 'shape') {
    ctx.fillStyle = item.color;
    if (item.shape === 'halftone') {
      const cell = HALFTONE_CELL_CSS / PX_SCALE;
      const dotR = cell * 0.38;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-pw / 2, -ph / 2, pw, ph);
      ctx.clip();
      for (let gy = -ph / 2; gy < ph / 2; gy += cell) {
        for (let gx = -pw / 2; gx < pw / 2; gx += cell) {
          ctx.beginPath();
          ctx.arc(gx + cell / 2, gy + cell / 2, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else {
      ctx.globalAlpha = (item.shape === 'tape' || item.shape === 'scribble') ? 0.6 : 1;
      const path = new Path2D(SHAPE_PATHS[item.shape]);
      ctx.translate(-pw / 2, -ph / 2);
      ctx.scale(pw / 100, ph / 100);
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }
  } else {
    const img = await loadImage(item.blob);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    drawCover(ctx, img, -pw / 2, -ph / 2, pw, ph);
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  }
}

async function buildPrintCanvas() {
  await ensureFontsLoaded();

  const canvas = document.createElement('canvas');
  canvas.width = PRINT_W;
  canvas.height = PRINT_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PRINT_W, PRINT_H);

  for (let pageIdx = 0; pageIdx < PAGE_DEFS.length; pageIdx++) {
    const pos = PRINT_MAP[pageIdx];
    const page = state.pages[pageIdx];
    const destX = pos.col * PANEL_W;
    const destY = pos.row * PANEL_H;

    ctx.save();
    ctx.translate(destX + PANEL_W / 2, destY + PANEL_H / 2);
    if (pos.rotate) ctx.rotate(Math.PI);
    ctx.translate(-PANEL_W / 2, -PANEL_H / 2);

    // trava qualquer item redimensionado/girado pra fora do bloco, pra não vazar no painel vizinho
    ctx.beginPath();
    ctx.rect(0, 0, PANEL_W, PANEL_H);
    ctx.clip();

    const itemsSorted = page.items.slice().sort((a, b) => zOrder(a) - zOrder(b));
    for (const item of itemsSorted) {
      const px = (item.x / 100) * PANEL_W;
      const py = (item.y / 100) * PANEL_H;
      const pw = (item.w / 100) * PANEL_W;
      const ph = (item.h / 100) * PANEL_H;

      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((item.rot * Math.PI) / 180);
      await drawItemToCanvas(ctx, item, pw, ph);
      ctx.restore();
    }
    ctx.restore();
  }

  drawGuides(ctx);
  return canvas;
}

async function buildPosterCanvas() {
  await ensureFontsLoaded();

  const canvas = document.createElement('canvas');
  canvas.width = PRINT_W;
  canvas.height = PRINT_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PRINT_W, PRINT_H);

  const itemsSorted = state.poster.items.slice().sort((a, b) => zOrder(a) - zOrder(b));
  for (const item of itemsSorted) {
    const px = (item.x / 100) * PRINT_W;
    const py = (item.y / 100) * PRINT_H;
    const pw = (item.w / 100) * PRINT_W;
    const ph = (item.h / 100) * PRINT_H;

    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate((item.rot * Math.PI) / 180);
    await drawItemToCanvas(ctx, item, pw, ph);
    ctx.restore();
  }

  return canvas;
}

function drawGuides(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let c = 1; c < 4; c++) {
    ctx.beginPath();
    ctx.moveTo(c * PANEL_W, 0);
    ctx.lineTo(c * PANEL_W, PRINT_H);
    ctx.stroke();
  }
  // linha de dobra horizontal nas colunas das pontas (dobra, não corte)
  ctx.beginPath();
  ctx.moveTo(0, PANEL_H);
  ctx.lineTo(PANEL_W, PANEL_H);
  ctx.moveTo(3 * PANEL_W, PANEL_H);
  ctx.lineTo(4 * PANEL_W, PANEL_H);
  ctx.stroke();

  // linha de corte no meio (colunas 2 e 3)
  ctx.strokeStyle = 'rgba(180,30,10,0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(PANEL_W, PANEL_H);
  ctx.lineTo(3 * PANEL_W, PANEL_H);
  ctx.stroke();
  ctx.restore();
}

// ---------- Botões ----------

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }, 'image/png');
}

document.getElementById('btn-export-zine').addEventListener('click', async () => {
  const canvas = await buildPrintCanvas();
  downloadCanvas(canvas, 'meu-zine.png');
});

document.getElementById('btn-export-poster').addEventListener('click', async () => {
  const canvas = await buildPosterCanvas();
  downloadCanvas(canvas, 'meu-poster.png');
});

// Gera o PDF direto em JS com jsPDF (sem passar pelo window.print()/CSS de
// paginação do navegador — era isso que fragmentava as imagens em várias
// páginas e às vezes saía em retrato). Cada canvas já é A4 paisagem, então
// cada um vira uma página do PDF, do tamanho exato da folha.
document.getElementById('btn-pdf').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'gerando PDF…';
  try {
    const [zineCanvas, posterCanvas] = await Promise.all([buildPrintCanvas(), buildPosterCanvas()]);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    pdf.addImage(zineCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH);
    pdf.addPage('a4', 'landscape');
    pdf.addImage(posterCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH);

    pdf.save('meu-zine-e-poster.pdf');
  } catch (err) {
    console.error('Falha ao gerar PDF:', err);
    alert('Deu erro ao gerar o PDF. Tenta de novo — se continuar, me avisa.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (!confirm('Apagar todas as fotos e frases de todos os blocos (zine e pôster)?')) return;
  state = { pages: PAGE_DEFS.map(() => ({ items: [] })), poster: { items: [] } };
  render();
  scheduleSave();
});

// ---------- Boot ----------

(async function init() {
  try {
    const saved = await loadState();
    if (saved) {
      if (!saved.poster) saved.poster = { items: [] };

      // migração: versões antigas guardavam "photos" em vez de "items"
      function migrateItems(p, heightRef) {
        if (!p.items && p.photos) {
          p.items = p.photos.map(ph => Object.assign({ type: 'photo' }, ph));
          delete p.photos;
        }
        if (!p.items) p.items = [];
        p.items.forEach(it => {
          if (it.type === 'text') {
            if (it.font === undefined) it.font = 'elite';
            if (it.fontSizePx === undefined) it.fontSizePx = (it.h / 100) * heightRef * 0.6;
            if (it.color === undefined) it.color = SHAPE_PALETTE[0];
          }
          if (it.type === 'shape' && !SHAPE_KEYS.includes(it.shape)) {
            const legacyMap = { circle: 'stamp', frame: 'torn', star: 'burst', heart: 'burst' };
            it.shape = legacyMap[it.shape] || 'tape';
          }
        });
      }
      saved.pages.forEach(p => migrateItems(p, PANEL_H));
      migrateItems(saved.poster, PRINT_H);

      state = saved;
    }
  } catch (e) {
    console.warn('Não consegui carregar estado salvo:', e);
  }
  render();
})();
