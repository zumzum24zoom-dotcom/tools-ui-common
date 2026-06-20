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

## 部品カタログ

| ID | 名前 | 使い方 | 効果 |
|----|------|--------|------|
| UC-01 | pin-scroll | スクロールさせたい表に `data-ui-pin-scroll`、固定したい先頭行に `class="ui-pin-head"` | 列が画面幅を超える時だけ表内スクロールに切替え、**横スクロールバーを必ず可視範囲（画面内下端）に固定**＋ヘッダー固定。収まる時は素の表。`data-ui-pin-margin`(既定16)で下余白px調整。内容変化時は `UICommon.updatePinScroll()` を呼ぶと即再評価。 |

## 由来

UC-01 は propfirm-database の firm-database.html `updatePinned()` を抽出・一般化したもの。
