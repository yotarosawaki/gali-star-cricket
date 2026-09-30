// 効果音（WebAudioで合成。音声ファイル不要）
const SFX = {
  ctx: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  ok() { return this.ctx && !(S.d && S.d.mute); },
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 1200, q = 1, delay = 0, type = 'bandpass', attack = 0.005) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  },
  click() { this.tone(660, 0.06, 'triangle', 0.12); },
  good() { this.tone(660, 0.1, 'triangle', 0.15); this.tone(990, 0.16, 'triangle', 0.15, 0, 0.08); },
  bad() { this.tone(220, 0.25, 'sawtooth', 0.12, -90); },
  coin() { this.tone(1200, 0.07, 'square', 0.08); this.tone(1600, 0.14, 'square', 0.08, 0, 0.06); },
  whiff() { this.noise(0.18, 0.15, 900, 0.7); },
  bounce() { this.tone(160, 0.06, 'sine', 0.15, -60); },
  hit(q) {
    const big = q === 'perfect';
    this.noise(0.06, big ? 0.5 : 0.3, big ? 2200 : 1400, 1.2);
    this.tone(big ? 240 : 180, 0.12, 'triangle', big ? 0.4 : 0.25, -100);
  },
  // ウィケット粉砕「ガシャン！」
  wicket() {
    this.noise(0.09, 0.6, 3000, 0.8);
    this.noise(0.35, 0.4, 1500, 0.6, 0.03);
    [520, 680, 830].forEach((f, i) => this.tone(f, 0.25, 'square', 0.1, -200, 0.02 + i * 0.045));
    this.tone(90, 0.3, 'sine', 0.4, -40);
  },
  cheer(level = 1) {
    this.noise(1.4 * level + 0.4, 0.22 * level + 0.08, 1100, 0.4, 0, 'bandpass', 0.25);
    this.noise(1.2 * level + 0.3, 0.12 * level, 2600, 0.6, 0.1, 'bandpass', 0.3);
  },
  six() { this.cheer(1); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, 0, i * 0.09)); },
  four() { this.cheer(0.6); [523, 784].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.16, 0, i * 0.09)); },
  out() { this.cheer(0.5); this.tone(330, 0.4, 'sawtooth', 0.12, -200); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, 0, i * 0.11)); this.cheer(1); },
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.16, 0, i * 0.18)); },
};
document.addEventListener('pointerdown', () => SFX.init(), { passive: true });
