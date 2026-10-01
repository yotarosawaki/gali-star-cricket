// 育成: トレーニングのカットイン演出（約3秒の練習 → 成功/失敗 → 能力がピコピコ上がる）
const TRAIN_DUR = 3;

// 横向きの選手（右向き）。角度は「真下=0、前(右)へ回すと+」
function drawGuy(c, x, y, s, o) {
  const col = safeColor(o.color), skin = SKINS[o.skin] || SKINS[1];
  const L = (a, b) => { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
  c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot); c.scale(o.flip ? -s : s, s);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const lean = o.lean || 0, cr = o.crouch || 0;
  const hip = { x: lean * 4, y: -45 + cr }, sh = { x: lean * 18, y: -80 + cr * 1.3 };
  const legLen = 45 - cr * 0.3;
  c.strokeStyle = '#f4f4f4'; c.lineWidth = 10;
  for (const sg of [1, -1]) {
    const a = Math.sin(o.leg || 0) * 0.8 * sg + (o.stance || 0) * sg;
    const knee = { x: hip.x + Math.sin(a) * legLen * 0.5 + (o.leg != null ? 4 : 0), y: hip.y + Math.cos(a) * legLen * 0.5 };
    L(hip, knee); L(knee, { x: hip.x + Math.sin(a) * legLen, y: hip.y + Math.cos(a) * legLen });
  }
  const arm = (a, w, cc) => { const e = { x: sh.x + Math.sin(a) * 32, y: sh.y + Math.cos(a) * 32 }; c.strokeStyle = cc; c.lineWidth = w; L(sh, e); return e; };
  arm(o.armB != null ? o.armB : -0.4, 8, shade(col, 0.7));
  c.strokeStyle = col; c.lineWidth = 22; L(hip, sh);
  if (!o.flip) { c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '900 13px system-ui'; c.textAlign = 'center'; c.fillText('7', (hip.x + sh.x) / 2, (hip.y + sh.y) / 2 + 5); }
  const hand = arm(o.armF != null ? o.armF : 0.4, 8, col);
  if (o.bat != null) {
    c.strokeStyle = '#e9cb8d'; c.lineWidth = 8;
    L(hand, { x: hand.x + Math.sin(o.bat) * 50, y: hand.y + Math.cos(o.bat) * 50 });
    c.strokeStyle = '#333'; c.lineWidth = 5; L(hand, { x: hand.x + Math.sin(o.bat) * 10, y: hand.y + Math.cos(o.bat) * 10 });
  }
  if (o.glove) { c.fillStyle = '#f5c542'; c.beginPath(); c.arc(hand.x, hand.y, 8, 0, 7); c.fill(); }
  const hd = { x: sh.x + lean * 5, y: sh.y - 17 };
  c.fillStyle = skin; c.beginPath(); c.arc(hd.x, hd.y, 12.5, 0, 7); c.fill();
  c.fillStyle = shade(col, 0.6); c.beginPath(); c.arc(hd.x, hd.y - 2, 13, Math.PI, 0); c.fill();
  c.fillRect(hd.x, hd.y - 4, 17, 4);
  c.fillStyle = '#222'; c.beginPath(); c.arc(hd.x + 6, hd.y + 1, 1.8, 0, 7); c.fill();
  c.restore();
}

