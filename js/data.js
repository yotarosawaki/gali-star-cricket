// ゲームの固定データ（能力・コーチ・イベント・守備位置など）
const STATS = [
  { k: 'power', ic: '💪' },
  { k: 'timing', ic: '🎯' },
  { k: 'pace', ic: '⚡' },
  { k: 'spin', ic: '🌀' },
  { k: 'control', ic: '📍' },
  { k: 'speed', ic: '👟' },
  { k: 'fielding', ic: '🧤' },
];
const STAT_IC = Object.fromEntries(STATS.map(s => [s.k, s.ic]));
const ROLE_IC = { bat: '🏏', bowl: '🔴', all: '⭐' };
const GRADES = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];
const GRADE_COL = ['#8a9aa5', '#8a9aa5', '#4fb3ff', '#3ddc84', '#f5c542', '#ff9f43', '#ff5d5d', '#ff4fd8'];

const SKINS = ['#f1c9a0', '#c98d5e', '#8d5a3a'];
const COLORS = ['#1faa59', '#e5484d', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f4f4f5', '#111827', '#f97316'];
const EMBLEMS = ['🦅', '🐆', '🦁', '🐎', '⭐', '🌙', '🔥', '⚡', '🏔', '🌊', '🐅', '🦌'];

// 実在の選手・学校と重ならないよう、名前は一般的な名＋イニシャル、学校は「地名＋マスコット」の架空校
const FIRST_NAMES = ['Ali', 'Bilal', 'Hamza', 'Usman', 'Hassan', 'Zain', 'Saad', 'Fahad', 'Asad', 'Danish', 'Haris', 'Junaid', 'Kamran', 'Noman', 'Omar', 'Rizwan', 'Salman', 'Tariq', 'Waqas', 'Yasir', 'Adeel', 'Faisal', 'Arslan', 'Moiz', 'Rafay', 'Taha', 'Shayan', 'Ibrahim', 'Daniyal', 'Ahsan'];
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Hyderabad', 'Sialkot', 'Gujranwala', 'Bahawalpur', 'Sukkur', 'Abbottabad', 'Sargodha', 'Larkana'];
const MASCOTS = ['Falcons', 'Markhors', 'Tigers', 'Stallions', 'Stars', 'Eagles', 'Panthers', 'Rockets', 'Storm', 'Kings'];

const COACHES = {
  c_bat1: { ic: '🧢', rar: 0, focus: 'bat', bonus: 0.25 },
  c_bowl1: { ic: '🧑‍🏫', rar: 0, focus: 'bowl', bonus: 0.25 },
  c_run1: { ic: '🏃', rar: 0, focus: 'run', bonus: 0.25 },
  c_field1: { ic: '🧤', rar: 0, focus: 'field', bonus: 0.25 },
  c_power: { ic: '🥩', rar: 1, focus: 'bat', bonus: 0.4, stat: 'power' },
  c_timing: { ic: '🎾', rar: 1, focus: 'bat', bonus: 0.4, stat: 'timing' },
  c_spin: { ic: '🧙', rar: 1, focus: 'bowl', bonus: 0.4, stat: 'spin' },
  c_ctrl: { ic: '🔭', rar: 1, focus: 'bowl', bonus: 0.4, stat: 'control' },
  c_speed: { ic: '🐆', rar: 1, focus: 'run', bonus: 0.45, stat: 'speed' },
  c_160: { ic: '🚀', rar: 2, focus: 'bowl', bonus: 0.7, stat: 'pace' },
  c_six: { ic: '👑', rar: 2, focus: 'bat', bonus: 0.7, stat: 'power' },
  c_legend: { ic: '🌟', rar: 2, focus: 'any', bonus: 0.4 },
};
const RAR_NAME = ['N', 'R', 'SR'];
const RAR_COL = ['#9fb3c8', '#4fb3ff', '#f5c542'];
const GACHA_COST = 100;
const GACHA_RATE = [0.6, 0.32, 0.08];

// 育成: トレーニング
const TRAIN = {
  bat: { ic: '🏏', cost: 20 },
  bowl: { ic: '🔴', cost: 20 },
  run: { ic: '👟', cost: 22 },
  field: { ic: '🧤', cost: 15 },
};
const MOT_IC = ['😫', '😟', '🙂', '😄', '🤩'];
const MOT_MUL = [0.8, 0.9, 1, 1.08, 1.15];

// 育成: 試合スケジュール（ターン終了後に発生）
const TURNS = 36;
const SCHED = { 9: 'practice', 18: 'd1', 24: 'd2', 30: 'n1', 36: 'n2' };
const MATCH_KIND = {
  practice: { avg: 27, lv: 0, ic: '🤝' },
  d1: { avg: 33, lv: 1, ic: '🏘' },
  d2: { avg: 40, lv: 2, ic: '🏘' },
  n1: { avg: 50, lv: 3, ic: '🌙' },
  n2: { avg: 60, lv: 4, ic: '🏆' },
};

// 育成: ランダムイベント（eff: 能力の増減 / sta: 体力 / mot: やる気）
const EVENTS = [
  { id: 'street', ic: '🏘', ch: [{ ic: '💥', eff: { power: 3 }, sta: -10 }, { ic: '🎯', eff: { timing: 3 }, sta: -5 }] },
  { id: 'biryani', ic: '🍛', ch: [{ ic: '😋', sta: 30 }, { ic: '🤝', sta: 12, mot: 1 }] },
  { id: 'rival', ic: '😤', ch: [{ ic: '🔥', eff: { timing: 2, control: 2 }, sta: -15 }, { ic: '🧘', mot: 1 }] },
  { id: 'rain', ic: '🌧', ch: [{ ic: '📺', eff: { control: 2, timing: 1 } }, { ic: '💤', sta: 25 }] },
  { id: 'night', ic: '🌙', ch: [{ ic: '💥', eff: { power: 4 }, sta: -15 }, { ic: '⚡', eff: { pace: 3, spin: 1 }, sta: -15 }] },
  { id: 'exam', ic: '📚', ch: [{ ic: '📖', sta: 10, mot: 1 }, { ic: '🏏', eff: { timing: 2 }, mot: -1 }] },
  { id: 'oldbat', ic: '🎁', ch: [{ ic: '🙏', eff: { power: 2, timing: 2 } }] },
  { id: 'scout', ic: '🕶', ch: [{ ic: '💪', eff: { speed: 2, fielding: 2 }, sta: -10 }, { ic: '😌', eff: { control: 1 }, mot: 1 }] },
  { id: 'chai', ic: '☕', ch: [{ ic: '🌀', eff: { spin: 4 } }, { ic: '📍', eff: { control: 3 } }] },
];

// 守備位置（a: 角度。0=正面(ボウラー方向)、+90=右 / r: 打者からの距離m。境界は70m）
const FIELDS = [
  [{ a: -150, r: 16 }, { a: -70, r: 27 }, { a: -28, r: 30 }, { a: 30, r: 30 }, { a: 80, r: 27 }, { a: -45, r: 62 }, { a: 50, r: 62 }, { a: -110, r: 60 }, { a: 125, r: 60 }],
  [{ a: -150, r: 16 }, { a: 150, r: 16 }, { a: -50, r: 28 }, { a: 50, r: 28 }, { a: -105, r: 28 }, { a: -12, r: 64 }, { a: 16, r: 64 }, { a: -82, r: 60 }, { a: 92, r: 60 }],
  [{ a: -160, r: 15 }, { a: -60, r: 26 }, { a: 5, r: 32 }, { a: 62, r: 27 }, { a: 118, r: 27 }, { a: -30, r: 63 }, { a: 38, r: 63 }, { a: 100, r: 60 }, { a: -135, r: 58 }],
];

// 球種
const BALL_TYPES = ['fast', 'swing', 'off', 'leg'];
