// UC番号の衝突を解消して2版を統合する（一時スクリプト）
// マスターの UC-02 resize-grip を正とし、こちらの UC-02〜06 を UC-03〜07 に繰り下げる。
const fs = require('fs');
const path = require('path');
const D = __dirname;
const R = f => fs.readFileSync(path.join(D, f), 'utf8');
const W = (f, s) => fs.writeFileSync(path.join(D, f), s, 'utf8');

const renum = s => s
  .replace(/UC-06/g, 'UC-07')
  .replace(/UC-05/g, 'UC-06')
  .replace(/UC-04/g, 'UC-05')
  .replace(/UC-03/g, 'UC-04')
  .replace(/UC-02/g, 'UC-03');

/* ---------------- JS ---------------- */
const mineJs = R('mine.js');
const masterJs = R('master.js');

const s = mineJs.indexOf('  /* --------------------------------------------------------------------------\n     [UC-02] copy');
const e = mineJs.indexOf('  /* -------------------------------------------------------------------------- */\n\n  const api');
if (s < 0 || e < 0) throw new Error('mine.js の切り出しに失敗: ' + s + ',' + e);
const mineBody = renum(mineJs.slice(s, e));

// マスターの api / init を、こちらの登録内容とマージ
const masterApi = masterJs.match(/  const api = \{[\s\S]*?\};/)[0];
const mineApi = mineJs.match(/  const api = \{[\s\S]*?\n  \};/)[0];
const mineApiEntries = renum(mineApi)
  .replace(/  const api = \{\n/, '').replace(/\n  \};$/, '')
  .split('\n').filter(l => l.includes(':') && !l.includes('updatePinScroll'));

const newApi =
`  const api = {
    // UC-01
    updatePinScroll: updateAll,
    updatePinScrollEl: updateOne,
    // UC-02 (resize-grip)
    attachResize: attachAllResize,
    attachResizeEl: attachResize,
${mineApiEntries.join('\n')}
  };`;

const mineInit = mineJs.match(/  function init\(\) \{[\s\S]*?\n  \}/)[0];
const newInit = mineInit.replace(
  '    updateAll();\n    global.addEventListener("resize", updateAll);',
  '    updateAll();\n    attachAllResize();                     // UC-02\n    global.addEventListener("resize", updateAll);'
);

// マスター版の末尾（api/init/起動）を差し替え、その手前に自分の実装を差し込む
const tailStart = masterJs.indexOf('  // 公開API');
if (tailStart < 0) throw new Error('master.js の末尾検出に失敗');
const head = masterJs.slice(0, tailStart);

const outJs = head
  + mineBody
  + '  /* -------------------------------------------------------------------------- */\n\n'
  + newApi + '\n\n'
  + newInit + '\n\n'
  + '  if (document.readyState === "loading") {\n'
  + '    document.addEventListener("DOMContentLoaded", init);\n'
  + '  } else {\n'
  + '    init();\n'
  + '  }\n\n'
  + '  global.UICommon = Object.assign(global.UICommon || {}, api);\n'
  + '})(window);\n';

// ヘッダーの部品一覧を差し替え
const outJs2 = outJs.replace(
  /     UC-01 pin-scroll[\s\S]*?UC-06 autosave[^\n]*\n/,
`     UC-01 pin-scroll  横はみ出す表のスクロールバーを可視範囲に固定
     UC-02 resize-grip 角ドラッグでパネルをサイズ可変
     UC-03 copy        クリップボードへコピー＋トースト通知
     UC-04 accordion   セクションの開閉
     UC-05 pick        候補から選ぶ（単一/複数）
     UC-06 text-mark   本文をドラッグして印を付ける
     UC-07 autosave    入力欄の自動保存・復元
`);
W('out.js', outJs2);

/* ---------------- CSS ---------------- */
const mineCss = R('mine.css');
const masterCss = R('master.css');
// マスターCSSの UC-02 セクション（resize-grip）を取り出す
const mS = masterCss.indexOf('/* ---');
const ucStart = masterCss.indexOf('[UC-02]');
const masterUc02 = ucStart >= 0
  ? masterCss.slice(masterCss.lastIndexOf('/* ---', ucStart))
  : '';
// 自分のCSSは「トークン定義」以降を使う（UC-01 部分はマスター版を使う）
const tokStart = mineCss.indexOf('/* ----------------------------------------------------------------------------\n   デザイントークン');
if (tokStart < 0) throw new Error('mine.css のトークン節が見つからない');
const mineRest = renum(mineCss.slice(tokStart));
// マスターCSSのうち UC-01 までを土台に
const base = ucStart >= 0 ? masterCss.slice(0, masterCss.lastIndexOf('/* ---', ucStart)) : masterCss;

W('out.css', base + mineRest + '\n' + masterUc02);

console.log('JS  :', outJs2.split('\n').length, 'lines');
console.log('CSS :', (base + mineRest + masterUc02).split('\n').length, 'lines');
console.log('UC in JS  :', [...new Set(outJs2.match(/UC-\d+/g))].sort().join(' '));
console.log('UC in CSS :', [...new Set((base + mineRest + masterUc02).match(/UC-\d+/g))].sort().join(' '));
