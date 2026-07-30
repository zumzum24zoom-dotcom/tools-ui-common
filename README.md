# tools-ui-common

**マスターが作る全ローカルHTMLツール共通のUI部品（正本）。**
各プロジェクトは git submodule で取り込み、配信ルート内に実体を置いて読む。

## 取り込み方（新プロジェクト初期化時）

```bash
git submodule add https://github.com/zumzum24zoom-dotcom/tools-ui-common.git 01_tools/ui-common
```

各ツールHTMLに2行:

```html
<head>
  <link rel="stylesheet" href="/01_tools/ui-common/ui-common.css">
</head>
<body>
  ...
  <script src="/01_tools/ui-common/ui-common.js"></script>
</body>
```

## 更新の伝播

```bash
# 正本を更新したら、各プロジェクトで:
git submodule update --remote 01_tools/ui-common
git add 01_tools/ui-common && git commit -m "chore: ui-common 更新取り込み"
```

## 設計原則

- **data属性駆動・ゼロ設定**。HTMLに属性を1つ付けるだけで効く。ハードコード禁止。
- **テーマ非依存**。色はツール側のCSS変数を参照し、無ければフォールバック値で動く。
- **グローバル汚染は `window.UICommon` のみ**。

## 部品を追加するとき（番号の採り方）

> **新しい UC 番号を採る前に、必ず `git fetch` してリモートの最新を見る。**
> 2026-07-30 に、別々のセッションで同時に **UC-02 が二重採番された**（resize-grip と copy）。
> 番号は共有レジストリなので、ローカルの最大値だけを見て +1 すると必ず衝突する。
> 詳細は `launcher/golden-path/traps.md`。

## 部品カタログ

| ID | 名前 | 使い方 | 効果 |
|----|------|--------|------|
| UC-01 | pin-scroll | スクロールさせたい表に `data-ui-pin-scroll`、固定したい先頭行に `class="ui-pin-head"` | 列が画面幅を超える時だけ表内スクロールに切替え、**横スクロールバーを必ず可視範囲（画面内下端）に固定**＋ヘッダー固定。収まる時は素の表。`data-ui-pin-margin`(既定16)で下余白px調整。内容変化時は `UICommon.updatePinScroll()` を呼ぶと即再評価。 |
| UC-02 | resize-grip | 可変にしたいパネルに `data-ui-resize`（値=角 `tl`/`tr`/`bl`/`br`・既定 `tl`）。最小は `data-ui-resize-min="幅,高さ"`(px・既定200,160) | 指定角に**ドラッグ用グリップ**を生成しパネルをサイズ可変に。左/上グリップは外向きドラッグで拡大、最大98vw×96vh。右下固定パネルなら `tl` で左上へ伸びる。動的生成パネルには `UICommon.attachResize()`（全体）/`UICommon.attachResizeEl(el)`（個別）。色は `--uc-grip`→`--teal`→`#00d4aa`。 |
| UC-03 | copy | `<button data-ui-copy="#src">` または `data-ui-copy-text="文字列"` | クリックで**クリップボードへコピー＋トースト通知**。トーストのDOMは自動生成（用意不要）。`navigator.clipboard` が使えない時は textarea+execCommand に自動フォールバック。完了文言は `data-ui-copy-done` で変更可。`ui:copied` イベント発火。 |
| UC-04 | accordion | 容器に `data-ui-accordion`（`="exclusive"` で1つだけ開く）。中は `.ui-acc > .ui-acc-head + .ui-acc-body` | 見出しクリックで開閉。`.ui-acc-chev` を置くと矢印が90度回る。状態クラス `.ui-running` / `.ui-done` / `.ui-error` で見出しの色が変わる（進捗表示に使える）。`UICommon.openSection(el)` で外から開ける。 |
| UC-05 | pick | 容器に `data-ui-pick="single"`（既定）or `"multi"`、候補に `data-ui-pick-value="..."` | 候補カードから選ぶ。選択で `.ui-picked` が付く。single は排他、同じものを再クリックで解除。容器に `ui:pick` イベント発火（`detail: {value, values}`）。`UICommon.getPicked(container)` で取得。 |
| UC-06 | text-mark | 要素に `data-ui-mark`、本文は **`UICommon.setMarkText(el, text)`** で入れる（innerHTMLを直接書かない） | 本文を**ドラッグ選択して印を付ける**。浮かぶボタン→クリックで `<mark>`、印をクリックで解除。既存の印と重なる選択は自動で弾く。`ui:markchange` 発火。`getMarks` / `setMarks` / `clearMarks`。 |
| UC-07 | autosave | `<input data-ui-autosave>`（キーは id。`data-ui-autosave="key"` で明示も可） | 入力を **localStorage に自動保存・起動時に自動復元**。名前空間は既定でページのパス（`data-ui-autosave-ns` で変更可）。checkbox/radio も対応。`UICommon.clearAutosave()`。 |

### レイアウト補助（CSSのみ）

| クラス | 効果 |
|---|---|
| `.ui-split` | 2ペイン（右幅は `--uc-split-right`、既定420px）。980px以下で自動的に縦積み |
| `.ui-blank` | 空状態の器。**「データが無い＝表示しない」は禁止**なので、枠と理由を必ず出すために使う |

## デザインが不服なときは（3段階で逃げられる）

原則は「**基本（構造・挙動）は固定、スキン（見た目）は差替可**」。
不服の度合いに応じて3段階ある。**下に行くほど強いが、共通化の利点を失う。**

### 段階1: トークンを上書きする（推奨・HTMLは触らない）

部品のCSSは値を直接書かず、必ず `--uc-*` を経由している。ツール側で上書きすれば全部変わる。

