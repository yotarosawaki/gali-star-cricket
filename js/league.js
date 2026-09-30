// モードB: 監督リーグ（地区 → 州 → ナショナル）。試合は5オーバーのオート進行
const TIERS = [{ ic: '🏘', avg: 27 }, { ic: '🏙', avg: 43 }, { ic: '🌙', avg: 59 }];
const OVERS = 5;

const Sim = {
  newInn(bat, bowl) {
    const bs = [...bowl.players].sort((a, b) => P.bowlR(b) - P.bowlR(a)).slice(0, 5);
    return { bat, bowl, runs: 0, wk: 0, balls: 0, s: 0, ns: 1, next: 2, bowlers: [bs[1], bs[3], bs[4], bs[2], bs[0]], fld: P.fieldAvg(bowl.players) };
  },
  done(inn, target) { return inn.balls >= OVERS * 6 || inn.wk >= 10 || (target != null && inn.runs >= target); },
  step(inn, aggr, bowlAggr) {
    const batter = inn.bat.players[inn.s], bowler = inn.bowlers[Math.min(4, Math.floor(inn.balls / 6))];
    const o = Engine.rollOutcome(P.batR(batter) - P.bowlR(bowler), { aggr, bowlAggr, fld: inn.fld });
    inn.balls++;
    if (o.out) { inn.wk++; if (inn.next < 11) inn.s = inn.next++; }
    else { inn.runs += o.runs; if (o.runs % 2) [inn.s, inn.ns] = [inn.ns, inn.s]; }
    if (inn.balls % 6 === 0) [inn.s, inn.ns] = [inn.ns, inn.s];
    return { out: !!o.out, runs: o.runs || 0, batter, bowler };
  },
  aiAggr(inn, target) {
    const left = OVERS * 6 - inn.balls;
    if (target != null) { const rr = (target - inn.runs) / Math.max(1, left); return rr > 2 ? 2 : rr < 1 ? 0 : 1; }
    return left <= 6 ? 2 : 1;
  },
  quick(a, b) {
    const first = Math.random() < 0.5 ? [a, b] : [b, a];
    const i1 = this.newInn(first[0], first[1]); while (!this.done(i1)) this.step(i1, this.aiAggr(i1), 1);
    const i2 = this.newInn(first[1], first[0]); while (!this.done(i2, i1.runs + 1)) this.step(i2, this.aiAggr(i2, i1.runs + 1), 1);
    const ra = first[0] === a ? i1.runs : i2.runs, rb = first[0] === a ? i2.runs : i1.runs;
    return { a: ra, b: rb };
  },
};

