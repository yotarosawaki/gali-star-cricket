// 打撃・投球のアクション画面（Canvas）
// 奥行きz(m)・左右x(m)・高さy(m) の世界を、簡単な透視投影で描く
const CAM_K = 6;

class ActionView {
  constructor(el) {
    this.el = el;
    this.cv = h('canvas', { class: 'actioncv' });
    this.bar = h('div', { class: 'typebar' });
    el.append(this.cv, this.bar);
    this.ctx = this.cv.getContext('2d');
    this.crowd = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), c: pick(['#e8e8e8', '#f5c542', '#e5484d', '#4fb3ff', '#3ddc84', '#c9c9c9']) }));
    this.cz = 0; this.shake = 0; this.tick = null; this.alive = true; this.time = 0;
    this.resize();
    this._rs = () => this.resize();
    window.addEventListener('resize', this._rs);
    if (window.ResizeObserver) { this._ro = new ResizeObserver(this._rs); this._ro.observe(el); }
    const pt = e => { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    this.cv.addEventListener('pointerdown', e => { e.preventDefault(); SFX.init(); if (this.onDown) this.onDown(pt(e)); });
    this.cv.addEventListener('pointermove', e => { if (this.onMove) this.onMove(pt(e)); });
    this.cv.addEventListener('pointerup', e => { if (this.onUp) this.onUp(pt(e)); });
    this.cv.addEventListener('pointercancel', () => { if (this.onUp) this.onUp(null); });
    let last = performance.now();
    const loop = now => {
      if (!this.alive) return;
      const dt = clamp((now - last) / 1000, 0, 0.05); last = now; this.time += dt;
      if (this.tick) this.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  destroy() { this.alive = false; this.tick = null; window.removeEventListener('resize', this._rs); if (this._ro) this._ro.disconnect(); this.el.replaceChildren(); }
  resize() {
    const r = this.el.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.round(r.width)), hh = Math.max(200, Math.round(r.height));
    if (w === this.W && hh === this.H) return;
    this.W = w; this.H = hh;
    this.cv.width = this.W * dpr; this.cv.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.yH = this.H * 0.28; this.yB = this.H * 0.93;
    this.setCam(this.mode || 'bat');
  }
  setCam(mode) {
    this.mode = mode;
    if (mode === 'bat') { this.cz = 0; this.ppm = this.W * 0.27; } else { this.cz = 7; this.ppm = this.W * 0.4; }
  }
  sc(z) { return CAM_K / (Math.max(z - this.cz, -CAM_K + 1.5) + CAM_K); }
  proj(x, y, z) { const s = this.sc(z), u = this.ppm * s; return { x: this.W / 2 + x * u, y: this.yH + (this.yB - this.yH) * s - y * u, u }; }
  unproj(sx, sy) {
    const s = (sy - this.yH) / (this.yB - this.yH);
    if (s < 0.08) return null;
    return { z: CAM_K / s - CAM_K + this.cz, x: (sx - this.W / 2) / (this.ppm * s) };
  }
  // fn(t, dt) が true を返すまで毎フレーム呼ぶ
  play(fn) {
    return new Promise(res => {
      let t = 0;
      this.tick = dt => { t += dt; if (fn(t, dt) === true) { this.tick = null; res(); } };
    });
  }

  /* ---------- 描画部品 ---------- */
  begin() {
    const c = this.ctx;
    c.save();
    if (this.shake > 0.3) { c.translate(rnd(-1, 1) * this.shake, rnd(-1, 1) * this.shake); this.shake *= 0.86; } else this.shake = 0;
  }
  end() { this.ctx.restore(); }
  drawBG() {
    const c = this.ctx, W = this.W, H = this.H, yH = this.yH;
    let g = c.createLinearGradient(0, 0, 0, yH);
    g.addColorStop(0, '#0a1730'); g.addColorStop(1, '#2a5a9a');
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, yH + 20);
    const sh = H * 0.1;
    c.fillStyle = '#18202e'; c.fillRect(-20, yH - sh, W + 40, sh);
    for (const d of this.crowd) { c.fillStyle = d.c; c.fillRect(d.x * W, yH - sh + 3 + d.y * (sh - 8), 2.5, 2.5); }
    for (const lx of [0.12, 0.88]) {
      c.fillStyle = '#9aa7b8'; c.fillRect(lx * W - 2, yH - sh - H * 0.11, 4, H * 0.11);
      c.fillStyle = '#fff8d0'; c.fillRect(lx * W - 14, yH - sh - H * 0.13, 28, 12);
      const gl = c.createRadialGradient(lx * W, yH - sh - H * 0.12, 2, lx * W, yH - sh - H * 0.12, 70);
      gl.addColorStop(0, 'rgba(255,248,208,.45)'); gl.addColorStop(1, 'rgba(255,248,208,0)');
      c.fillStyle = gl; c.fillRect(lx * W - 70, yH - sh - H * 0.12 - 70, 140, 140);
    }
    g = c.createLinearGradient(0, yH, 0, H);
    g.addColorStop(0, '#2f9440'); g.addColorStop(1, '#1d6a2c');
    c.fillStyle = g; c.fillRect(-20, yH, W + 40, H - yH + 20);
    c.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 9; i += 2) { const y0 = this.proj(0, 0, this.cz - 3 + i * 4).y, y1 = this.proj(0, 0, this.cz + 1 + i * 4).y; c.fillRect(-20, y1, W + 40, y0 - y1); }
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, yH + 3); c.lineTo(W + 20, yH + 3); c.stroke();
  }
  quad(x0, x1, z0, z1, fill) {
    const c = this.ctx, a = this.proj(x0, 0, z0), b = this.proj(x1, 0, z0), d = this.proj(x1, 0, z1), e = this.proj(x0, 0, z1);
    c.fillStyle = fill; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
  }
  gline(x0, z0, x1, z1, col, w) {
    const c = this.ctx, a = this.proj(x0, 0, z0), b = this.proj(x1, 0, z1);
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
  drawPitch(zones) {
    const bat = this.mode === 'bat';
    this.quad(-1.52, 1.52, this.cz - 3, 20.6, '#d8c08a');
    this.quad(-1.52, 1.52, this.cz - 3, 20.6, 'rgba(120,80,30,.08)');
    if (zones) {
      this.quad(-1.2, 1.2, 9.2, 12.2, 'rgba(245,197,66,.28)');
      this.quad(-1.2, 1.2, 12.2, 16.6, 'rgba(61,220,132,.3)');
      this.quad(-1.2, 1.2, 16.6, 17.8, 'rgba(229,72,77,.34)');
      this.quad(-0.2, 0.2, 9.2, 17.8, 'rgba(255,255,255,.18)');
    }
    const lines = bat ? [0.8, 2.0, 18.4, 19.6] : [18.0, 19.2];
    for (const z of lines) this.gline(-1.52, z, 1.52, z, 'rgba(255,255,255,.9)', Math.max(1.5, this.proj(0, 0, z).u * 0.05));
  }
  stumps(z) {
    const c = this.ctx;
    c.lineCap = 'round';
    for (const x of [-0.115, 0, 0.115]) {
      const a = this.proj(x, 0, z), b = this.proj(x, 0.71, z);
      c.strokeStyle = '#f7e7b4'; c.lineWidth = Math.max(2, a.u * 0.045);
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
    const l = this.proj(-0.14, 0.74, z), r = this.proj(0.14, 0.74, z);
    c.strokeStyle = '#e5484d'; c.lineWidth = Math.max(1.5, l.u * 0.035);
    c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(r.x, r.y); c.stroke();
  }
  person(x, z, o) {
    const c = this.ctx, p = this.proj(x, 0, z), u = p.u, col = safeColor(o.color);
    const L = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
    c.save(); c.translate(p.x, p.y); c.scale(u, u); c.lineCap = 'round';
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 0.32, 0.09, 0, 0, 7); c.fill();
    const sw = o.pose === 'run' ? Math.sin(this.time * 18) * 0.2 : 0;
    c.strokeStyle = '#f4f4f4'; c.lineWidth = 0.14;
    L(-0.1, -0.85, -0.13 + sw, -0.04); L(0.1, -0.85, 0.13 - sw, -0.04);
    c.fillStyle = col; c.fillRect(-0.23, -1.47, 0.46, 0.68);
    c.strokeStyle = col; c.lineWidth = 0.12;
    let hx = 0.2, hy = -1.0;
    if (o.pose === 'release') { L(0.2, -1.4, 0.34, -2.02); L(-0.2, -1.4, -0.42, -1.1); }
    else if (o.pose === 'run') { L(0.2, -1.4, 0.36, -1.05 + sw); L(-0.2, -1.4, -0.36, -1.05 - sw); }
    else { L(0.2, -1.38, hx, hy); L(-0.2, -1.38, hx - 0.06, hy - 0.04); }
    c.fillStyle = SKINS[o.skin] || SKINS[1]; c.beginPath(); c.arc(0, -1.63, 0.145, 0, 7); c.fill();
    c.fillStyle = shade(col, 0.65); c.beginPath(); c.arc(0, -1.65, 0.16, Math.PI, 0); c.fill();
    if (o.pose === 'bat' || o.pose === 'swing') {
      const a0 = Math.atan2(0.9, 0.22);
      let a = a0;
      if (o.pose === 'swing') {
        const r = o.dir * Math.PI / 180, a1 = Math.atan2(-Math.cos(r), Math.sin(r));
        let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        a = a0 + da * clamp(o.k, 0, 1);
      }
      c.strokeStyle = '#e9cb8d'; c.lineWidth = 0.13;
      L(hx, hy, hx + Math.cos(a) * 0.88, hy + Math.sin(a) * 0.88);
    }
    c.restore();
  }
  ball(pos) {
    const c = this.ctx, g = this.proj(pos.x, 0, pos.z), b = this.proj(pos.x, Math.max(0, pos.y), pos.z), r = Math.max(3, b.u * 0.1);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(g.x, g.y, r * 1.1, r * 0.4, 0, 0, 7); c.fill();
    const gr = c.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, b.x, b.y, r);
    gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(1, '#c21f2a');
    c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, r, 0, 7); c.fill();
    return { x: b.x, y: b.y, r };
  }
  marker(line, z, col) {
    const c = this.ctx, p = this.proj(line, 0, z), r = p.u * 0.36 * (1 + Math.sin(this.time * 9) * 0.08);
    c.strokeStyle = col || '#ffe14d'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(p.x, p.y, r, r * 0.38, 0, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,225,77,.3)'; c.fill();
  }
  text(str, x, y, size, col, stroke) {
    const c = this.ctx;
    c.font = '900 ' + size + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (stroke) { c.lineWidth = size * 0.14; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, x, y); }
    c.fillStyle = col; c.fillText(str, x, y);
  }
  radar(field, col) {
    const c = this.ctx, cx = 44, cy = 46, R = 34;
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(cx, cy, R + 5, 0, 7); c.fill();
    c.fillStyle = '#2f9440'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#d8c08a'; c.fillRect(cx - 2, cy - 5, 4, 10);
    for (const f of field) {
      const a = f.a * Math.PI / 180, r = f.r / 70 * R;
      c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 1;
      c.beginPath(); c.arc(cx + Math.sin(a) * r, cy - Math.cos(a) * r, 3.2, 0, 7); c.fill(); c.stroke();
    }
  }
  vignette(a) {
    const c = this.ctx, g = c.createRadialGradient(this.W / 2, this.H * 0.6, this.H * 0.2, this.W / 2, this.H * 0.6, this.H * 0.75);
    g.addColorStop(0, 'rgba(0,10,40,0)'); g.addColorStop(1, 'rgba(0,10,40,' + a + ')');
    c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
  }
  // ボールの軌道。gt(秒)→位置
  path(d) {
    const bat = this.mode === 'bat';
    const zR = bat ? 19 : this.cz - 0.8, zP = bat ? 2.0 : 18.0, zb = bat ? 0.8 + d.len : 19.2 - d.len;
    const T = d.time, tb = T * (zb - zR) / (zP - zR), x0 = 0.35;
    return gt => {
      const z = zR + (zP - zR) * (gt / T);
      if (gt < tb) {
        const u = gt / tb;
        return { x: x0 + (d.line - x0) * u + d.swing * Math.sin(Math.PI * u), y: (bat ? 2.1 : 1.0) * (1 - u) + 0.35 * Math.sin(Math.PI * u), z };
      }
      const v = Math.min(1.25, (gt - tb) / (T - tb));
      return { x: d.line + d.dev * v, y: d.hb * (1 - (1 - v) * (1 - v)), z };
    };
  }

  /* ---------- 打撃 ---------- */
  async bat(o) {
    this.setCam('bat'); this.bar.replaceChildren();
    const d = o.delivery, T = d.time, zb = 0.8 + d.len, field = FIELDS[d.f] || FIELDS[0];
    const win = Engine.windows(o.batter, d), pos = this.path(d);
    const tStump = T * (0.8 - 19) / (2.0 - 19);
    const slowScale = clamp(0.3 + (d.pace - 40) / 250, 0.3, 0.55);
    let gt = -0.9, swung = null, contact = null, sa = 0, down = null, bounced = false;
    const trigger = dir => {
      if (swung || gt < 0) return;
      swung = { dir, e: gt - T };
      if (Math.abs(swung.e) <= win.o) {
        contact = Engine.resolveHit({ e: swung.e, win, dir, batter: o.batter, delivery: d, fieldAvg: o.fieldAvg });
        SFX.hit(contact.q); this.shake = contact.q === 'perfect' ? 10 : 4;
      } else SFX.whiff();
    };
    const ang = (a, b) => Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI;
    this.onDown = p => { down = p; };
    this.onMove = p => { if (down && !swung && Math.hypot(p.x - down.x, p.y - down.y) >= 26) trigger(ang(down, p)); };
    this.onUp = p => { if (down && !swung && p) { const dist = Math.hypot(p.x - down.x, p.y - down.y); trigger(dist < 10 ? 0 : ang(down, p)); } down = null; };

    const hitPt = () => this.proj(d.line + d.dev, d.hb, 2.0);
    const render = () => {
      const c = this.ctx;
      this.begin(); this.drawBG(); this.drawPitch(false);
      this.stumps(19.6);
      this.person(0.35, 19.2 + Math.max(0, -gt) * 4.5, { color: o.bowlColor, skin: o.bowler.skin, pose: gt < 0 ? 'run' : 'release' });
      if (gt > -0.3) this.marker(d.line, zb);
      const slow = gt > T - 0.22 && gt < T + 0.05 && !swung;
      if (gt >= 0 && !contact) {
        if (gt > T - 0.6 && gt < T + win.o && !swung) {
          const hp = hitPt(), rr = Math.max(0, T - gt) * 230 + hp.u * 0.1;
          c.strokeStyle = Math.abs(gt - T) <= win.g ? '#ffe14d' : 'rgba(255,255,255,.85)'; c.lineWidth = 3;
          c.beginPath(); c.arc(hp.x, hp.y, rr, 0, 7); c.stroke();
          c.strokeStyle = 'rgba(255,225,77,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(hp.x, hp.y, hp.u * 0.13, 0, 7); c.stroke();
        }
        this.ball(pos(gt));
      }
      this.stumps(0.8);
      this.person(-0.62, 2.0, swung ? { color: o.batColor, skin: o.batter.skin, pose: 'swing', dir: swung.dir, k: sa / 0.12 } : { color: o.batColor, skin: o.batter.skin, pose: 'bat' });
      if (contact) {
        const hp = hitPt();
        c.fillStyle = contact.q === 'perfect' ? 'rgba(255,225,77,.95)' : 'rgba(255,255,255,.85)';
        c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = (i % 2 ? 14 : 36) * (contact.q === 'perfect' ? 1.5 : 1); c.lineTo(hp.x + Math.cos(a) * r, hp.y + Math.sin(a) * r); } c.closePath(); c.fill();
      }
      if (slow) this.vignette(0.55);
      this.radar(field, safeColor(o.bowlColor));
      if (o.hint && gt > 0 && !swung) {
        const k = (this.time * 1.2) % 1;
        c.globalAlpha = 0.9; this.text('👆', this.W * 0.72, this.H * 0.82 - k * this.H * 0.16, 44, '#fff'); c.globalAlpha = 1;
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.setLineDash([6, 8]);
        c.beginPath(); c.moveTo(this.W * 0.72, this.H * 0.86); c.lineTo(this.W * 0.72, this.H * 0.62); c.stroke(); c.setLineDash([]);
      }
      if (swung && !contact) this.text(swung.e < 0 ? '⏪' : '⏩', this.W / 2, this.H * 0.45, 40, '#fff');
      this.end();
    };
    this.scene = render;
    await this.play((t, dt) => {
      const slow = gt > T - 0.22 && gt < T + 0.05 && !swung;
      gt += dt * (gt >= 0 && slow ? slowScale : 1);
      this.dbg = { gt, T };
      if (swung) sa += dt;
      if (!bounced && gt >= T * (zb - 19) / (2.0 - 19)) { bounced = true; SFX.bounce(); }
      render();
      if (contact) return sa > 0.1;
      return gt >= tStump;
    });
    this.onDown = this.onMove = this.onUp = null;
    if (contact) { await this.animField(contact, o.bowlColor, field); return contact; }
    if (d.onStumps) { await this.animBowled(); return { runs: 0, out: 'bowled', dir: 0, dist: 0 }; }
    await this.animPop('0', '#c8d3dc');
    return { runs: 0, out: null, dir: 0, dist: 0, miss: true };
  }

  /* ---------- 投球: ①場所 ②球種 ③リリース ---------- */
  bowlInput(o) {
    this.setCam('bowl');
    return new Promise(resolve => {
      let step = 1, spot = null, type = null, gt = 0, done = false, flash = null;
      const P0 = 1.0 + o.bowler.control * 0.008, RT = 36, R0 = RT * 3.2;
      const icons = { fast: '⚡', swing: '↪️', off: '↻', leg: '↺' };
      const showBar = () => {
        this.bar.replaceChildren(...BALL_TYPES.map(k => h('button', {
          class: 'typebtn', onclick: () => { SFX.click(); type = k; step = 3; gt = 0; this.bar.replaceChildren(); },
        }, h('span', { class: 'tic' }, icons[k]), h('small', null, t('bt_' + k)))));
      };
      const release = () => {
        const r = R0 * (1 - (gt % P0) / P0), err = Math.abs(r - RT) / RT;
        const q = err < 0.14 ? 1 : err < 0.45 ? 0.72 : 0.35;
        finish(q);
      };
      const finish = q => {
        if (done) return; done = true;
        q >= 0.95 ? SFX.good() : q < 0.5 ? SFX.bad() : SFX.click();
        flash = { q, t: 0 };
      };
      this.onDown = p => {
        if (done) return;
        if (step < 3) {
          const w = this.unproj(p.x, p.y);
          if (!w) return;
          spot = { len: clamp(19.2 - w.z, 1.4, 10), line: clamp(w.x, -1.1, 1.1) };
          SFX.click();
          if (step === 1) { step = 2; showBar(); }
        } else release();
      };
      this.onMove = this.onUp = null;
      const render = () => {
        const c = this.ctx;
        this.begin(); this.drawBG(); this.drawPitch(step < 3);
        this.stumps(19.2);
        this.person(-0.55, 18.0, { color: o.batColor, skin: o.batter.skin, pose: 'bat' });
        if (spot) this.marker(spot.line, 19.2 - spot.len);
        if (step === 1) {
          const p = this.proj(0, 0, 14.5);
          this.text('👆', p.x + 8, p.y + 18 + Math.sin(this.time * 6) * 8, 46, '#fff');
        }
        if (step === 3) {
          const cx = this.W / 2, cy = this.H * 0.72;
          c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(cx, cy, R0 + 8, 0, 7); c.fill();
          c.strokeStyle = '#ffe14d'; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, RT, 0, 7); c.stroke();
          c.fillStyle = '#c21f2a'; c.beginPath(); c.arc(cx, cy, 13, 0, 7); c.fill();
          if (!done) {
            const r = R0 * (1 - (gt % P0) / P0);
            c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, Math.max(1, r), 0, 7); c.stroke();
            if (o.hint) this.text('👆', cx + 70, cy + 30 + Math.sin(this.time * 6) * 6, 40, '#fff');
          } else {
            const stars = flash.q >= 0.95 ? '★★★' : flash.q >= 0.7 ? '★★' : '★';
            this.text(stars, cx, cy - 70, 40, flash.q >= 0.95 ? '#ffe14d' : '#fff', '#000');
          }
        }
        this.end();
      };
      this.scene = render;
      this.tick = dt => {
        if (step === 3 && !done) { gt += dt; if (gt > P0 * 3) finish(0.35); }
        if (flash) flash.t += dt;
        render();
        if (flash && flash.t > 0.45) {
          this.tick = null; this.onDown = null;
          resolve(Engine.makeDelivery(o.bowler, spot.len, spot.line, type, flash.q, o.hist));
        }
      };
    });
  }

  // 投げたボールが飛んでいく → 結果を待って演出
  async bowlShow(d, resultPromise, o) {
    this.setCam('bowl'); this.bar.replaceChildren();
    const T = d.time, pos = this.path(d), field = FIELDS[d.f] || FIELDS[0];
    let gt = 0, res = null, failed = null, bounced = false;
    resultPromise.then(r => { res = r; }, e => { failed = e || new Error('net'); });
    const render = wait => {
      this.begin(); this.drawBG(); this.drawPitch(false);
      this.stumps(19.2);
      this.marker(d.line, 19.2 - d.len);
      const sw = gt >= T * 0.93;
      this.person(-0.55, 18.0, sw ? { color: o.batColor, skin: o.batter.skin, pose: 'swing', dir: 20, k: (gt - T * 0.93) / 0.1 } : { color: o.batColor, skin: o.batter.skin, pose: 'bat' });
      if (gt < T) this.ball(pos(gt));
      if (wait) this.text('⏳', this.W / 2, this.H * 0.5, 50 + Math.sin(this.time * 5) * 4, '#fff');
      this.end();
    };
    this.scene = () => render(false);
    await this.play((t, dt) => {
      gt += dt;
      if (!bounced && gt >= T * (19.2 - d.len - (this.cz - 0.8)) / (18.0 - (this.cz - 0.8))) { bounced = true; SFX.bounce(); }
      render(gt > T + 0.4 && !res);
      if (failed) return true;
      return gt >= T && !!res;
    });
    if (failed) throw failed;
    if (res.out === 'bowled') await this.animBowled();
    else if (res.miss || (!res.dist && !res.out)) await this.animPop('0', '#c8d3dc');
    else { SFX.hit(res.q); await this.animField(res, o.bowlColor, field); }
    return res;
  }

  /* ---------- 結果の演出 ---------- */
  popDraw(label, col, k, big) {
    const c = this.ctx, cx = this.W / 2, cy = this.H * 0.42;
    const s = k < 1 ? 1 + 2.2 * Math.pow(1 - k, 2) * Math.sin(k * Math.PI) + (1 - k) * 0.3 : 1;
    if (big) {
      c.save(); c.translate(cx, cy); c.rotate(this.time * 0.8);
      for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = 'rgba(255,225,77,' + (0.22 * Math.min(1, k * 2)) + ')'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-22, -this.H); c.lineTo(22, -this.H); c.closePath(); c.fill(); }
      c.restore();
    }
    this.text(label, cx, cy, (big ? 150 : 110) * Math.min(1, this.W / 380) * s * Math.min(1, k * 4 + 0.2), col, '#0b1d12');
  }
  animPop(label, col) {
    SFX.click();
    return this.play(t => {
      if (this.scene) this.scene();
      this.ctx.fillStyle = 'rgba(0,0,0,.35)'; this.ctx.fillRect(0, 0, this.W, this.H);
      this.popDraw(label, col, Math.min(1, t / 0.3), false);
      return t > 0.9;
    });
  }
  animField(res, fieldCol, field) {
    const W = this.W, H = this.H, cx = W / 2, cy = H * 0.52, R = Math.min(W * 0.44, H * 0.4), px = R / 70;
    const a = res.dir * Math.PI / 180, dist = res.dist, tm = res.six ? 1.2 : 0.45 + dist / 110;
    const label = res.out ? 'OUT' : String(res.runs);
    const col = res.out ? '#ff5d5d' : res.runs === 6 ? '#ffe14d' : res.runs === 4 ? '#5ee1ff' : res.runs ? '#fff' : '#c8d3dc';
    const conf = Array.from({ length: 50 }, () => ({ x: rnd(0, W), y: rnd(-H, 0), v: rnd(120, 320), c: pick(['#ffe14d', '#e5484d', '#fff', '#3ddc84']) }));
    let landed = false;
    return this.play((t, dt) => {
      const c = this.ctx, p = Math.min(1, t / tm), e = 1 - (1 - p) * (1 - p);
      this.begin();
      c.fillStyle = '#0c1a12'; c.fillRect(-20, -20, W + 40, H + 40);
      c.fillStyle = '#18202e'; c.beginPath(); c.arc(cx, cy, R * 1.32, 0, 7); c.fill();
      for (let i = 0; i < 120; i++) { const d = this.crowd[i], aa = d.x * Math.PI * 2, rr = R * (1.06 + d.y * 0.24); c.fillStyle = d.c; c.fillRect(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr, 2.5, 2.5); }
      const g = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R); g.addColorStop(0, '#36a048'); g.addColorStop(1, '#23792f');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.strokeStyle = landed && res.runs >= 4 ? col : '#fff'; c.lineWidth = landed && res.runs >= 4 ? 5 : 2.5; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.setLineDash([5, 6]); c.beginPath(); c.arc(cx, cy, 30 * px, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#d8c08a'; c.fillRect(cx - 1.6 * px, cy - 10 * px, 3.2 * px, 20 * px);
      for (const f of field) {
        const fa = f.a * Math.PI / 180, fx = cx + Math.sin(fa) * f.r * px, fy = cy - Math.cos(fa) * f.r * px;
        c.fillStyle = safeColor(fieldCol); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(fx, fy, 6, 0, 7); c.fill(); c.stroke();
      }
      const bx = cx + Math.sin(a) * dist * px * e, by = cy - Math.cos(a) * dist * px * e;
      const hgt = Math.sin(Math.PI * p) * (res.six ? 34 : res.aerial ? 20 : 0);
      c.strokeStyle = res.six ? 'rgba(255,225,77,.7)' : 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(bx, by); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(bx, by, 4, 0, 7); c.fill();
      c.fillStyle = '#e5484d'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, by - hgt, 5 + hgt * 0.16, 0, 7); c.fill(); c.stroke();
      if (p >= 1) {
        if (!landed) {
          landed = true;
          if (res.out) SFX.out(); else if (res.runs === 6) { SFX.six(); this.shake = 14; } else if (res.runs === 4) SFX.four(); else SFX.click();
        }
        const k = Math.min(1, (t - tm) / 0.3);
        if (res.out) this.text('🧤', bx, by - 26, 34, '#fff');
        if (res.runs === 6) for (const f of conf) { f.y += f.v * dt; c.fillStyle = f.c; c.fillRect(f.x, f.y, 6, 10); }
        this.popDraw(label, col, k, res.runs === 6);
      }
      this.end();
      return t > tm + (res.runs >= 4 || res.out ? 1.5 : 0.9);
    });
  }
  // ウィケット粉砕のクローズアップ
  animBowled() {
    const W = this.W, H = this.H, cx = W / 2, gy = H * 0.74, sh = H * 0.36, gap = W * 0.085, tHit = 0.22;
    const st = [-1, 0, 1].map(i => ({ x: cx + i * gap, y: gy, r: 0, vx: i * 160 + rnd(-40, 40), vy: -rnd(260, 420), vr: i * 3 + rnd(-2, 2) }));
    const bails = [-1, 1].map(i => ({ x: cx + i * gap * 0.5, y: gy - sh - 6, r: 0, vx: i * rnd(120, 260), vy: -rnd(420, 620), vr: rnd(-12, 12) }));
    const bits = Array.from({ length: 26 }, () => ({ x: cx, y: gy - sh * 0.45, vx: rnd(-320, 320), vy: rnd(-420, 80), c: pick(['#ffe14d', '#fff', '#e9cb8d']) }));
    let hit = false;
    return this.play((t, dt) => {
      const c = this.ctx;
      this.begin();
      const g = c.createRadialGradient(cx, gy - sh * 0.5, 20, cx, gy - sh * 0.5, H * 0.8);
      g.addColorStop(0, '#2b6e3a'); g.addColorStop(1, '#07140c');
      c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
      c.fillStyle = '#d8c08a'; c.fillRect(-20, gy, W + 40, H);
      if (t >= tHit && !hit) { hit = true; SFX.wicket(); this.shake = 18; }
      if (hit) {
        for (const o of [...st, ...bails, ...bits]) { o.vy += 1500 * dt; o.x += o.vx * dt; o.y += o.vy * dt; if (o.vr) o.r += o.vr * dt; }
        for (const s of st) if (s.y > gy) { s.y = gy; s.vy *= -0.3; s.vx *= 0.7; s.vr *= 0.7; }
      }
      c.lineCap = 'round';
      for (const s of st) {
        c.save(); c.translate(s.x, s.y); c.rotate(s.r);
        c.strokeStyle = '#f7e7b4'; c.lineWidth = W * 0.035; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -sh); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = W * 0.01; c.beginPath(); c.moveTo(W * 0.008, 0); c.lineTo(W * 0.008, -sh); c.stroke();
        c.restore();
      }
      for (const b of bails) {
        c.save(); c.translate(b.x, b.y); c.rotate(b.r);
        c.strokeStyle = '#e5484d'; c.lineWidth = W * 0.022; c.beginPath(); c.moveTo(-gap * 0.42, 0); c.lineTo(gap * 0.42, 0); c.stroke(); c.restore();
      }
      if (hit) for (const b of bits) { c.fillStyle = b.c; c.fillRect(b.x, b.y, 5, 5); }
      const k = Math.min(1, t / tHit), bx = cx + (1 - k) * W * 0.5, by = gy - sh * 0.45 - (1 - k) * H * 0.35;
      if (!hit) { c.fillStyle = '#c21f2a'; c.beginPath(); c.arc(bx, by, W * 0.05, 0, 7); c.fill(); }
      else {
        const fl = Math.max(0, 1 - (t - tHit) / 0.18);
        if (fl > 0) { c.fillStyle = 'rgba(255,255,255,' + fl + ')'; c.fillRect(-20, -20, W + 40, H + 40); }
        c.fillStyle = '#c21f2a'; c.beginPath(); c.arc(cx - (t - tHit) * 260, gy - sh * 0.45 + (t - tHit) * 120, W * 0.05, 0, 7); c.fill();
      }
      if (t > 0.55) this.popDraw('OUT', '#ff5d5d', Math.min(1, (t - 0.55) / 0.3), false);
      this.end();
      return t > 1.9;
    });
  }
}
