// チーム編成・学校エディット・コーチ（サポートカード）
const Team = {
  sel: null,
  screen(back) {
    this.back = back || (() => Main.home());
    this.sel = null;
    this.draw();
  },
  draw() {
    const tm = S.d.team, xi = S.xi(), bench = S.d.players.filter(p => !tm.xi.includes(p.id));
    const tap = p => {
      SFX.click();
      if (!this.sel) { this.sel = p.id; return this.draw(); }
      if (this.sel === p.id) { this.sel = null; return this.detail(p); }
      const a = tm.xi.indexOf(this.sel), b = tm.xi.indexOf(p.id);
      if (a >= 0 && b >= 0) { tm.xi[a] = p.id; tm.xi[b] = this.sel; }
      else if (a >= 0) tm.xi[a] = p.id;
      else if (b >= 0) tm.xi[b] = this.sel;
      this.sel = null; S.save(); this.draw();
    };
    const row = (p, i) => h('button', { class: 'rowbtn' + (this.sel === p.id ? ' sel' : ''), onclick: () => tap(p) },
      h('span', { class: 'ord' }, i != null ? i + 1 : '＋'), UI.playerRow(p, tm.color));
    UI.show(h('div', { class: 'screen' },
      UI.topbar('👥 ' + t('team'), this.back),
      h('div', { class: 'pad' },
        h('button', { class: 'card school', style: 'border-color:' + safeColor(tm.color), onclick: () => { SFX.click(); this.edit(); } },
          h('span', { class: 'emb', style: 'background:' + safeColor(tm.color) }, tm.emblem),
          h('div', { class: 'grow' }, h('b', null, tm.name), h('small', null, tm.short)), h('span', null, '✏️')),
        h('div', { class: 'row between' },
          h('h3', null, '🏏 ', t('lineup')),
          h('button', { class: 'btn sm', onclick: () => { SFX.good(); S.autoXI(); this.sel = null; this.draw(); } }, '🪄 ', t('auto'))),
        h('small', { class: 'mut' }, t('swap_hint')),
        xi.map((p, i) => row(p, i)),
        bench.length ? h('h3', null, '🪑 ', t('bench')) : null,
        bench.map(p => row(p, null)))));
  },
  detail(p) {
    const tm = S.d.team;
    UI.modal(h('div', { class: 'center' },
      UI.avatar(p, tm.color, 84), h('h2', null, ROLE_IC[p.role], ' ', p.name), UI.gradeBadge(P.gradeOf(p)),
      p.title ? h('p', { class: 'gold' }, t(p.title)) : null,
      UI.statBars(p),
      h('div', { class: 'row' },
        p.my ? h('button', {
          class: 'btn ghost', onclick: async () => {
            if (!(await UI.confirm(t('retire_q'), '👋'))) return this.draw();
            S.d.players = S.d.players.filter(x => x.id !== p.id); S.xi(); S.save(); this.draw();
          },
        }, '👋 ', t('retire')) : null,
        h('button', { class: 'btn', onclick: () => { UI.closeModal(); this.draw(); } }, '✔ ', t('ok')))), true);
  },
  edit() {
    const tm = S.d.team;
    const draw = () => {
      const nameIn = h('input', { class: 'input', maxlength: 24, value: tm.name, oninput: e => { tm.name = e.target.value.slice(0, 24) || 'My School'; } });
      const shortIn = h('input', { class: 'input short', maxlength: 4, value: tm.short, oninput: e => { tm.short = e.target.value.toUpperCase().slice(0, 4) || 'MY'; } });
      UI.modal(h('div', { class: 'center' },
        h('span', { class: 'emb big', style: 'background:' + safeColor(tm.color) }, tm.emblem),
        h('div', { class: 'row' }, nameIn, shortIn),
        h('small', { class: 'mut' }, t('name_note')),
        h('div', { class: 'row wrap' }, COLORS.map(c => h('button', { class: 'swbtn' + (tm.color === c ? ' on' : ''), style: 'background:' + c, onclick: () => { SFX.click(); tm.color = c; draw(); } }))),
        h('div', { class: 'row wrap' }, EMBLEMS.map(e => h('button', { class: 'embbtn' + (tm.emblem === e ? ' on' : ''), onclick: () => { SFX.click(); tm.emblem = e; draw(); } }, e))),
        h('button', { class: 'btn wide', onclick: () => { SFX.click(); S.save(); UI.closeModal(); this.draw(); } }, '✔ ', t('ok'))));
    };
    draw();
  },
};

const Coach = {
  card(id) {
    const c = COACHES[id], lv = S.d.coaches[id] || 0;
    const focus = c.focus === 'any' ? '🌈' : TRAIN[c.focus].ic;
    return [
      h('span', { class: 'rar', style: 'background:' + RAR_COL[c.rar] }, RAR_NAME[c.rar]),
      h('span', { class: 'bigic sm' }, c.ic),
      h('small', null, t(id)),
      h('span', { class: 'cfocus' }, focus, c.stat ? STAT_IC[c.stat] : '', ' +', Math.round(c.bonus * 100), '%', lv > 1 ? ' Lv' + lv : ''),
    ];
  },
  screen() {
    const owned = Object.keys(S.d.coaches), all = Object.keys(COACHES);
    UI.show(h('div', { class: 'screen' },
      UI.topbar('🎴 ' + t('coaches'), () => Main.home()),
      h('div', { class: 'pad' },
        h('button', { class: 'btn wide big gold', disabled: S.d.coins < GACHA_COST, onclick: () => this.pull() }, '🎁 ', t('gacha'), '  🪙', GACHA_COST),
        h('small', { class: 'mut' }, t('gacha_note')),
        h('h3', null, owned.length, ' / ', all.length),
        h('div', { class: 'grid3' }, all.map(id => h('div', { class: 'opt coach' + (owned.includes(id) ? '' : ' locked') }, owned.includes(id) ? this.card(id) : h('span', { class: 'bigic sm' }, '❔')))))));
  },
  async pull() {
    if (S.d.coins < GACHA_COST) return;
    S.addCoins(-GACHA_COST);
    let r = Math.random(), rar = 0;
    for (let i = 0; i < 3; i++) { r -= GACHA_RATE[i]; if (r <= 0) { rar = i; break; } }
    const id = pick(Object.keys(COACHES).filter(k => COACHES[k].rar === rar));
    const isNew = !S.d.coaches[id];
    S.d.coaches[id] = Math.min(5, (S.d.coaches[id] || 0) + 1);
    S.save();
    SFX.coin();
    UI.modal(h('div', { class: 'center' }, h('div', { class: 'bigic spin' }, '🎁')));
    await sleep(900);
    rar === 2 ? SFX.six() : SFX.good();
    await UI.alert([h('div', { class: 'opt coach on reveal', style: 'border-color:' + RAR_COL[rar] }, this.card(id)), h('p', { class: 'gold' }, isNew ? 'NEW!' : '⬆ Lv' + S.d.coaches[id])]);
    this.screen();
  },
};