const League = {
  ensure() { if (!S.d.league) this.newSeason(0); },
  newSeason(tier) {
    const cities = [...CITIES].sort(() => Math.random() - 0.5).slice(0, 5);
    const teams = cities.map((c, i) => {
      const tm = P.genTeam(TIERS[tier].avg + rint(-4, 4));
      tm.id = i + 1; tm.name = c + ' ' + pick(MASCOTS) + ' High'; tm.short = c.slice(0, 3).toUpperCase();
      return tm;
    });
    // 総当たり（サークル方式）
    const ids = [0, 1, 2, 3, 4, 5], fixtures = [];
    for (let r = 0; r < 5; r++) {
      fixtures.push([[ids[0], ids[5]], [ids[1], ids[4]], [ids[2], ids[3]]]);
      ids.splice(1, 0, ids.pop());
    }
    const table = {}; for (let i = 0; i < 6; i++) table[i] = { w: 0, l: 0, t: 0, pts: 0, rf: 0, ra: 0 };
    S.d.league = { tier, round: 0, teams, fixtures, table };
    S.save();
  },
  team(id) { return id === 0 ? { id: 0, ...S.myTeam() } : S.d.league.teams.find(tm => tm.id === id); },
  ranking() {
    const tb = S.d.league.table;
    return [0, 1, 2, 3, 4, 5].sort((a, b) => tb[b].pts - tb[a].pts || (tb[b].rf - tb[b].ra) - (tb[a].rf - tb[a].ra));
  },
  record(a, b, ra, rb) {
    const tb = S.d.league.table;
    tb[a].rf += ra; tb[a].ra += rb; tb[b].rf += rb; tb[b].ra += ra;
    if (ra > rb) { tb[a].w++; tb[a].pts += 2; tb[b].l++; }
    else if (rb > ra) { tb[b].w++; tb[b].pts += 2; tb[a].l++; }
    else { tb[a].t++; tb[b].t++; tb[a].pts++; tb[b].pts++; }
  },

  screen() {
    this.ensure();
    const lg = S.d.league, rank = this.ranking(), tb = lg.table;
    const fx = lg.fixtures[lg.round].find(f => f.includes(0)), opp = this.team(fx[0] === 0 ? fx[1] : fx[0]);
    UI.show(h('div', { class: 'screen' },
      UI.topbar('📋 ' + t('mode_league'), () => Main.home()),
      h('div', { class: 'pad' },
        h('div', { class: 'ladder' }, TIERS.map((tr, i) => [
          h('div', { class: 'tier' + (i === lg.tier ? ' on' : i < lg.tier ? ' done' : '') }, h('span', { class: 'bigic sm' }, tr.ic), h('small', null, t('tier' + i))),
          i < 2 ? h('span', { class: 'arrow' }, '▶') : h('span', { class: 'arrow' }, '🏆', S.d.trophies ? '×' + S.d.trophies : '')])),
        h('div', { class: 'card' },
          h('div', { class: 'row between' }, h('b', null, '🗓 ', lg.round + 1, ' / 5'), h('small', { class: 'mut' }, t('promo_rule' + (lg.tier === 2 ? '2' : '')))),
          h('table', { class: 'table' },
            h('tr', null, h('th', null, '#'), h('th', null, ''), h('th', null, 'W'), h('th', null, 'L'), h('th', null, '±'), h('th', null, 'PT')),
            rank.map((id, i) => {
              const tm = this.team(id), r = tb[id], up = lg.tier === 2 ? i === 0 : i < 2;
              return h('tr', { class: (id === 0 ? 'me ' : '') + (up ? 'up' : '') },
                h('td', null, i + 1), h('td', { class: 'tname' }, UI.teamChip(tm)),
                h('td', null, r.w), h('td', null, r.l), h('td', null, (r.rf - r.ra > 0 ? '+' : '') + (r.rf - r.ra)), h('td', null, h('b', null, r.pts)));
            }))),
        h('div', { class: 'card center' },
          h('div', { class: 'scoreline' },
            h('div', null, UI.teamChip(S.d.team), h('small', null, '💪', Math.round(this.power(S.myTeam())))),
            h('span', null, 'VS'),
            h('div', null, UI.teamChip(opp), h('small', null, '💪', Math.round(this.power(opp))))),
          h('small', { class: 'mut' }, opp.name)),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost grow', onclick: () => { SFX.click(); Team.screen(() => League.screen()); } }, '👥 ', t('team')),
          h('button', { class: 'btn grow big', onclick: () => { SFX.good(); this.playRound(opp); } }, '▶ ', t('play_match'))))));
  },
  power(tm) { return tm.players.reduce((s, p) => s + P.overall(p), 0) / tm.players.length; },

  async playRound(opp) {
    const lg = S.d.league, me = this.team(0);
    const r = await this.viewer(me, opp);
    this.record(0, opp.id, r.me, r.opp);
    for (const f of lg.fixtures[lg.round]) {
      if (f.includes(0)) continue;
      const q = Sim.quick(this.team(f[0]), this.team(f[1]));
      this.record(f[0], f[1], q.a, q.b);
    }
    lg.round++;
    const win = r.me > r.opp, coins = win ? 50 : r.me === r.opp ? 20 : 10;
    S.addCoins(coins);
    win ? SFX.win() : SFX.lose();
    await UI.alert([h('div', { class: 'bigic' }, win ? '🏆' : r.me === r.opp ? '🤝' : '😢'), h('h2', { class: win ? 'gold' : '' }, t(win ? 'win' : r.me === r.opp ? 'tie' : 'lose')),
      h('div', { class: 'scoreline' }, h('div', null, UI.teamChip(me), h('b', null, r.me)), h('span', null, '—'), h('div', null, UI.teamChip(opp), h('b', null, r.opp))),
      h('div', { class: 'reward' }, '🪙 +', coins)]);
    if (lg.round >= 5) return this.seasonEnd();
    this.screen();
  },

  async seasonEnd() {
    const lg = S.d.league, pos = this.ranking().indexOf(0) + 1;
    let ic, msg, next = lg.tier, coins = 0;
    if (lg.tier === 2 && pos === 1) { ic = '🏆🌙'; msg = 'champion'; S.d.trophies++; coins = 500; }
    else if (lg.tier < 2 && pos <= 2) { ic = '🎉' + TIERS[lg.tier + 1].ic; msg = 'promoted'; next = lg.tier + 1; coins = 200; }
    else { ic = '💪'; msg = 'stay'; coins = 30; }
    S.addCoins(coins);
    coins >= 200 ? SFX.win() : SFX.click();
    await UI.alert([h('div', { class: 'bigic' }, ic), h('h2', { class: 'gold' }, '#', pos, ' ', t(msg)), h('div', { class: 'reward' }, '🪙 +', coins)]);
    this.newSeason(next);
    this.screen();
  },

  // 試合ビューア。作戦（守る/ふつう/攻める）と早送りができる
  viewer(me, opp) {
    return new Promise(resolve => {
      const meFirst = Math.random() < 0.5;
      const order = meFirst ? [me, opp] : [opp, me];
      let inn = Sim.newInn(order[0], order[1]), first = null, target = null, tactic = 1, speed = 1, last = null, over = [], finished = false, timer = null;
      const root = h('div', { class: 'screen simscr' });
      UI.show(root);
      const draw = () => {
        const line = (tm, i) => {
          const isBat = i === inn, runs = i ? i.runs : '-', wk = i ? i.wk : 0, balls = i ? i.balls : 0;
          return h('div', { class: 'simline' + (isBat && !finished ? ' on' : '') }, UI.teamChip(tm), isBat && !finished ? h('span', null, '🏏') : h('span', null, ''),
            h('b', { class: 'mscore' }, runs, h('small', null, '/', wk)), h('small', { class: 'mut' }, '(', Math.floor(balls / 6), '.', balls % 6, ')'));
        };
        const i1 = first || inn, i2 = first ? inn : null;
        const myBat = inn.bat === me;
        const bt = last ? last.batter : inn.bat.players[inn.s], bw = last ? last.bowler : inn.bowlers[0];
        const tbtn = (v, ic) => h('button', { class: 'opt' + (tactic === v ? ' on' : ''), onclick: () => { SFX.click(); tactic = v; draw(); } }, h('span', { class: 'bigic sm' }, ic));
        const sbtn = (v, ic) => h('button', { class: 'opt' + (speed === v ? ' on' : ''), onclick: () => { SFX.click(); speed = v; draw(); if (v === 3) run(); } }, h('span', { class: 'bigic sm' }, ic));
        root.replaceChildren(
          h('div', { class: 'simboard' }, line(order[0], i1), line(order[1], i2),
            target != null ? h('div', { class: 'need' }, '🎯 ', Math.max(0, target - inn.runs), ' / ', OVERS * 6 - inn.balls, ' ⚪') : h('div', { class: 'need' }, '⚪ ', OVERS * 6 - inn.balls)),
          h('div', { class: 'simstage' },
            h('div', { class: 'simp' }, UI.avatar(bt, inn.bat.color, 72), h('b', null, bt.name), h('small', null, '🏏 ', Math.round(P.batR(bt)))),
            h('div', { class: 'simres ' + (last ? (last.out ? 'w' : last.runs >= 4 ? 'b4' : '') : '') }, last ? (last.out ? 'OUT' : last.runs) : '🏟'),
            h('div', { class: 'simp' }, UI.avatar(bw, inn.bowl.color, 72), h('b', null, bw.name), h('small', null, '🔴 ', Math.round(P.bowlR(bw))))),
          h('div', { class: 'balls center' }, [0, 1, 2, 3, 4, 5].map(i => {
            const b = over[i];
            return h('span', { class: 'bl' + (b == null ? '' : b === 'W' ? ' w' : b >= 4 ? ' b4' : ' run') }, b == null ? '' : b);
          })),
          h('div', { class: 'pad' },
            h('small', { class: 'mut' }, myBat ? '🏏 ' : '🔴 ', t('tactic')),
            h('div', { class: 'grid3' }, tbtn(0, '🛡'), tbtn(1, '⚖️'), tbtn(2, '🔥')),
            h('small', { class: 'mut' }, t('speed')),
            h('div', { class: 'grid3' }, sbtn(1, '▶'), sbtn(2, '⏩'), sbtn(3, '⏭'))));
      };
      const end = () => {
        finished = true; clearTimeout(timer);
        const mine = first.bat === me ? first.runs : inn.runs, theirs = first.bat === me ? inn.runs : first.runs;
        draw();
        setTimeout(() => resolve({ me: mine, opp: theirs }), 900);
      };
      const stepOnce = () => {
        const myBat = inn.bat === me;
        const r = Sim.step(inn, myBat ? tactic : Sim.aiAggr(inn, target), myBat ? 1 : tactic);
        last = r;
        if (over.length >= 6) over = [];
        over.push(r.out ? 'W' : r.runs);
        if (speed < 3) { if (r.out) SFX.out(); else if (r.runs === 6) SFX.six(); else if (r.runs === 4) SFX.four(); else SFX.tone(500, 0.04, 'triangle', 0.08); }
        if (Sim.done(inn, target)) {
          if (!first) { first = inn; target = inn.runs + 1; inn = Sim.newInn(order[1], order[0]); over = []; last = null; return 'swap'; }
          return 'end';
        }
        return null;
      };
      const run = () => {
        clearTimeout(timer);
        if (finished || !root.isConnected) return;
        if (speed === 3) {
          let s; do { s = stepOnce(); } while (s !== 'end');
          return end();
        }
        const s = stepOnce();
        draw();
        if (s === 'end') return end();
        timer = setTimeout(run, s === 'swap' ? 1400 : speed === 1 ? 750 : 160);
      };
      draw();
      timer = setTimeout(run, 900);
    });
  },
};
