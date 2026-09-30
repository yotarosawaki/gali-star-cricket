// ホーム画面と起動
const Main = {
  home() {
    const tm = S.d.team, mine = S.d.players.length, hasRun = !!S.d.success;
    const mode = (ic, key, sub, fn, cls) => h('button', { class: 'modebtn ' + (cls || ''), onclick: () => { SFX.click(); fn(); } },
      h('span', { class: 'mic' }, ic), h('div', { class: 'grow' }, h('b', null, t(key)), h('small', null, sub)), h('span', { class: 'go' }, '▶'));
    UI.show(h('div', { class: 'screen home' },
      h('div', { class: 'topbar' },
        h('button', { class: 'iconbtn', onclick: () => { SFX.click(); this.settings(); } }, '⚙️'),
        h('div', { class: 'title' }), h('div', { class: 'coins' }, '🪙 ', S.d.coins)),
      h('div', { class: 'logo' }, h('div', { class: 'logoic' }, '🏏'), h('h1', null, 'GALI STAR'), h('p', null, t('tagline'))),
      h('button', { class: 'card school', style: 'border-color:' + safeColor(tm.color), onclick: () => { SFX.click(); Team.screen(); } },
        h('span', { class: 'emb', style: 'background:' + safeColor(tm.color) }, tm.emblem),
        h('div', { class: 'grow' }, h('b', null, tm.name), h('small', null, '★ ', mine, '  🏆 ', S.d.trophies)), h('span', null, '👥')),
      h('div', { class: 'modes' },
        mode('🌱', 'mode_success', hasRun ? '▶ ' + t('resume') : t('mode_success_d'), () => Success.enter(), 'm1' + (mine === 0 ? ' pulse' : '')),
        mode('📋', 'mode_league', TIERS.map(x => x.ic).join(' ▸ '), () => League.screen(), 'm2'),
        mode('⚔️', 'mode_net', t('mode_net_d'), () => Net.screen(), 'm3')),
      h('div', { class: 'row rowpad' },
        h('button', { class: 'btn ghost grow', onclick: () => { SFX.click(); Team.screen(); } }, '👥 ', t('team')),
        h('button', { class: 'btn ghost grow', onclick: () => { SFX.click(); Coach.screen(); } }, '🎴 ', t('coaches')))));
  },
  settings() {
    const langs = Object.keys(I18N.dict).filter(l => Object.keys(I18N.dict[l]).length > 0);
    UI.modal(h('div', { class: 'center' },
      h('h2', null, '⚙️ ', t('settings')),
      h('button', { class: 'btn wide ghost', onclick: () => { S.d.mute = !S.d.mute; S.save(); SFX.click(); this.settings(); } }, S.d.mute ? '🔇' : '🔊', ' ', t('sound')),
      langs.length > 1 ? h('div', { class: 'row' }, langs.map(l => h('button', { class: 'btn' + (I18N.lang === l ? '' : ' ghost'), onclick: () => { I18N.set(l); S.d.lang = l; S.save(); this.home(); } }, I18N.names[l]))) : null,
      h('button', { class: 'btn wide ghost', onclick: async () => { if (await UI.confirm(t('reset_q'), '🗑')) { S.reset(); } this.home(); } }, '🗑 ', t('reset')),
      h('button', { class: 'btn wide', onclick: () => { SFX.click(); UI.closeModal(); } }, '✔ ', t('ok'))), true);
  },
  boot() {
    S.load();
    I18N.set(S.d.lang || 'ja');
    UI.init();
    this.home();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  },
};
window.addEventListener('DOMContentLoaded', () => Main.boot());
