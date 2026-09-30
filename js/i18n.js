// 文言はすべてここに集める。ウルドゥー語にするときは dict.ur に同じキーで訳を入れるだけでよい
// （ur が空のあいだは言語切りかえボタンは出ない。右から左の表示は I18N.rtl で切りかわる）
const I18N = {
  lang: 'ja',
  names: { ja: '日本語', ur: 'اردو' },
  rtl: { ur: true },
  set(lang) {
    this.lang = this.dict[lang] ? lang : 'ja';
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.rtl[this.lang] ? 'rtl' : 'ltr';
  },
  dict: {
    ja: {
      tagline: 'ストリートからプロへ！',
      mode_success: '育成', mode_success_d: '1年間でマイ選手を育てよう',
      mode_league: '監督リーグ', mode_net: 'ネット対戦', mode_net_d: '友だちと1分勝負',
      team: 'チーム', coaches: 'コーチ', settings: '設定', sound: 'サウンド',
      reset: 'データを消す', reset_q: 'すべてのデータを消して最初からにしますか？',
      resume: 'つづきから',
      ok: 'OK', cancel: 'やめる', next: 'つぎへ', back: 'もどる', start: 'スタート',
      st_power: 'パワー', st_timing: 'ミート', st_pace: '球速', st_spin: '変化', st_control: '制球', st_speed: '走力', st_fielding: '守備',
      role_bat: 'バッター', role_bowl: 'ボウラー', role_all: 'オールラウンダー',
      btype_pace: '速球派', btype_spin: 'スピン派',
      bt_fast: 'ストレート', bt_swing: 'スイング', bt_off: 'オフスピン', bt_leg: 'レッグスピン',
      name_note: '※ 本名や個人情報は入れないでね',
      pick_role: 'タイプをえらぶ', pick_coach: 'コーチをえらぶ',
      tr_bat: '打撃', tr_bowl: '投球', tr_run: '走りこみ', tr_field: '守備', tr_rest: '休む', tr_play: 'チャイ休けい',
      train_fail: '練習失敗…', train_great: '大成功！', use_points: '能力アップ',
      mk_practice: '練習試合', mk_d1: '地区大会 準決勝', mk_d2: '地区大会 決勝', mk_n1: '全国大会 準決勝', mk_n2: '全国大会 決勝',
      chance: 'チャンス！ 打て！', pinch: 'ピンチ！ おさえろ！',
      hint_bat: '輪が重なったら 打ちたい方向へスワイプ', hint_bowl: '①場所をタップ ②球種 ③タイミングよくタップ',
      win: '勝ち！', lose: '負け…', tie: '引き分け',
      graduate: '卒業！', registered: 'マイ選手としてチームに登録しました',
      pro1: 'ドラフト1位でプロ入り！', pro2: 'プロ入り決定！', pro3: 'プロ育成契約', pro4: '大学でプロを目指す',
      lineup: '先発メンバー', bench: 'ひかえ', auto: 'おまかせ', swap_hint: '2人タップで入れかえ／同じ人を2回で詳しく',
      retire: '引退させる', retire_q: 'この選手を引退させますか？',
      gacha: 'コーチをスカウト', gacha_note: '同じコーチが出るとレベルアップ',
      c_bat1: '打撃コーチ', c_bowl1: '投球コーチ', c_run1: '体育の先生', c_field1: '守備コーチ',
      c_power: '力じまんの肉屋', c_timing: 'テープボール名人', c_spin: 'スピンの魔術師', c_ctrl: '精密機械',
      c_speed: '元陸上選手', c_160: '160km/hの師匠', c_six: 'シックスの王様', c_legend: '伝説の主将',
      tier0: '地区', tier1: '州', tier2: 'ナショナル',
      promo_rule: '上位2校が昇格', promo_rule2: '1位で全国制覇',
      play_match: '試合開始', tactic: '作戦', speed: 'スピード',
      promoted: '昇格！', stay: '来季こそ！', champion: 'パキスタンNo.1！',
      net_squad: '出場メンバー', net_host: 'へやを作る', net_join: 'へやに入る', net_cpu: 'CPUと練習',
      net_note: 'ネット対戦は、へやを作った人の4けたの番号を相手に伝えてね',
      net_connecting: '接続中…', net_code: 'この番号を相手に伝えよう', net_wait: '相手を待っています',
      net_enter: '相手の番号を入れよう', net_err: '接続できませんでした', net_noroom: 'へやが見つかりません', net_lost: '接続が切れました',
      ev_street: '路地裏クリケット', ev_street_t: '近所の子どもたちにテープボールの試合にさそわれた！', ev_street_0: '思いきり打つ', ev_street_1: 'ていねいに当てる',
      ev_biryani: 'おばあちゃんのビリヤニ', ev_biryani_t: 'おばあちゃんが特製ビリヤニを作ってくれた。', ev_biryani_0: 'おかわり！', ev_biryani_1: '仲間と分ける',
      ev_rival: 'ライバル登場', ev_rival_t: '他校のエースが勝負をいどんできた！', ev_rival_0: '受けて立つ', ev_rival_1: '自分の練習に集中',
      ev_rain: 'モンスーンの大雨', ev_rain_t: 'グラウンドが使えない…', ev_rain_0: '試合映像で研究', ev_rain_1: 'ゆっくり休む',
      ev_night: 'ナイト・テープボール大会', ev_night_t: '夜の街の大会に飛び入り参加！', ev_night_0: 'シックスねらい', ev_night_1: '速球で勝負',
      ev_exam: '期末テスト', ev_exam_t: '勉強も大事。どうする？', ev_exam_0: 'しっかり勉強', ev_exam_1: 'こっそり素振り',
      ev_oldbat: '古いバット', ev_oldbat_t: '近所のおじさんが、使いこんだバットをくれた。', ev_oldbat_0: 'ありがたく使う',
      ev_scout: 'スカウトの視線', ev_scout_t: 'プロのスカウトが練習を見に来ている！', ev_scout_0: 'アピールする', ev_scout_1: 'いつも通りに',
      ev_chai: 'チャイ屋の名人', ev_chai_t: 'チャイ屋の主人は元選手らしい。コツを教えてくれた。', ev_chai_0: 'スピンのにぎり', ev_chai_1: 'ねらう技術',
    },
    ur: {},
  },
};
function t(key, params) {
  let s = (I18N.dict[I18N.lang] || {})[key];
  if (s == null) s = I18N.dict.ja[key];
  if (s == null) return key;
  if (params) for (const k in params) s = s.replace('{' + k + '}', params[k]);
  return s;
}
