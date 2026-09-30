// 1分対戦（スーパーオーバー）: 投げる6球＋打つ6球。2アウトで交代
// 相手は ctl（CPU または ネットの相手）が担当する
function AICtl(opp, myFieldAvg) {
  return {
    getDelivery(ctx) { return Promise.resolve(Engine.aiDelivery(opp.bowler, ctx.hist)); },
    sendResult() {},
    sendDelivery() {},
    getResult(d, ctx) {
      const aggr = ctx.need != null ? (ctx.need / Math.max(1, ctx.left) > 2 ? 2 : 1) : 1;
      return sleep(150).then(() => Engine.aiBatResult(d, ctx.batter, myFieldAvg, aggr));
    },
  };
}

const Match = {
  // cfg: { me, opp: squad, ctl, order: 'bowl'|'bat'(先にやる方), pre: {me, opp}(それまでの得点), title }
  async play(cfg) {
    const pre = cfg.pre || { me: 0, opp: 0 };
    const st = { me: { runs: 0, wk: 0, balls: [], base: pre.me }, opp: { runs: 0, wk: 0, balls: [], base: pre.opp } };
    const total = s => st[s].base + st[s].runs;
    const hud = h('div', { class: 'mhud' }), stage = h('div', { class: 'stage' });
    UI.show(h('div', { class: 'screen match' }, hud, stage));
    let cur = null, target = null, view = null;
    const drawHud = () => {
      const side = (s, tm) => h('div', { class: 'mside' + (cur === s ? ' on' : '') },
        UI.teamChip(tm), h('b', { class: 'mscore' }, total(s), h('small', null, '/', st[s].wk)), cur === s ? h('span', null, '🏏') : null);
      const bs = cur ? st[cur].balls : [];
      const need = target != null && cur ? Math.max(0, target - total(cur)) : null;
      hud.replaceChildren(
        h('div', { class: 'mrow' }, side('me', cfg.me), h('span', { class: 'vs' }, cfg.title || 'VS'), side('opp', cfg.opp)),
        h('div', { class: 'mrow' },
          h('div', { class: 'balls' }, [0, 1, 2, 3, 4, 5].map(i => {
            const b = bs[i];
            return h('span', { class: 'bl' + (b == null ? '' : b === 'W' ? ' w' : b >= 4 ? ' b4' : ' run') }, b == null ? '' : b);
          })),
          need != null ? h('div', { class: 'need' }, '🎯 ', need) : null));
    };
    const inter = (side, need) => new Promise(res => {
      const batting = side === 'me';
      const who = batting ? cfg.me.batters[0] : cfg.me.bowler;
      const el = h('div', { class: 'inter ' + (batting ? 'chance' : 'pinch') },
        h('div', { class: 'bigic' }, batting ? '🏏' : '🔴'),
        h('h2', null, t(batting ? 'chance' : 'pinch')),
        h('div', { class: 'row' }, UI.avatar(who, cfg.me.color, 72), h('b', null, who.name)),
        need != null ? h('div', { class: 'need big' }, '🎯 ', need, ' / 6 ⚪') : h('div', { class: 'need big' }, '6 ⚪'),
        h('small', null, t(batting ? 'hint_bat' : 'hint_bowl')));
      stage.appendChild(el);
      let done = false;
      const go = () => { if (done) return; done = true; el.remove(); res(); };
      el.onclick = go; setTimeout(go, 2600);
    });
    drawHud();
    view = Match.view = new ActionView(stage);
    const flags = S.d.flags;
    const innings = async side => {
      const me = side === 'me', s = st[side], hist = [];
      while (s.balls.length < 6 && s.wk < 2 && !(target != null && total(side) >= target)) {
        const need = target != null ? target - total(side) : null, left = 6 - s.balls.length;
        let res;
        if (me) {
          const batter = cfg.me.batters[Math.min(s.wk, cfg.me.batters.length - 1)];
          const d = await cfg.ctl.getDelivery({ hist });
          hist.push(d);
          res = await view.bat({ delivery: d, batter, bowler: cfg.opp.bowler, batColor: cfg.me.color, bowlColor: cfg.opp.color, fieldAvg: cfg.opp.fieldAvg, hint: (flags.tBat || 0) < 3 });
          flags.tBat = (flags.tBat || 0) + 1;
          cfg.ctl.sendResult(res);
        } else {
          const batter = cfg.opp.batters[Math.min(s.wk, cfg.opp.batters.length - 1)];
          const o = { bowler: cfg.me.bowler, batter, batColor: cfg.opp.color, bowlColor: cfg.me.color, hist, hint: (flags.tBowl || 0) < 2 };
          const d = await view.bowlInput(o);
          flags.tBowl = (flags.tBowl || 0) + 1;
          hist.push(d);
          cfg.ctl.sendDelivery(d);
          res = await view.bowlShow(d, cfg.ctl.getResult(d, { batter, need, left }), o);
        }
        if (res.out) { s.wk++; s.balls.push('W'); } else { s.runs += res.runs; s.balls.push(res.runs); }
        s.fours = (s.fours || 0) + (res.runs === 4 ? 1 : 0); s.sixes = (s.sixes || 0) + (res.runs === 6 ? 1 : 0);
        drawHud();
      }
    };
    const order = cfg.order === 'bowl' ? ['opp', 'me'] : ['me', 'opp'];
    let aborted = false;
    try {
      for (let i = 0; i < 2; i++) {
        cur = order[i];
        target = i === 1 ? total(order[0]) + 1 : null;
        drawHud();
        await inter(cur, target != null ? target - total(cur) : null);
        await innings(cur);
        await sleep(500);
      }
    } catch (e) { aborted = true; console.warn('match aborted', e); }
    view.destroy();
    S.save();
    const my = total('me'), op = total('opp');
    return {
      aborted, win: !aborted && my > op, tie: !aborted && my === op, myTotal: my, oppTotal: op,
      myRuns: st.me.runs, conceded: st.opp.runs, wkTaken: st.opp.wk, wkLost: st.me.wk, sixes: st.me.sixes || 0, fours: st.me.fours || 0,
    };
  },

  // 結果画面（共通）
  result(cfg, r, extra) {
    return new Promise(res => {
      r.win ? SFX.win() : r.tie ? SFX.click() : SFX.lose();
      UI.show(h('div', { class: 'screen center resultscr' },
        h('div', { class: 'bigic' }, r.win ? '🏆' : r.tie ? '🤝' : '😢'),
        h('h1', { class: r.win ? 'gold' : '' }, t(r.win ? 'win' : r.tie ? 'tie' : 'lose')),
        h('div', { class: 'scoreline' },
          h('div', null, UI.teamChip(cfg.me), h('b', null, r.myTotal)),
          h('span', null, '—'),
          h('div', null, UI.teamChip(cfg.opp), h('b', null, r.oppTotal))),
        h('div', { class: 'row wrap' },
          h('span', { class: 'pill' }, '🏏 ', r.myRuns), h('span', { class: 'pill' }, '6️⃣ ×', r.sixes),
          h('span', { class: 'pill' }, '4️⃣ ×', r.fours), h('span', { class: 'pill' }, '💥 ×', r.wkTaken)),
        extra,
        h('button', { class: 'btn wide', onclick: () => { SFX.click(); res(); } }, '▶ ', t('next'))));
    });
  },
};
