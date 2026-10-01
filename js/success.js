// モードA: サクセス（高校3年生の1年間でマイ選手を育てる）
const Success = {
  run: null,

  enter() {
    if (S.d.success) { this.run = S.d.success; this.turnScreen(); } else this.setup();
  },

  /* ---------- はじめる前の設定 ---------- */
  setup() {
    const cfg = { role: 'bat', btype: 'pace', skin: 1, name: P.randomName(), coaches: Object.keys(S.d.coaches).slice(0, 3) };
    const draw = () => {
      const opt = (key, val, body) => h('button', { class: 'opt' + (cfg[key] === val ? ' on' : ''), onclick: () => { SFX.click(); cfg[key] = val; draw(); } }, body);
      const nameIn = h('input', { class: 'input', maxlength: 12, value: cfg.name, oninput: e => { cfg.name = e.target.value; } });
      const owned = Object.keys(S.d.coaches);
      UI.show(h('div', { class: 'screen' },
        UI.topbar('🌱 ' + t('mode_success'), () => Main.home()),
        h('div', { class: 'pad' },
          h('div', { class: 'card center' },
            UI.avatar({ skin: cfg.skin }, S.d.team.color, 84),
            h('div', { class: 'row' }, SKINS.map((c, i) => opt('skin', i, h('span', { class: 'swatch', style: 'background:' + c })))),
            h('div', { class: 'row' }, nameIn, h('button', { class: 'iconbtn', onclick: () => { SFX.click(); cfg.name = P.randomName(); draw(); } }, '🎲')),
            h('small', { class: 'mut' }, t('name_note'))),
          h('h3', null, t('pick_role')),
          h('div', { class: 'grid3' }, ['bat', 'bowl', 'all'].map(r => opt('role', r, [h('span', { class: 'bigic sm' }, ROLE_IC[r]), h('small', null, t('role_' + r))]))),
          cfg.role !== 'bat' ? h('div', { class: 'grid2' }, ['pace', 'spin'].map(b => opt('btype', b, [h('span', { class: 'bigic sm' }, b === 'pace' ? '⚡' : '🌀'), h('small', null, t('btype_' + b))]))) : null,
          h('h3', null, '🎴 ', t('pick_coach'), ' ', cfg.coaches.length, '/3'),
          h('div', { class: 'grid3' }, owned.map(id => {
            const on = cfg.coaches.includes(id);
            return h('button', {
              class: 'opt coach' + (on ? ' on' : ''), onclick: () => {
                SFX.click();
                if (on) cfg.coaches = cfg.coaches.filter(c => c !== id); else if (cfg.coaches.length < 3) cfg.coaches.push(id);
                draw();
              },
            }, Coach.card(id));
          })),
          h('button', { class: 'btn wide big', onclick: () => { SFX.good(); this.begin(cfg); } }, '▶ ', t('start')))));
    };
    draw();
  },

  begin(cfg) {
    const base = { power: 10, timing: 12, pace: 10, spin: 10, control: 12, speed: 18, fielding: 18 };
    const main = cfg.btype === 'pace' ? 'pace' : 'spin';
    if (cfg.role === 'bat') Object.assign(base, { power: 28, timing: 28, speed: 20 });
    else if (cfg.role === 'bowl') Object.assign(base, { [main]: 30, control: 24 });
    else Object.assign(base, { power: 20, timing: 20, [main]: 22, control: 18 });
    const name = (cfg.name || '').trim().slice(0, 12) || P.randomName();
    this.run = S.d.success = {
      p: { id: '', name, role: cfg.role, btype: cfg.btype, skin: cfg.skin, my: true, ...base },
      turn: 0, sta: 100, maxSta: 100, mot: 2, coaches: cfg.coaches, pts: 0, out: false, best: 0, lv: {}, cnt: {}, at: {},
      mates: [P.gen(30, 'bat'), P.gen(30, 'bat')],
    };
    this.placeCoaches();
    S.save();
    this.turnScreen();
  },

  placeCoaches() {
    const at = {};
    for (const id of this.run.coaches) {
      if (Math.random() > 0.6) continue;
      const c = COACHES[id], spot = c.focus === 'any' ? pick(Object.keys(TRAIN)) : c.focus;
      (at[spot] = at[spot] || []).push(id);
    }
    this.run.at = at;
  },

  /* ---------- トレーニングの計算 ---------- */
  gains(kind) {
    const r = this.run, p = r.p, main = p.btype === 'pace' ? 'pace' : 'spin', other = main === 'pace' ? 'spin' : 'pace';
    const base = {
      bat: { power: 1.5, timing: 1.5 },
      bowl: { [main]: 1.9, control: 1.4, [other]: 0.3 },
      run: { speed: 2.4 },
      field: { fielding: 2.4, control: 0.4, timing: 0.4 },
    }[kind];
    let mul = MOT_MUL[r.mot] * (1 + (r.lv[kind] || 0) * 0.07);
    if (kind === 'bat') mul *= p.role === 'bat' ? 1.2 : p.role === 'all' ? 1.08 : 1;
    if (kind === 'bowl') mul *= p.role === 'bowl' ? 1.2 : p.role === 'all' ? 1.08 : 1;
    const g = { ...base };
    for (const id of (r.at[kind] || [])) {
      const c = COACHES[id];
      mul *= 1 + c.bonus + 0.05 * ((S.d.coaches[id] || 1) - 1);
      if (c.stat && g[c.stat] != null) g[c.stat] += 1.5;
    }
    // 能力が高くなるほど伸びにくい
    for (const k in g) g[k] *= mul * Math.max(0.2, 1.15 - p[k] / 110);
    return g;
  },
  risk() { const s = this.run.sta; return s < 55 ? Math.min(60, Math.round((55 - s) * 1.3)) : 0; },
  apply(eff) {
    const p = this.run.p, got = {};
    for (const k in eff) { const before = p[k]; p[k] = clamp(p[k] + eff[k], 1, 100); if (p[k] !== before) got[k] = p[k] - before; }
    return got;
  },

  /* ---------- 毎ターンの画面 ---------- */
  nextMatch() { for (let i = this.run.turn + 1; i <= TURNS; i++) if (SCHED[i]) return { in: i - this.run.turn, kind: this.kindAt(i) }; return null; },
  kindAt(turn) { const k = SCHED[turn]; return this.run.out && k !== 'practice' ? 'practice' : k; },

  // 今週のおすすめ行動とヒント
  recommend() {
    const r = this.run, p = r.p;
    if (r.sta < 45) return { act: 'rest', hint: 'hint_rest' };
    if (r.mot <= 1) return { act: 'play', hint: 'hint_mot' };
    const weak = p.role === 'all' ? (P.batR(p) <= P.bowlR(p) ? 'bat' : 'bowl') : p.role;
    let best = null, bestScore = -1;
    for (const k of Object.keys(TRAIN)) {
      const sc = (r.at[k] || []).length * 2 + (k === weak ? 1.5 : 0) + (r.lv[k] || 0) * 0.2;
      if (sc > bestScore) { best = k; bestScore = sc; }
    }
    return { act: best, hint: (r.at[best] || []).length ? 'hint_coach' : 'hint_role' };
  },

  turnScreen(fresh) {
    const r = this.run, p = r.p, month = Math.floor(r.turn / 3) + 1, week = r.turn % 3, nm = this.nextMatch(), risk = this.risk();
    if (this.selTurn !== r.turn) { this.sel = null; this.selTurn = r.turn; fresh = true; }
    const rec = this.recommend();
    const acts = {
      bat: () => this.doTrain('bat'), bowl: () => this.doTrain('bowl'), run: () => this.doTrain('run'), field: () => this.doTrain('field'),
      rest: () => this.doRest(), play: () => this.doPlay(),
    };
    const choose = k => {
      if (this.sel === k) return go();
      SFX.click(); this.sel = k; this.turnScreen();
    };
    const go = () => { const k = this.sel; if (!k) return; this.sel = null; SFX.good(); acts[k](); };
    const badge = k => (k === rec.act ? h('span', { class: 'recb' }, '👍 ', t('rec')) : null);
    const cls = (k, extra) => 'tbtn' + (extra ? ' ' + extra : '') + (this.sel === k ? ' sel' : '') + (k === rec.act && !this.sel ? ' recm' : '');
    const trainBtn = kind => {
      const g = this.gains(kind), tr = TRAIN[kind], lv = r.lv[kind] || 0;
      return h('button', { class: cls(kind), onclick: () => choose(kind) }, badge(kind),
        h('div', { class: 'tcoach' }, (r.at[kind] || []).map(id => h('span', null, COACHES[id].ic))),
        h('span', { class: 'bigic sm' }, tr.ic), h('b', null, t('tr_' + kind)),
        h('div', { class: 'lv' }, [0, 1, 2, 3, 4].map(i => h('i', { class: i <= lv ? 'on' : '' }))),
        h('div', { class: 'effs' }, Object.keys(g).filter(k => g[k] >= 1).map(k => h('span', { class: 'eff' }, STAT_IC[k], '+', Math.round(g[k])))),
        h('div', { class: 'tcost' }, '❤-', tr.cost, risk ? h('span', { class: 'risk' }, ' ⚠', risk, '%') : null));
    };
    const hintText = t(rec.hint, { x: t('tr_' + rec.act) });
    const selName = this.sel ? [TRAIN[this.sel] ? TRAIN[this.sel].ic : this.sel === 'rest' ? '💤' : '☕', ' ', t('tr_' + this.sel)] : null;
    UI.show(h('div', { class: 'screen turnscr' },
      h('div', { class: 'topbar' },
        h('button', { class: 'iconbtn', onclick: () => { SFX.click(); S.save(); Main.home(); } }, '🏠'),
        h('div', { class: 'title' }, '📅 ', month, '/12 ', h('span', { class: 'weeks' }, [0, 1, 2].map(i => h('i', { class: i < week ? 'done' : i === week ? 'now' : '' })))),
        nm ? h('div', { class: 'nextm' }, MATCH_KIND[nm.kind].ic, '🏟 ', h('b', null, nm.in)) : null),
      h('div', { class: 'progress' }, h('i', { style: 'width:' + (r.turn / TURNS * 100) + '%' }),
        Object.keys(SCHED).map(tn => h('span', { class: 'pm' + (r.turn >= tn ? ' done' : ''), style: 'inset-inline-start:' + (tn / TURNS * 100) + '%' }, MATCH_KIND[this.kindAt(+tn)].ic))),
      h('div', { class: 'pad' },
        h('div', { class: 'card pcard' },
          UI.avatar(p, S.d.team.color, 56),
          h('div', { class: 'grow' },
            h('div', { class: 'row between' }, h('b', null, ROLE_IC[p.role], ' ', p.name), UI.gradeBadge(P.gradeOf(p))),
            h('div', { class: 'row' }, h('span', null, '❤'), h('span', { class: 'bar sta' }, h('i', { style: 'width:' + (r.sta / r.maxSta * 100) + '%;background:' + (r.sta < 40 ? '#e5484d' : r.sta < 60 ? '#f5c542' : '#3ddc84') })), h('small', null, r.sta, '/', r.maxSta), h('span', { class: 'mot' }, MOT_IC[r.mot])),
            h('div', { class: 'schips' }, STATS.map(s => h('span', { class: 'schip' }, s.ic, h('b', null, p[s.k]), UI.gradeBadge(P.grade(p[s.k]), true)))))),
        r.pts > 0 ? h('button', { class: 'btn wide gold', onclick: () => this.allocScreen() }, '⭐ ', r.pts, ' ', t('use_points')) : null,
        // 今週の問いかけ
        h('div', { class: 'ask' },
          h('div', { class: 'askweek' }, t('week_n', { n: r.turn + 1 }), h('small', null, ' / ', TURNS)),
          h('div', { class: 'bubble' },
            h('b', null, t('ask_week')),
            h('small', null, rec.hint === 'hint_rest' ? '' : rec.hint === 'hint_mot' ? '😟 ' : '👍 ', hintText),
            nm && nm.in <= 2 ? h('small', { class: 'gold' }, MATCH_KIND[nm.kind].ic, ' ', t('hint_match', { n: nm.in })) : null)),
        h('div', { class: 'tgrid' },
          ['bat', 'bowl', 'run', 'field'].map(trainBtn),
          h('button', { class: cls('rest', 'rest'), onclick: () => choose('rest') }, badge('rest'), h('span', { class: 'bigic sm' }, '💤'), h('b', null, t('tr_rest')), h('div', { class: 'effs' }, h('span', { class: 'eff' }, '❤+45'))),
          h('button', { class: cls('play', 'rest'), onclick: () => choose('play') }, badge('play'), h('span', { class: 'bigic sm' }, '☕'), h('b', null, t('tr_play')), h('div', { class: 'effs' }, h('span', { class: 'eff' }, '😄↑'), h('span', { class: 'eff' }, '❤+15'))))),
      // 決定ボタン（えらぶまで押せない）
      h('div', { class: 'decide' },
        h('button', { class: 'btn wide big' + (this.sel ? ' ready' : ''), disabled: !this.sel, onclick: go },
          this.sel ? ['▶ ', selName, ' ', t('decide')] : ['👆 ', t('pick_one')])),
      fresh ? h('div', { class: 'weekcard' }, h('span', null, '📅'), h('b', null, t('week_n', { n: r.turn + 1 })), h('small', null, month, '/12')) : null));
  },

  async doTrain(kind) {
    const r = this.run, risk = this.risk(), before = { ...r.p }, staFrom = r.sta, coaches = r.at[kind] || [];
    r.sta = Math.max(0, r.sta - TRAIN[kind].cost);
    const g0 = this.gains(kind), keys = Object.keys(g0).filter(k => g0[k] >= 0.5);
    const anim = { kind, p: r.p, color: S.d.team.color, before, staFrom, coaches, keys };
    if (Math.random() * 100 < risk) {
      r.mot = Math.max(0, r.mot - 1); r.sta = Math.max(0, r.sta - 5);
      Object.assign(anim, { fail: true, got: {} });
    } else {
      const g = this.gains(kind), great = Math.random() < 0.08, eff = {};
      for (const k in g) { const v = g[k] * (great ? 2 : 1); eff[k] = Math.max(v >= 0.7 ? 1 : 0, Math.floor(v + Math.random())); }
      const maxBefore = r.maxSta;
      if (kind === 'run') r.maxSta = Math.min(130, r.maxSta + 3);
      const got = this.apply(eff);
      r.cnt[kind] = (r.cnt[kind] || 0) + 1;
      const lvUp = r.cnt[kind] % 4 === 0 && (r.lv[kind] || 0) < 4;
      if (lvUp) r.lv[kind] = (r.lv[kind] || 0) + 1;
      Object.assign(anim, { great, got, lvUp, lv: (r.lv[kind] || 0) + 1, maxStaUp: r.maxSta - maxBefore });
    }
    S.save();
    await TrainAnim.play(Object.assign(anim, { staTo: r.sta, maxSta: r.maxSta }));
    this.advance();
  },
  async doRest() {
    const r = this.run;
    r.sta = Math.min(r.maxSta, r.sta + 45);
    if (Math.random() < 0.25) r.mot = Math.min(4, r.mot + 1);
    SFX.good();
    await UI.alert([h('div', { class: 'bigic' }, '💤'), h('div', { class: 'effs big' }, h('span', { class: 'eff' }, '❤+45'))]);
    this.advance();
  },
  async doPlay() {
    const r = this.run;
    r.sta = Math.min(r.maxSta, r.sta + 15); r.mot = Math.min(4, r.mot + 1);
    SFX.good();
    await UI.alert([h('div', { class: 'bigic' }, '☕'), h('div', { class: 'effs big' }, h('span', { class: 'eff' }, MOT_IC[r.mot]), h('span', { class: 'eff' }, '❤+15'))]);
    this.advance();
  },

  async advance() {
    const r = this.run;
    r.turn++;
    this.placeCoaches();
    S.save();
    if (SCHED[r.turn]) { await this.match(this.kindAt(r.turn)); if (r.turn >= TURNS) return this.finish(); }
    else if (Math.random() < 0.3) { this.turnScreen(); await this.event(); }
    S.save();
    this.turnScreen();
  },

  event() {
    const r = this.run, ev = pick(EVENTS);
    return new Promise(res => {
      SFX.click();
      UI.modal(h('div', { class: 'center' },
        h('div', { class: 'bigic' }, ev.ic), h('h2', null, t('ev_' + ev.id)), h('p', null, t('ev_' + ev.id + '_t')),
        ev.ch.map((ch, i) => h('button', {
          class: 'btn wide choice', onclick: () => {
            SFX.good();
            if (ch.eff) this.apply(ch.eff);
            if (ch.sta) r.sta = clamp(r.sta + ch.sta, 0, r.maxSta);
            if (ch.mot) r.mot = clamp(r.mot + ch.mot, 0, 4);
            UI.closeModal(); res();
          },
        }, h('span', { class: 'cic' }, ch.ic), h('span', { class: 'grow' }, t('ev_' + ev.id + '_' + i)), h('span', { class: 'effs' }, UI.effText(ch.eff, ch.sta, ch.mot))))));
    });
  },

  /* ---------- 試合（投げる1回＋打つ1回） ---------- */
  async match(kind) {
    const r = this.run, mk = MATCH_KIND[kind], tm = S.d.team;
    const oppTeam = P.genTeam(mk.avg), opp = P.squad(oppTeam);
    await UI.alert([h('div', { class: 'bigic' }, mk.ic, '🏟'), h('h2', null, t('mk_' + kind)),
      h('div', { class: 'scoreline' }, h('div', null, UI.teamChip(tm)), h('span', null, 'VS'), h('div', null, UI.teamChip(oppTeam))),
      h('p', { class: 'mut' }, oppTeam.name)]);
    const me = { name: tm.name, short: tm.short, color: tm.color, emblem: tm.emblem, batters: [r.p, ...r.mates], bowler: r.p, fieldAvg: 30 + r.turn * 0.4 };
    const A = rint(28, 44);
    const cfg = { me, opp, ctl: AICtl(opp, me.fieldAvg), order: 'bowl', pre: { opp: A, me: A - rint(0, 3) - mk.lv }, title: mk.ic };
    const res = await Match.play(cfg);
    const pts = Math.round((1 + res.myRuns / 5 + res.wkTaken + Math.max(0, 2 - res.conceded / 5) + (res.win ? 2 : 0)) * (1 + mk.lv * 0.1));
    r.pts += pts;
    if (res.win) { r.mot = Math.min(4, r.mot + 1); if (kind !== 'practice') r.best = mk.lv; }
    else if (kind !== 'practice' && !res.tie) r.out = true;
    if (res.tie && kind !== 'practice') r.out = true;
    r.sta = Math.min(r.maxSta, r.sta + 20);
    S.save();
    await Match.result(cfg, res, h('div', { class: 'reward' }, '⭐ +', pts));
    if (r.pts > 0) await this.allocScreen(true);
  },

  // 試合でもらった⭐を能力に振り分ける
  allocScreen(wait) {
    const r = this.run, p = r.p;
    return new Promise(res => {
      const draw = () => {
        UI.show(h('div', { class: 'screen' },
          h('div', { class: 'topbar' }, h('div', { class: 'title' }, '⭐ ', r.pts, ' ', t('use_points'))),
          h('div', { class: 'pad' },
            STATS.map(s => h('div', { class: 'alloc' },
              h('span', { class: 'sic' }, s.ic), h('span', { class: 'slabel' }, t('st_' + s.k)),
              h('span', { class: 'bar' }, h('i', { style: 'width:' + p[s.k] + '%;background:' + GRADE_COL[P.grade(p[s.k])] })),
              h('span', { class: 'sval' }, p[s.k]),
              h('button', { class: 'iconbtn plus', disabled: r.pts < 1 || p[s.k] >= 100, onclick: () => { SFX.click(); const n = Math.min(r.pts, 100 - p[s.k], 1); p[s.k] += n; r.pts -= n; draw(); } }, '+1'),
              h('button', { class: 'iconbtn plus', disabled: r.pts < 5 || p[s.k] > 95, onclick: () => { SFX.click(); p[s.k] += 5; r.pts -= 5; draw(); } }, '+5'))),
            h('button', { class: 'btn wide', onclick: () => { SFX.click(); S.save(); if (wait) res(); else { res(); this.turnScreen(); } } }, '✔ ', t('ok')))));
      };
      draw();
    });
  },

  /* ---------- 卒業 → マイ選手登録 ---------- */
  async finish() {
    const r = this.run, p = r.p;
    // 余った⭐は得意な能力に自動で入れる
    const prio = p.role === 'bowl' ? [p.btype === 'pace' ? 'pace' : 'spin', 'control'] : ['timing', 'power'];
    let i = 0; while (r.pts > 0 && i < 400) { const k = prio[i % prio.length]; if (p[k] < 100) { p[k]++; r.pts--; } i++; }
    const ov = P.overall(p), g = P.grade(ov);
    const verdict = ov >= 70 ? 'pro1' : ov >= 55 ? 'pro2' : ov >= 42 ? 'pro3' : 'pro4';
    const coins = 150 + r.best * 40 + g * 15;
    p.id = 'p' + (S.d.nid++);
    p.title = verdict;
    S.d.players.push(p);
    if (S.d.players.length > 30) S.d.players.shift();
    // いちばん弱い先発と入れかえる
    const xi = S.xi(), weakest = xi.filter(x => !x.my).sort((a, b) => P.overall(a) - P.overall(b))[0];
    if (weakest) { S.d.team.xi[S.d.team.xi.indexOf(weakest.id)] = p.id; }
    S.d.success = null; this.run = null;
    S.addCoins(coins);
    SFX.win();
    const stages = ['🏘', '🏘🏆', '🌙', '🌙🏆'];
    UI.show(h('div', { class: 'screen center pad resultscr' },
      h('div', { class: 'bigic' }, '🎓'), h('h1', { class: 'gold' }, t('graduate')),
      h('div', { class: 'card center' },
        UI.avatar(p, S.d.team.color, 96), h('h2', null, ROLE_IC[p.role], ' ', p.name), UI.gradeBadge(g),
        h('p', { class: 'gold' }, t(verdict)),
        r.best ? h('p', null, stages[r.best - 1]) : null,
        UI.statBars(p)),
      h('div', { class: 'reward' }, '🪙 +', coins),
      h('p', { class: 'mut' }, t('registered')),
      h('button', { class: 'btn wide big', onclick: () => { SFX.click(); Main.home(); } }, '▶ ', t('next'))));
  },
};