```css
:root{
  --uc-radius: 0;                    /* 角を完全に落とす */
  --uc-border-w: 3px;                /* 枠をもっと太く */
  --uc-accent: #0af;                 /* アクセント色 */
  --uc-pad-y: 16px; --uc-pad-x: 20px;/* ゆったりさせる */
  --uc-font: 15px;                   /* 文字を大きく */
  --uc-shadow: none;                 /* 影を消す */
}
```

| トークン | 何が変わるか |
|---|---|
| `--uc-radius` / `--uc-radius-sm` / `--uc-radius-pill` | 角丸 |
| `--uc-border-w` | 枠線の太さ |
| `--uc-pad-y` / `--uc-pad-x` / `--uc-gap` | 余白・隙間 |
| `--uc-font` / `--uc-font-sm` | 文字サイズ |
| `--uc-shadow` / `--uc-shadow-flat` / `--uc-press` | 影と押し込みの挙動 |
| `--uc-ink` / `--uc-line` / `--uc-panel` / `--uc-accent` / `--uc-accent-soft` / `--uc-mark` | 色 |
| `--uc-grip` | リサイズグリップ（UC-02）の色 |

色は先にツール側の一般名（`--accent` / `--line` / `--ink` / `--panel` / `--mark`）を拾うので、
テーマを持っているツールなら**何も書かなくても馴染む**。

### 段階2: クラスで上書きする（部分的に形を変えたい）

詳細度で勝てば個別に潰せる。挙動（JS）はそのまま残る。

```css
/* このツールだけ、候補カードを横並びのチップにする */
.my-tool [data-ui-pick] [data-ui-pick-value]{
  display:inline-block; width:auto; border-radius:999px;
}
```

### 段階3: 見た目を捨てて、挙動だけ使う（最後の手段）

**この部品群は挙動と見た目を分けてある。** 見た目のCSSを全部無効にしても、
JS の API と data属性の挙動は生きる。特に UC-06（text-mark）は
**価値の本体が挙動側**（オフセット計算・重複検出・画面外に飛ばない位置決め）なので、
`mark.ui-mark` と `.ui-mark-tip` を自分のCSSで上書きすれば、見た目は完全に自作できる。

```css
.my-tool mark.ui-mark{ background:none; border-bottom:2px solid red; }
.my-tool .ui-mark-tip{ /* 好きに */ }
```

> **正本を直すのは最後**。`ui-common.css` 自体を変えると全ツールに波及する。
> 「1つのツールで不服」なら段階1〜3で解決し、
> 「2つ以上のツールで同じ不服」が出たら初めて正本を直す（2回出たら共通化、の原則と同じ）。

## kit.css との関係（自動で流派が切り替わる）

`kit.css` はデザイン法則の正本で、流派が明確にある（**角ばり3px / 4辺の太い輪郭2px /
ハード影は「動く」の印で押すと沈む / 動かないものに影は付けない**）。

そこで **`<body class="k">`（= kit.css を使っている）を検出したら、
トークンを自動で kit.css の流派に切り替える**ようにしてある。

| | 既定（独自テーマのツール） | `body.k`（kit.css使用時） |
|---|---|---|
| 角丸 | 8px | **3px** |
| 枠線 | 1px | **2px** |
| 影 | 柔らかい影 | **ハード影（`--sh-card`）** |
| 選択時 | 色が変わる | **押し込んで沈む（`translate(4px,4px)`）** |

つまり kit.css のツールに貼れば角ばった見た目で、独自テーマのツールに貼れば馴染む。
**どちらでも「流派が混ざる」ことがない。**

> 初版ではこの配慮が無く、roots-db の丸くて柔らかいスタイルをそのまま共通部品に
> 持ち込んでいた（kit.css の流派に反していた）。2026-07-30 に修正。

## Pattern Registry / UI事典 との関係

- **Pattern Registry・UI事典** = 「どんな機能があるか」の**カタログ**（作る前に見る）
- **tools-ui-common** = 「実装済みの部品」（作る時に使う）

カタログのセルが実装されたら、ここに入る。対応は次の通り。

| 部品 | Pattern Registry のセル |
|---|---|
| UC-01 | list族「Sticky / Pinned Header」 |
| UC-02 | **未照合**（対応セルがあるか未確認。次にカタログを開いた時に印を付ける） |
| UC-03 | action族「Copy Box」 |
| UC-04 | structure族「Accordion」「Progressive Disclosure」 |
| UC-05 | layout族「Two-Panel Selector」／list族「Row Bulk Actions」 |
| UC-06 | structure族「Tagging」 |
| UC-07 | action族「Autosave」 |

## 由来

- **UC-01**: propfirm-database の firm-database.html `updatePinned()` を抽出・一般化。
- **UC-02**: PFD Collector 拡張（1号機）の md-crawl.js プレビューパネル左上のリサイズグリップを抽出・一般化。
- **UC-03〜07**: 2026-07-30 に roots-db（記事ビューア・段2マーク画面）と golden-path の雛形で
  **同じ実装を2〜3回書いていた**ため型抜きした（`/extract-pattern` の観点1「重複コード」）。
  特に **UC-06（text-mark）は2回書いて2回とも同じ罠を踏んだ**ので、落とし穴を部品側に閉じ込めてある:
  文字オフセットは TreeWalker で数える／`position:fixed` の浮遊ボタンに `scrollY` を足すと
  画面外に飛ぶ／画面端でクランプする／既存の印と重なる範囲は弾く。
  罠の詳細は `launcher/golden-path/traps.md`（FE-01 ほか）。

> **番号の履歴**: UC-03〜07 は当初 UC-02〜06 として作られたが、
> 同日にマスターが先に UC-02（resize-grip）を採番していたため 1つずつ繰り下げた（2026-07-31 統合）。
