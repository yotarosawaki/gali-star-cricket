// セーブデータと選手データの共通処理
const SAVE_KEY = 'galistar.v1';
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const randn = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 0.58; };

const P = {
  batR: p => p.timing * 0.55 + p.power * 0.45,
  bowlR: p => Math.max(p.pace, p.spin) * 0.55 + p.control * 0.45,
  overall(p) {
    const bat = P.batR(p), bowl = P.bowlR(p), sub = (p.speed + p.fielding) / 2;
    if (p.role === 'bat') return bat * 0.8 + sub * 0.2;
    if (p.role === 'bowl') return bowl * 0.8 + sub * 0.2;
    return (bat + bowl) / 2 * 0.85 + sub * 0.15;
  },
  grade(v) { return clamp(Math.floor(v / 10) - 1, 0, 7); },
  gradeOf(p) { return P.grade(P.overall(p)); },
  randomName() { return pick(FIRST_NAMES) + ' ' + String.fromCharCode(65 + rint(0, 25)) + '.'; },
  gen(avg, role) {
    const v = (d, sp = 6) => clamp(Math.round(avg + d + rnd(-sp, sp)), 5, 99);
    const btype = Math.random() < 0.6 ? 'pace' : 'spin';
    const p = { id: '', name: P.randomName(), role, btype, skin: rint(0, 2), my: false };
    if (role === 'bat') Object.assign(p, { power: v(8), timing: v(8), pace: v(-14, 4), spin: v(-14, 4), control: v(-12, 4) });
    else if (role === 'bowl') Object.assign(p, { power: v(-12, 4), timing: v(-10, 4), control: v(6), pace: v(btype === 'pace' ? 10 : -12), spin: v(btype === 'spin' ? 10 : -12) });
    else Object.assign(p, { power: v(1), timing: v(1), control: v(0), pace: v(btype === 'pace' ? 3 : -12), spin: v(btype === 'spin' ? 3 : -12) });
    p.speed = v(0); p.fielding = v(0);
    return p;
  },
  genTeam(avg) {
    const roles = ['bat', 'bat', 'bat', 'bat', 'bat', 'all', 'all', 'bowl', 'bowl', 'bowl', 'bowl'];
    const city = pick(CITIES);
    return {
      name: city + ' ' + pick(MASCOTS) + ' High', short: city.slice(0, 3).toUpperCase(),
      color: pick(COLORS), emblem: pick(EMBLEMS), players: roles.map(r => P.gen(avg, r)),
    };
  },
  fieldAvg(players) { return players.reduce((s, p) => s + p.fielding, 0) / players.length; },
  // 1分対戦に出す選手（打者3人・投手1人）
  squad(team) {
    const byBat = [...team.players].sort((a, b) => P.batR(b) - P.batR(a));
    const bowler = [...team.players].sort((a, b) => P.bowlR(b) - P.bowlR(a))[0];
    return { name: team.name, short: team.short, color: team.color, emblem: team.emblem, batters: byBat.slice(0, 3), bowler, fieldAvg: P.fieldAvg(team.players) };
  },
};

const S = {
  d: null,
  defaults() {
    const d = {
      v: 1, lang: 'ja', mute: false, coins: 300, nid: 1, players: [], mobs: [],
      team: { name: 'Karachi Central High', short: 'KCH', color: '#1faa59', emblem: '🦅', xi: [] },
      coaches: { c_bat1: 1, c_bowl1: 1, c_run1: 1 }, league: null, success: null, flags: {}, trophies: 0,
    };
    const roles = ['bat', 'bat', 'bat', 'bat', 'bat', 'all', 'all', 'bowl', 'bowl', 'bowl', 'bowl'];
    roles.forEach((r, i) => { const m = P.gen(26, r); m.id = 'm' + i; d.mobs.push(m); });
    d.team.xi = d.mobs.map(m => m.id);
    return d;
  },
  load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) this.d = JSON.parse(raw); } catch (e) { this.d = null; }
    if (!this.d || this.d.v !== 1) this.d = this.defaults();
    I18N.lang = this.d.lang || 'ja';
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { /* 保存できなくても続行 */ } },
  reset() { this.d = this.defaults(); this.save(); },
  get(id) { return this.d.players.find(p => p.id === id) || this.d.mobs.find(p => p.id === id); },
  addCoins(n) { this.d.coins = Math.max(0, this.d.coins + n); this.save(); },
  // 先発11人。足りない枠はモブ部員で埋める
  xi() {
    const t = this.d.team;
    let ids = t.xi.filter((id, i) => this.get(id) && t.xi.indexOf(id) === i).slice(0, 11);
    for (const m of this.d.mobs) { if (ids.length >= 11) break; if (!ids.includes(m.id)) ids.push(m.id); }
    t.xi = ids;
    return ids.map(id => this.get(id));
  },
  myTeam() { const t = this.d.team; return { name: t.name, short: t.short, color: t.color, emblem: t.emblem, players: this.xi() }; },
  autoXI() {
    const mine = [...this.d.players].sort((a, b) => P.overall(b) - P.overall(a)).slice(0, 11);
    const mobs = [...this.d.mobs].sort((a, b) => P.overall(b) - P.overall(a)).slice(0, 11 - mine.length);
    const all = [...mine, ...mobs].sort((a, b) => P.batR(b) - P.batR(a));
    this.d.team.xi = all.map(p => p.id);
    this.save();
  },
};
