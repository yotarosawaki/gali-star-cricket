// DOMヘルパーと共通UI部品
function add(e, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) add(e, k);
    else e.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  add(e, kids);
  return e;
}
const safeColor = c => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#1faa59');
function shade(hex, f) {
  const n = parseInt(safeColor(hex).slice(1), 16);
  const ch = s => clamp(Math.round(((n >> s) & 255) * f), 0, 255);
  return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
}

const UI = {
  root: null, ov: null,
  init() { this.root = document.getElementById('screen'); this.ov = document.getElementById('overlay'); },
  show(node) { this.closeModal(); this.root.replaceChildren(node); this.root.scrollTop = 0; },
  modal(node, dismissable) {
    const box = h('div', { class: 'modal' }, node);
    this.ov.replaceChildren(box);
    this.ov.classList.add('on');
    this.ov.onclick = e => { if (dismissable && e.target === this.ov) this.closeModal(); };
  },
  closeModal() { this.ov.classList.remove('on'); this.ov.replaceChildren(); },
  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 1800);
  },
  confirm(msg, icon = '❓') {
    return new Promise(res => {
      this.modal(h('div', { class: 'center' },
        h('div', { class: 'bigic' }, icon), h('p', null, msg),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: () => { this.closeModal(); res(false); } }, '✖ ', t('cancel')),
          h('button', { class: 'btn', onclick: () => { this.closeModal(); res(true); } }, '✔ ', t('ok')))));
    });
  },
  // メッセージを出して、タップされるまで待つ
  alert(node) {
    return new Promise(res => {
      this.modal(h('div', { class: 'center' }, node,
        h('button', { class: 'btn wide', onclick: () => { SFX.click(); this.closeModal(); res(); } }, '▶ ', t('next'))));
    });
  },
  topbar(title, onBack, right) {
    return h('div', { class: 'topbar' },
      onBack ? h('button', { class: 'iconbtn backbtn', onclick: () => { SFX.click(); onBack(); }, 'aria-label': t('back') }, '◀') : null,
      h('div', { class: 'title' }, title),
      right || h('div', { class: 'coins' }, '🪙 ', S.d.coins));
  },
  avatar(p, color, size = 48) {
    const col = safeColor(color), skin = SKINS[p.skin] || SKINS[1], cap = shade(col, 0.7);
    return h('span', {
      class: 'avatar', style: 'width:' + size + 'px;height:' + size + 'px',
      html: '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '"><circle cx="32" cy="32" r="32" fill="rgba(255,255,255,.12)"/>' +
        '<path d="M8 66 Q8 45 32 45 Q56 45 56 66Z" fill="' + col + '"/><circle cx="32" cy="30" r="13" fill="' + skin + '"/>' +
        '<path d="M18.5 27 Q19 12 32 12 Q45 12 45.5 27Z" fill="' + cap + '"/><rect x="30" y="23" width="21" height="4.5" rx="2" fill="' + cap + '"/>' +
        '<circle cx="28" cy="32" r="1.6" fill="#222"/><circle cx="37" cy="32" r="1.6" fill="#222"/><path d="M28 37.5 Q32.5 40.5 37 37.5" stroke="#222" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
    });
  },
  gradeBadge(g, small) {
    return h('span', { class: 'grade' + (small ? ' sm' : ''), style: 'background:' + GRADE_COL[g] }, GRADES[g]);
  },
  statBars(p, keys) {
    return h('div', { class: 'stats' }, (keys || STATS.map(s => s.k)).map(k => {
      const v = p[k], g = P.grade(v);
      return h('div', { class: 'stat' },
        h('span', { class: 'sic' }, STAT_IC[k]), h('span', { class: 'slabel' }, t('st_' + k)),
        h('span', { class: 'bar' }, h('i', { style: 'width:' + v + '%;background:' + GRADE_COL[g] })),
        h('span', { class: 'sval' }, v), UI.gradeBadge(g, true));
    }));
  },
  playerRow(p, color, extra) {
    return h('div', { class: 'prow' + (p.my ? ' my' : '') },
      UI.avatar(p, color, 40),
      h('div', { class: 'pname' }, h('b', null, p.name), h('small', null, ROLE_IC[p.role], ' ', t('role_' + p.role), p.my ? ' ★' : '')),
      h('div', { class: 'pr' }, h('span', null, '🏏', Math.round(P.batR(p))), h('span', null, '🔴', Math.round(P.bowlR(p)))),
      UI.gradeBadge(P.gradeOf(p)), extra);
  },
  effText(eff, sta, mot) {
    const out = [];
    for (const k in (eff || {})) out.push(h('span', { class: 'eff' }, STAT_IC[k], (eff[k] > 0 ? '+' : '') + eff[k]));
    if (sta) out.push(h('span', { class: 'eff' }, '❤', (sta > 0 ? '+' : '') + sta));
    if (mot) out.push(h('span', { class: 'eff' }, mot > 0 ? '😄↑' : '😟↓'));
    return out;
  },
  teamChip(tm) {
    return h('span', { class: 'chip', style: 'background:' + safeColor(tm.color) }, h('span', null, String(tm.emblem).slice(0, 4)), ' ', tm.short);
  },
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
