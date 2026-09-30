// 試合の計算（投球データ・打球判定・オート進行の確率）
const angDiff = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };

const Engine = {
  zone(len) { return len < 2.6 ? 'yorker' : len > 7 ? 'short' : 'good'; },

  // 投球データを作る。len: 打者のウィケットからの距離(m) / line: 左右(m) / q: リリースの質(0..1)
  makeDelivery(b, len, line, type, q, hist) {
    const err = (1 - q) * (1.25 - b.control / 100);
    line = clamp(line + randn() * 0.45 * err, -1.3, 1.3);
    len = clamp(len + randn() * 2.2 * err, 1.4, 10);
    const isSpin = type === 'off' || type === 'leg';
    const stat = isSpin ? b.spin : b.pace;
    let time = isSpin ? 1.3 - b.pace * 0.002 : 1.18 - b.pace * 0.0048;
    if (type === 'swing') time += 0.05;
    if (q >= 0.95) time *= 0.96;
    let dev = 0, swing = 0;
    const turn = (0.08 + b.spin * 0.005) * (0.5 + q * 0.5);
    if (type === 'off') dev = turn;
    if (type === 'leg') dev = -turn;
    if (type === 'swing') swing = (0.25 + b.pace * 0.004) * (0.5 + 0.5 * q) * (Math.random() < 0.5 ? -1 : 1);
    const hb = 0.17 * (len - 1);
    const onStumps = Math.abs(line + dev) < 0.2 && hb < 0.72;
    const zone = Engine.zone(len);
    let diff = stat / 100 * 0.55 + b.control / 100 * 0.15 + q * 0.3;
    if (zone === 'yorker') diff += q >= 0.7 ? 0.12 : -0.18;
    if (zone === 'short') diff -= 0.06;
    if (type === 'swing') diff += 0.04 * q;
    if (Math.abs(line) > 0.8) diff -= 0.1;
    // 同じ球を続けると読まれる
    for (const hd of (hist || []).slice(-2)) if (hd.type === type && hd.zone === zone) diff -= 0.1;
    diff = clamp(diff, 0.05, 1);
    return { len, line, type, q, time, dev, swing, hb, onStumps, zone, diff, pace: b.pace, f: rint(0, FIELDS.length - 1) };
  },

  aiDelivery(b, hist) {
    const spin = b.spin > b.pace;
    const type = Math.random() < 0.8 ? (spin ? pick(['off', 'leg']) : pick(['fast', 'swing'])) : pick(BALL_TYPES);
    const r = Math.random();
    const len = r < 0.25 ? rnd(1.5, 2.5) : r < 0.8 ? rnd(3, 6.5) : rnd(7.2, 9.5);
    const line = clamp(randn() * 0.28, -0.9, 0.9);
    const pp = 0.15 + b.control / 250, r2 = Math.random();
    const q = r2 < pp ? 1 : r2 < pp + 0.5 ? 0.72 : 0.35;
    return Engine.makeDelivery(b, len, line, type, q, hist);
  },

  // 人が打つときのタイミング窓（秒）
  windows(batter, d) {
    const p = (14 + batter.timing * 0.26) / 1000 * (1.25 - 0.6 * d.diff);
    return { p, g: p * 2.3, o: p * 3.8 };
  },

  // 打球の行方を決める（人が打ったとき）
  resolveHit(o) {
    const { e, win, dir, batter, delivery: d, fieldAvg } = o;
    const field = FIELDS[d.f] || FIELDS[0];
    const ae = Math.abs(e);
    const q = ae <= win.p ? 'perfect' : ae <= win.g ? 'good' : 'ok';
    const qm = { perfect: 1, good: 0.74, ok: 0.42 }[q];
    const behind = Math.abs(dir) > 120 ? 0.7 : 1;
    const lenF = d.zone === 'yorker' ? 0.82 : d.zone === 'short' ? 1.08 : 1;
    let dist = (38 + batter.power * 0.68) * qm * rnd(0.88, 1.14) * behind * lenF * (1 - d.diff * 0.12);
    const res = { runs: 0, out: null, dir, dist, q, aerial: false, six: false, early: e < 0 };
    if ((q === 'perfect' && dist >= 76) || (q === 'good' && dist >= 84)) {
      res.six = true; res.aerial = true; res.runs = 6; res.dist = Math.max(dist, 84) + 8; return res;
    }
    // 打ちそこないは打ち上げてしまう
    if (q === 'ok' && Math.random() < 0.45) {
      res.aerial = true;
      const f = field.find(f => angDiff(f.a, dir) < 22 && Math.abs(f.r - dist) < 14);
      if (f) {
        res.dir = f.a; res.dist = f.r;
        if (Math.random() < 0.45 + fieldAvg / 200) res.out = 'caught'; else res.runs = 1;
        return res;
      }
      res.runs = dist >= 48 ? 2 : dist >= 20 ? 1 : 0; return res;
    }
    const reach = 13 + fieldAvg * 0.06;
    const f = field.filter(f => angDiff(f.a, dir) < reach && f.r <= dist + 4).sort((a, b) => a.r - b.r)[0];
    if (f) {
      res.dir = f.a; res.dist = f.r;
      res.runs = f.r < 40 ? (Math.random() < 0.3 + batter.speed / 250 ? 1 : 0) : (Math.random() < batter.speed / 300 ? 2 : 1);
      return res;
    }
    // 守備のいない所へ強く打てば、転がって境界まで届く
    if (dist >= 58) { res.runs = 4; res.dist = 72; }
    else if (dist >= 42) res.runs = Math.random() < batter.speed / 500 ? 3 : 2;
    else if (dist >= 20) res.runs = 1;
    else res.runs = Math.random() < batter.speed / 120 ? 1 : 0;
    return res;
  },

  // オート進行の1球。diff = 打者の強さ − 投手の強さ
  rollOutcome(diff, o = {}) {
    const d = clamp(diff / 60, -1.2, 1.2);
    let pOut = 0.075 * (1 - d * 0.7), p0 = 0.30 * (1 - d * 0.35), p1 = 0.30, p2 = 0.10 * (1 + d * 0.2), p4 = 0.14 * (1 + d * 0.8), p6 = 0.085 * (1 + d * 1.1);
    if (o.aggr === 2) { pOut *= 1.6; p4 *= 1.4; p6 *= 1.6; p1 *= 0.8; }
    if (o.aggr === 0) { pOut *= 0.55; p4 *= 0.6; p6 *= 0.4; p1 *= 1.2; }
    if (o.bowlAggr === 2) { pOut *= 1.3; p4 *= 1.25; p6 *= 1.15; }
    if (o.bowlAggr === 0) { pOut *= 0.8; p4 *= 0.78; p6 *= 0.85; p1 *= 1.15; }
    const f = ((o.fld == null ? 40 : o.fld) - 40) / 100;
    pOut *= (1 + f) * (o.outMul || 1); p4 *= 1 - f * 0.6; p2 *= 1 - f * 0.5;
    const ps = [pOut, p0, p1, p2, p4, p6].map(p => Math.max(0.008, p));
    let r = Math.random() * ps.reduce((a, b) => a + b, 0);
    const outs = [{ out: true, runs: 0 }, { runs: 0 }, { runs: 1 }, { runs: 2 }, { runs: 4 }, { runs: 6 }];
    for (let i = 0; i < ps.length; i++) { r -= ps[i]; if (r <= 0) return outs[i]; }
    return outs[1];
  },

  // CPUが打つときの結果（アニメ用に方向と距離も作る）
  aiBatResult(d, batter, fieldAvg, aggr) {
    const field = FIELDS[d.f] || FIELDS[0];
    const o = Engine.rollOutcome(P.batR(batter) - d.diff * 100 + 10, { aggr, fld: fieldAvg, outMul: d.onStumps ? 1.25 : 0.85 });
    const gap = () => { for (let i = 0; i < 30; i++) { const a = rnd(-180, 180); if (!field.some(f => angDiff(f.a, a) < 18)) return a; } return rnd(-60, 60); };
    const res = { runs: o.runs || 0, out: null, dir: 0, dist: 0, q: 'good', aerial: false, six: false };
    if (o.out) {
      if (d.onStumps && Math.random() < 0.75) { res.out = 'bowled'; return res; }
      const f = pick(field); res.out = 'caught'; res.dir = f.a; res.dist = f.r; res.aerial = true; return res;
    }
    if (o.runs === 6) { res.six = true; res.aerial = true; res.dir = rnd(-100, 100); res.dist = 92; res.q = 'perfect'; }
    else if (o.runs === 4) { res.dir = gap(); res.dist = 72; }
    else if (o.runs === 2) { res.dir = gap(); res.dist = 52; }
    else if (o.runs === 1) { const f = pick(field.filter(f => f.r > 40)); res.dir = f.a; res.dist = f.r; }
    else if (d.onStumps || Math.random() < 0.5) { const f = pick(field.filter(f => f.r < 40)); res.dir = f.a; res.dist = f.r; }
    else res.miss = true;
    return res;
  },
};