const TrainAnim = {
  // o: { kind, p, color, fail, great, before, got, lvUp, lv, staFrom, staTo, maxSta, mot, coaches }
  play(o) {
    return new Promise(resolve => {
      const cv = h('canvas', { class: 'tcv' });
      const staBar = h('i', { style: 'width:' + (o.staFrom / o.maxSta * 100) + '%;background:' + (o.staFrom < 40 ? '#e5484d' : '#3ddc84') });
      const staNum = h('small', null, o.staFrom);
      const res = h('div', { class: 'tres' });
      // 伸びる能力の行は最初から出しておき、結果が出たらピコピコ数字を上げる
      const rows = {};
      const makeRow = k => {
        const from = o.before[k];
        const r = { val: h('span', { class: 'sval' }, from), plus: h('span', { class: 'plusn' }, ''), bar: h('i', { style: 'width:' + from + '%;background:' + GRADE_COL[P.grade(from)] }), grade: h('span', null, UI.gradeBadge(P.grade(from), true)) };
        r.el = h('div', { class: 'stat crow' }, h('span', { class: 'sic' }, STAT_IC[k]), h('span', { class: 'slabel' }, t('st_' + k)), h('span', { class: 'bar' }, r.bar), r.val, r.grade, r.plus);
        rows[k] = r;
        return r.el;
      };
      const rowBox = h('div', { class: 'rowbox' }, (o.keys || []).map(makeRow));
      res.append(rowBox);
      let time = 0, shown = false, alive = true;
      const scr = h('div', { class: 'screen trainscr', onclick: () => { if (!shown) time = Math.max(time, TRAIN_DUR); } },
        h('div', { class: 'topbar' },
          h('div', { class: 'title' }, TRAIN[o.kind].ic, ' ', t('tr_' + o.kind)),
          h('div', { class: 'row tsta' }, '❤', h('span', { class: 'bar sta' }, staBar), staNum)),
        h('div', { class: 'tstage cutin' }, cv), res);
      UI.show(scr);
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = r.width, H = r.height, c = cv.getContext('2d');
      cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fired = {};
      const once = (k, fn) => { if (!fired[k]) { fired[k] = 1; fn(); } };
      const scene = TrainAnim.scenes[o.kind];
      // ❤ がじわじわ減る
      requestAnimationFrame(() => { staBar.style.transition = 'width 2.4s linear'; staBar.style.width = (o.staTo / o.maxSta * 100) + '%'; });
      let last = performance.now();
      const loop = now => {
        if (!alive) return;
        const dt = clamp((now - last) / 1000, 0, 0.05); last = now; time += dt;
        const tt = Math.min(time, TRAIN_DUR);
        staNum.textContent = Math.round(o.staFrom + (o.staTo - o.staFrom) * Math.min(1, tt / 2.4));
        c.save();
        TrainAnim.bg(c, W, H, o.kind, tt);
        scene(c, W, H, tt, o, once);
        TrainAnim.extras(c, W, H, tt, o);
        c.restore();
        if (time >= TRAIN_DUR && !shown) { shown = true; showResult(); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      const showResult = async () => {
        staNum.textContent = o.staTo; staBar.style.transition = 'none'; staBar.style.width = (o.staTo / o.maxSta * 100) + '%';
        const label = o.fail ? t('train_fail') : o.great ? t('train_great') : t('train_ok');
        o.fail ? SFX.bad() : o.great ? SFX.six() : SFX.good();
        res.append(h('div', { class: 'stamp ' + (o.fail ? 'ng' : o.great ? 'great' : 'ok') }, o.fail ? '🤕 ' : o.great ? '✨ ' : '⭕ ', label));
        await sleep(450);
        if (o.fail) {
          res.append(h('div', { class: 'effs big' }, h('span', { class: 'eff bad' }, '😟↓'), h('span', { class: 'eff bad' }, '❤-5')));
        }
        res.append(rowBox);
        for (const k of Object.keys(o.got || {})) {
          if (!rows[k]) rowBox.append(makeRow(k));
          const { val, plus, bar, grade, el } = rows[k], from = o.before[k], to = from + o.got[k];
          el.classList.add('on');
          await sleep(160);
          for (let v = from + 1; v <= to; v++) {
            val.textContent = v; bar.style.width = v + '%'; bar.style.background = GRADE_COL[P.grade(v)];
            plus.textContent = '+' + (v - from);
            grade.replaceChildren(UI.gradeBadge(P.grade(v), true));
            val.classList.remove('pop'); void val.offsetWidth; val.classList.add('pop');
            SFX.tone(700 + (v - from) * 90, 0.06, 'square', 0.07);
            await sleep(110);
          }
          await sleep(120);
        }
        if (o.maxStaUp) res.append(h('div', { class: 'effs big' }, h('span', { class: 'eff' }, '❤MAX +', o.maxStaUp)));
        if (o.lvUp) { SFX.coin(); res.append(h('div', { class: 'lvup' }, TRAIN[o.kind].ic, ' ⬆ Lv', o.lv)); }
        res.append(h('button', { class: 'btn wide', onclick: e => { e.stopPropagation(); SFX.click(); alive = false; resolve(); } }, '▶ ', t('next')));
      };
    });
  },

  /* ---------- 背景 ---------- */
  bg(c, W, H, kind, tt) {
    const gy = H * 0.84;
    const g = c.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, '#5cb8ff'); g.addColorStop(1, '#cdeeff');
    c.fillStyle = g; c.fillRect(0, 0, W, gy);
    // 街並み
    c.fillStyle = '#9fb6c9';
    const scroll = kind === 'run' ? (tt * 60) % 60 : 0;
    for (let i = -1; i < 12; i++) {
      const x = i * 60 - scroll, hh = 40 + ((i * 37) % 5) * 14;
      c.fillRect(x, gy - hh - 20, 50, hh + 20);
      if (i % 4 === 1) { c.beginPath(); c.arc(x + 25, gy - hh - 20, 18, Math.PI, 0); c.fill(); }
    }
    c.fillStyle = '#4caf50'; c.fillRect(0, gy - 22, W, H);
    c.fillStyle = '#3d9a42'; c.fillRect(0, gy, W, H - gy);
    if (kind === 'bat') { // ネット
      c.strokeStyle = 'rgba(40,40,40,.25)'; c.lineWidth = 1;
      for (let x = 0; x < W; x += 14) { c.beginPath(); c.moveTo(x, H * 0.12); c.lineTo(x, gy); c.stroke(); }
      for (let y = H * 0.12; y < gy; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.fillStyle = '#d8c08a'; c.fillRect(0, gy - 6, W, 10);
    }
    if (kind === 'bowl') { c.fillStyle = '#d8c08a'; c.fillRect(W * 0.1, gy - 6, W * 0.85, 10); }
  },
  extras(c, W, H, tt, o) {
    // 来てくれたコーチ
    (o.coaches || []).forEach((id, i) => {
      c.font = '30px system-ui'; c.textAlign = 'center';
      c.fillText(COACHES[id].ic, W - 26 - i * 36, H * 0.2 + Math.sin(tt * 10 + i) * 4);
      c.font = '16px system-ui'; c.fillText('📣', W - 40 - i * 36, H * 0.2 - 18);
    });
    // 集中線（カットイン）
    if (tt < 0.35) {
      const k = 1 - tt / 0.35;
      c.fillStyle = 'rgba(255,255,255,' + (0.8 * k) + ')';
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, r0 = Math.max(W, H) * (0.25 + 0.4 * (1 - k));
        c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
        c.lineTo(W / 2 + Math.cos(a + 0.05) * W, H / 2 + Math.sin(a + 0.05) * W);
        c.lineTo(W / 2 + Math.cos(a - 0.05) * W, H / 2 + Math.sin(a - 0.05) * W); c.fill();
      }
    }
    if (o.great && !o.fail) {
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4 + tt * 2, rr = 50 + (i * 13) % 60;
        c.font = (12 + (i % 3) * 5) + 'px system-ui'; c.textAlign = 'center';
        c.globalAlpha = 0.5 + 0.5 * Math.sin(tt * 8 + i);
        c.fillText('✨', W * 0.45 + Math.cos(a) * rr * 1.6, H * 0.5 + Math.sin(a) * rr);
      }
      c.globalAlpha = 1;
    }
    // 進行ゲージ
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, H - 6, W, 6);
    c.fillStyle = '#f5c542'; c.fillRect(0, H - 6, W * tt / TRAIN_DUR, 6);
  },
  sweat(c, x, y, tt) { c.font = '28px system-ui'; c.textAlign = 'center'; c.fillText('💦', x, y + Math.sin(tt * 12) * 3); },
  burst(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  },
  ball(c, x, y) { c.fillStyle = '#d0222e'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 4, -1, 1); c.stroke(); },

  /* ---------- 練習シーン ---------- */
  scenes: {
    // 打撃: ネットで3球打ちこむ
    bat(c, W, H, tt, o, once) {
      const gy = H * 0.84, s = H / 250, bx = W * 0.3, starts = [0.3, 1.2, 2.1], fly = 0.55;
      let bat = -2.3, armF = -1.1, lean = 0, missed = false;
      starts.forEach((st, i) => {
        const ta = st + fly, d = tt - ta, last = i === starts.length - 1, miss = o.fail && last;
        if (d > -0.12 && d < 0.45) {
          const k = clamp((d + 0.12) / 0.2, 0, 1), back = clamp((d - 0.25) / 0.2, 0, 1);
          bat = -2.3 + k * 4.2 - back * 4.2; armF = -1.1 + k * 2.5 - back * 2.5; lean = k * 0.25 * (1 - back);
        }
        const hp = { x: bx + 34 * s, y: gy - 52 * s };
        if (tt >= st && tt < ta) {
          const u = (tt - st) / fly, x = W * 1.05 + (hp.x - W * 1.05) * u;
          const y = u < 0.6 ? H * 0.42 + (gy - H * 0.42) * Math.pow(u / 0.6, 1.6) : gy - (gy - hp.y) * ((u - 0.6) / 0.4);
          TrainAnim.ball(c, x, y);
          if (u > 0.6) once('b' + i, () => SFX.bounce());
        } else if (tt >= ta && tt < ta + 0.8) {
          const v = (tt - ta) / 0.8;
          if (miss) { missed = true; TrainAnim.ball(c, hp.x - v * W * 0.6, hp.y + v * 30); once('h' + i, () => SFX.whiff()); }
          else {
            once('h' + i, () => SFX.hit(o.great ? 'perfect' : 'good'));
            if (v < 0.18) TrainAnim.burst(c, hp.x, hp.y, 26 * s * (1 - v * 3), o.great ? '#ffe14d' : '#fff');
            const x = hp.x + v * W * 0.9, y = hp.y - Math.sin(v * Math.PI * 0.85) * H * 0.55;
            c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(hp.x, hp.y); c.quadraticCurveTo((hp.x + x) / 2, y - 30, x, y); c.stroke();
            TrainAnim.ball(c, x, y);
          }
        }
      });
      if (o.fail && tt > starts[2] + fly + 0.1) { lean = -0.25; missed = true; }
      drawGuy(c, bx, gy, s, { color: o.color, skin: o.p.skin, bat, armF, armB: armF - 0.35, stance: 0.28, crouch: 6, lean });
      if (missed) TrainAnim.sweat(c, bx + 20 * s, gy - 120 * s, tt);
    },
    // 投球: 助走 → 腕をまわして → ウィケットをたおす（3球）
    bowl(c, W, H, tt, o, once) {
      const gy = H * 0.84, s = H / 250, cyc = 0.95, sx = W * 0.84;
      const i = Math.min(2, Math.floor(Math.max(0, tt - 0.1) / cyc)), u = Math.max(0, tt - 0.1 - i * cyc), last = i === 2, miss = o.fail && last;
      const runK = clamp(u / 0.45, 0, 1), x = W * 0.08 + runK * W * 0.24;
      const wk = clamp((u - 0.32) / 0.22, 0, 1);
      const armF = -0.5 - wk * 5.3;
      const rel = { x: x + 14 * s, y: gy - 118 * s };
      const tHit = 0.88;
      // ウィケット
      const hitK = u >= tHit && !miss ? (u - tHit) : 0;
      if (hitK) once('w' + i, () => { SFX.wicket(); });
      c.lineCap = 'round';
      [-1, 0, 1].forEach(j => {
        c.save(); c.translate(sx + j * 7 * s + j * hitK * 160 * s, gy - hitK * (120 - Math.abs(j) * 40) * s + hitK * hitK * 500 * s);
        c.rotate(j * hitK * 6 + hitK * 2);
        c.strokeStyle = '#f7e7b4'; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -56 * s); c.stroke(); c.restore();
      });
      if (!hitK) { c.strokeStyle = '#e5484d'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(sx - 10 * s, gy - 58 * s); c.lineTo(sx + 10 * s, gy - 58 * s); c.stroke(); }
      else TrainAnim.burst(c, sx, gy - 30 * s, 34 * s * Math.max(0, 1 - hitK * 4), '#ffe14d');
      // ボール
      if (u >= 0.5 && u < tHit + (miss ? 0.4 : 0)) {
        const v = (u - 0.5) / (tHit - 0.5), bxp = rel.x + (sx - rel.x) * v;
        const by = miss ? rel.y + (gy - 90 * s - rel.y) * v : v < 0.7 ? rel.y + (gy - rel.y) * (v / 0.7) : gy - (gy - (gy - 30 * s)) * ((v - 0.7) / 0.3);
        TrainAnim.ball(c, bxp, by);
        if (v >= 0.7 && !miss) once('bn' + i, () => SFX.bounce());
      }
      drawGuy(c, x, gy, s, { color: o.color, skin: o.p.skin, leg: runK < 1 ? u * 22 : 0, armF, armB: runK < 1 ? -Math.sin(u * 22) : 0.6, lean: runK < 1 ? 0.25 : wk > 0.5 ? 0.35 : 0 });
      if (miss && u > tHit) TrainAnim.sweat(c, x + 20 * s, gy - 120 * s, tt);
    },
    // 走りこみ: コーンを飛びこえながらダッシュ
    run(c, W, H, tt, o, once) {
      const gy = H * 0.84, s = H / 250, rx = W * 0.38;
      c.fillStyle = 'rgba(255,255,255,.25)';
      for (let i = 0; i < 12; i++) { const x = ((i * 70 - tt * W * 1.4) % (W + 70) + W + 70) % (W + 70) - 35; c.fillRect(x, gy + 8, 34, 6); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const y = gy - (30 + i * 16) * s, len = 30 + (i * 23 + tt * 300) % 50; c.beginPath(); c.moveTo(rx - 40 * s - len, y); c.lineTo(rx - 40 * s, y); c.stroke(); }
      let jump = 0, rot = 0, fall = false;
      [0.7, 1.6, 2.4].forEach((tc, i) => {
        const cx = rx + (tc - tt) * W * 0.9, last = i === 2;
        c.fillStyle = '#ff8a1c'; c.beginPath(); c.moveTo(cx, gy - 30 * s); c.lineTo(cx - 12 * s, gy); c.lineTo(cx + 12 * s, gy); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.fillRect(cx - 7 * s, gy - 16 * s, 14 * s, 4 * s);
        const d = tt - tc;
        if (o.fail && last) { if (d > -0.05) { fall = true; rot = Math.min(1.45, (d + 0.05) * 5); once('f', () => SFX.bad()); } }
        else if (Math.abs(d) < 0.25) { jump = Math.max(jump, Math.cos(d / 0.25 * Math.PI / 2) * 40 * s); once('j' + i, () => SFX.tone(520, 0.08, 'triangle', 0.1, 300)); }
      });
      const ph = tt * 18;
      drawGuy(c, rx, gy - jump + (fall ? rot * 8 * s : 0), s, { color: o.color, skin: o.p.skin, leg: fall ? 0.4 : ph, armF: fall ? 2.4 : Math.sin(ph) * 1.1, armB: fall ? 2 : -Math.sin(ph) * 1.1, lean: fall ? 0 : 0.35, rot: fall ? rot : 0 });
      if (!fall) { c.fillStyle = 'rgba(200,170,120,.6)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(rx - (20 + i * 14 + (tt * 200) % 14) * s, gy - 4, (5 - i) * s, 0, 7); c.fill(); } }
      if (fall) TrainAnim.sweat(c, rx + 50 * s, gy - 40 * s, tt);
    },
    // 守備: 飛んでくるボールに飛びついてキャッチ
    field(c, W, H, tt, o, once) {
      const gy = H * 0.84, s = H / 250, catches = [0.85, 1.75, 2.6], xs = [W * 0.3, W * 0.66, W * 0.42];
      let px = W * 0.5, dive = 0, dir = 1, dropped = false, glove = false;
      catches.forEach((tc, i) => {
        const prev = i ? xs[i - 1] : W * 0.5, last = i === 2, miss = o.fail && last;
        const mk = clamp((tt - (tc - 0.6)) / 0.45, 0, 1);
        if (tt >= tc - 0.6) { px = prev + (xs[i] - prev) * mk; dir = xs[i] >= prev ? 1 : -1; }
        const d = tt - tc;
        if (Math.abs(d) < 0.3) dive = Math.max(dive, 1 - Math.abs(d) / 0.3);
        const cp = { x: xs[i] + dir * 40 * s, y: gy - 85 * s };
        if (tt >= tc - 0.7 && tt < tc) {
          const v = (tt - (tc - 0.7)) / 0.7, sx0 = W * 1.02, sy0 = H * 0.15;
          TrainAnim.ball(c, sx0 + (cp.x - sx0) * v, sy0 + (cp.y - sy0) * v - Math.sin(v * Math.PI) * H * 0.18);
        } else if (d >= 0 && d < 0.6) {
          if (miss) { dropped = true; once('m', () => SFX.bad()); TrainAnim.ball(c, cp.x + d * 60, cp.y + Math.min(1, d * 3) * (gy - cp.y) - Math.abs(Math.sin(d * 9)) * 20 * (1 - d)); }
          else { glove = true; once('c' + i, () => SFX.good()); if (d < 0.2) TrainAnim.burst(c, cp.x, cp.y, 22 * s * (1 - d * 5), '#ffe14d'); }
        }
      });
      drawGuy(c, px, gy, s, { color: o.color, skin: o.p.skin, flip: dir < 0, lean: dive * 0.6, crouch: dive * 14, armF: 1.2 + dive * 1.4, armB: 0.8 + dive, glove: true, leg: dive > 0 ? 0 : tt * 14 });
      if (glove && !dropped) { c.font = '22px system-ui'; c.fillText('✨', px + dir * 30 * s, gy - 110 * s); }
      if (dropped) TrainAnim.sweat(c, px, gy - 125 * s, tt);
    },
  },
};
