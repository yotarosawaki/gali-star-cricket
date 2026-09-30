// モードC: ネット対戦（あいことば方式のP2P）。サーバー不要でPeerJSの公開ブローカーを使う
const PEER_SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const PEER_PREFIX = 'galistar-v1-';

const Net = {
  peer: null, conn: null,

  screen() {
    this.close();
    const sq = P.squad(S.myTeam());
    UI.show(h('div', { class: 'screen' },
      UI.topbar('⚔️ ' + t('mode_net'), () => Main.home()),
      h('div', { class: 'pad' },
        h('div', { class: 'card' },
          h('div', { class: 'row between' }, UI.teamChip(S.d.team), h('small', { class: 'mut' }, t('net_squad'))),
          [...sq.batters.map(p => [p, '🏏']), [sq.bowler, '🔴']].map(([p, ic]) => h('div', { class: 'row' }, h('span', null, ic), UI.playerRow(p, S.d.team.color)))),
        h('button', { class: 'btn wide big', onclick: () => { SFX.click(); this.host(); } }, '🏠 ', t('net_host')),
        h('button', { class: 'btn wide big', onclick: () => { SFX.click(); this.joinScreen(); } }, '🔑 ', t('net_join')),
        h('button', { class: 'btn wide ghost', onclick: () => { SFX.click(); this.cpu(); } }, '🤖 ', t('net_cpu')),
        h('small', { class: 'mut' }, t('net_note')))));
  },

  close() {
    try { if (this.conn) this.conn.close(); } catch (e) { /* 切断ずみ */ }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* 切断ずみ */ }
    this.conn = this.peer = null;
  },
  loadPeer() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = PEER_SRC; s.onload = res; s.onerror = () => rej(new Error('load'));
      document.head.appendChild(s);
    });
  },
  waiting(body) {
    UI.show(h('div', { class: 'screen center pad' }, body,
      h('div', { class: 'bigic spin' }, '⏳'),
      h('button', { class: 'btn ghost', onclick: () => { SFX.click(); this.screen(); } }, '✖ ', t('cancel'))));
  },
  fail(key) { this.close(); UI.toast('⚠ ' + t(key)); this.screen(); },

  async host(tries = 0) {
    this.waiting(h('p', null, t('net_connecting')));
    try { await this.loadPeer(); } catch (e) { return this.fail('net_err'); }
    const code = String(rint(1000, 9999));
    const peer = this.peer = new Peer(PEER_PREFIX + code);
    peer.on('open', () => {
      this.waiting([h('p', null, t('net_code')), h('div', { class: 'code' }, code.split('').map(c => h('span', null, c))), h('p', { class: 'mut' }, t('net_wait'))]);
    });
    peer.on('connection', conn => { if (this.conn) return conn.close(); this.start(conn, true); });
    peer.on('error', e => {
      if (this.peer !== peer) return;
      if (e.type === 'unavailable-id' && tries < 5) { peer.destroy(); return this.host(tries + 1); }
      if (!this.conn) this.fail('net_err');
    });
  },

  joinScreen() {
    let code = '';
    const draw = () => {
      const key = k => h('button', { class: 'key', onclick: () => { SFX.click(); if (k === '⌫') code = code.slice(0, -1); else if (code.length < 4) code += k; draw(); } }, k);
      UI.show(h('div', { class: 'screen' },
        UI.topbar('🔑 ' + t('net_join'), () => this.screen()),
        h('div', { class: 'pad center' },
          h('p', null, t('net_enter')),
          h('div', { class: 'code' }, [0, 1, 2, 3].map(i => h('span', null, code[i] || '·'))),
          h('div', { class: 'keypad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map(key),
            h('button', { class: 'key go', disabled: code.length < 4, onclick: () => { SFX.good(); this.join(code); } }, '▶')))));
    };
    draw();
  },

  async join(code) {
    this.waiting(h('p', null, t('net_connecting')));
    try { await this.loadPeer(); } catch (e) { return this.fail('net_err'); }
    const peer = this.peer = new Peer();
    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      const to = setTimeout(() => { if (this.peer === peer && !this.conn) this.fail('net_noroom'); }, 12000);
      conn.on('open', () => { clearTimeout(to); this.start(conn, false); });
    });
    peer.on('error', e => { if (this.peer !== peer || this.conn) return; this.fail(e.type === 'peer-unavailable' ? 'net_noroom' : 'net_err'); });
  },

  // 相手から来たデータは信用しすぎない（数値と文字を整える）
  cleanPlayer(p) {
    const o = { name: String((p && p.name) || '???').slice(0, 14), role: ['bat', 'bowl', 'all'].includes(p && p.role) ? p.role : 'bat', btype: p && p.btype === 'spin' ? 'spin' : 'pace', skin: clamp((p && p.skin) | 0, 0, 2) };
    for (const s of STATS) o[s.k] = clamp(Math.round(+(p && p[s.k]) || 10), 1, 100);
    return o;
  },
  cleanSquad(q) {
    q = q || {};
    const batters = (Array.isArray(q.batters) ? q.batters : []).slice(0, 3).map(p => this.cleanPlayer(p));
    while (batters.length < 3) batters.push(this.cleanPlayer({}));
    return { name: String(q.name || 'Rival').slice(0, 24), short: String(q.short || 'RIV').slice(0, 4), color: safeColor(q.color), emblem: String(q.emblem || '⭐').slice(0, 4), batters, bowler: this.cleanPlayer(q.bowler), fieldAvg: clamp(+q.fieldAvg || 30, 1, 100) };
  },
  cleanDelivery(d) {
    d = d || {};
    const n = (v, a, b, def) => (Number.isFinite(+v) ? clamp(+v, a, b) : def);
    const len = n(d.len, 1.4, 10, 5), type = BALL_TYPES.includes(d.type) ? d.type : 'fast';
    return { len, line: n(d.line, -1.3, 1.3, 0), type, q: n(d.q, 0, 1, 0.5), time: n(d.time, 0.65, 1.4, 1), dev: n(d.dev, -0.7, 0.7, 0), swing: n(d.swing, -0.7, 0.7, 0), hb: 0.17 * (len - 1), onStumps: !!d.onStumps, zone: Engine.zone(len), diff: n(d.diff, 0.05, 1, 0.5), pace: n(d.pace, 1, 100, 50), f: clamp(d.f | 0, 0, FIELDS.length - 1) };
  },
  cleanResult(r) {
    r = r || {};
    const runs = [0, 1, 2, 3, 4, 6].includes(r.runs) ? r.runs : 0, out = ['bowled', 'caught'].includes(r.out) ? r.out : null;
    return { runs: out ? 0 : runs, out, dir: clamp(+r.dir || 0, -180, 180), dist: clamp(+r.dist || 0, 0, 100), q: ['perfect', 'good', 'ok'].includes(r.q) ? r.q : 'good', aerial: !!r.aerial, six: runs === 6 && !out, miss: !!r.miss };
  },

  async start(conn, isHost) {
    this.conn = conn;
    const queue = {}, waiters = {};
    let closed = false;
    const wait = type => new Promise((res, rej) => {
      if (queue[type] && queue[type].length) return res(queue[type].shift());
      if (closed) return rej(new Error('closed'));
      waiters[type] = { res, rej };
    });
    const onClose = () => { closed = true; for (const k in waiters) { waiters[k].rej(new Error('closed')); delete waiters[k]; } };
    conn.on('data', m => {
      if (!m || typeof m.t !== 'string') return;
      if (waiters[m.t]) { const w = waiters[m.t]; delete waiters[m.t]; w.res(m); }
      else (queue[m.t] = queue[m.t] || []).push(m);
    });
    conn.on('close', onClose); conn.on('error', onClose);
    if (this.peer) this.peer.on('disconnected', () => { /* ブローカーが切れても対戦は続けられる */ });
    const send = m => { try { conn.send(m); } catch (e) { /* 切断時は wait 側で気づく */ } };
    const me = P.squad(S.myTeam());
    const ctl = {
      getDelivery: () => wait('ball').then(m => this.cleanDelivery(m.d)),
      sendResult: r => send({ t: 'res', r }),
      sendDelivery: d => send({ t: 'ball', d }),
      getResult: () => wait('res').then(m => this.cleanResult(m.r)),
    };
    try {
      if (!conn.open) await new Promise((res, rej) => { conn.on('open', res); setTimeout(() => rej(new Error('timeout')), 12000); });
      send({ t: 'hello', team: me });
      const hello = await wait('hello');
      const opp = this.cleanSquad(hello.team);
      SFX.good();
      UI.show(h('div', { class: 'screen center pad' }, h('div', { class: 'bigic' }, '⚔️'),
        h('div', { class: 'scoreline' }, h('div', null, UI.teamChip(me)), h('span', null, 'VS'), h('div', null, UI.teamChip(opp))), h('p', { class: 'mut' }, opp.name)));
      await sleep(1800);
      const cfg = { me, opp, ctl, order: isHost ? 'bowl' : 'bat', title: '⚔️' };
      const r = await Match.play(cfg);
      if (r.aborted) return this.fail('net_lost');
      const coins = r.win ? 80 : 30;
      S.addCoins(coins);
      await Match.result(cfg, r, h('div', { class: 'reward' }, '🪙 +', coins));
    } catch (e) { return this.fail('net_lost'); }
    this.screen();
  },

  async cpu() {
    const myTeam = S.myTeam(), me = P.squad(myTeam);
    const avg = myTeam.players.reduce((s, p) => s + P.overall(p), 0) / 11;
    const opp = P.squad(P.genTeam(clamp(Math.round(avg + rint(-2, 8)), 20, 85)));
    const cfg = { me, opp, ctl: AICtl(opp, me.fieldAvg), order: Math.random() < 0.5 ? 'bowl' : 'bat', title: '🤖' };
    const r = await Match.play(cfg);
    const coins = r.win ? 40 : 15;
    S.addCoins(coins);
    await Match.result(cfg, r, h('div', { class: 'reward' }, '🪙 +', coins));
    this.screen();
  },
};
