/* ============================================================================
   ui-common.js — 全ツール共通UI挙動（正本: tools-ui-common / submodule）
   ----------------------------------------------------------------------------
   各ツールHTMLの末尾に1行:
     <script src="/01_tools/ui-common/ui-common.js"></script>
   data属性駆動・ゼロ設定で自動起動。グローバル汚染は window.UICommon のみ。
   ============================================================================ */
(function (global) {
  "use strict";

  /* --------------------------------------------------------------------------
     [UC-01] pin-scroll
     対象: [data-ui-pin-scroll] の要素すべて
     挙動: 列が画面幅を超える(scrollWidth>clientWidth)時だけ .ui-pinned を付け、
           表の実画面上端〜画面下端(-余白)を max-height にして横バーを可視範囲へ。
           収まる時は素の表に戻す。窓リサイズ・内容変化(任意)で再評価。
     余白(px)は要素の data-ui-pin-margin で上書き可（既定16）。
  -------------------------------------------------------------------------- */
  function updateOne(el) {
    const margin = parseInt(el.getAttribute("data-ui-pin-margin") || "16", 10);
    el.classList.remove("ui-pinned");
    el.style.maxHeight = "";                      // 素の状態で自然な横はみ出しを測る
    const overflow = el.scrollWidth > el.clientWidth + 1;
    if (overflow) {
      el.classList.add("ui-pinned");
      const top = el.getBoundingClientRect().top; // 表の実画面上端
      el.style.maxHeight = Math.max(200, global.innerHeight - top - margin) + "px";
    }
  }

  function updateAll() {
    document.querySelectorAll("[data-ui-pin-scroll]").forEach(updateOne);
  }

  // 公開API: 行の追加/削除など内容変化の直後に呼べば即再評価できる。
  const api = { updatePinScroll: updateAll, updatePinScrollEl: updateOne };

  function init() {
    updateAll();
    global.addEventListener("resize", updateAll);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.UICommon = Object.assign(global.UICommon || {}, api);
})(window);
