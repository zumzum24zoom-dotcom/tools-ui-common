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

  /* --------------------------------------------------------------------------
     [UC-02] resize-grip
     対象: [data-ui-resize] の要素すべて
     挙動: 指定角(tl/tr/bl/br・既定tl)にグリップを生成し、ドラッグで width/height を可変に。
           左/上グリップは外向き(左/上)ドラッグで拡大。最小は data-ui-resize-min="W,H"(既定200,160)、
           最大は画面の98vw×96vh。要素が position:static なら relative に補正。
  -------------------------------------------------------------------------- */
  function attachResize(el) {
    if (el.__uiResize) return; el.__uiResize = true;
    const corner = (el.getAttribute("data-ui-resize") || "tl").toLowerCase();
    const m = (el.getAttribute("data-ui-resize-min") || "200,160").split(",");
    const minW = parseInt(m[0], 10) || 0, minH = parseInt(m[1], 10) || 0;
    const signX = corner.indexOf("l") >= 0 ? -1 : 1;   // 左グリップ: 左へドラッグで拡大
    const signY = corner.indexOf("t") >= 0 ? -1 : 1;   // 上グリップ: 上へドラッグで拡大
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const grip = document.createElement("div");
    grip.className = "ui-resize-grip ui-resize-" + (/^(tl|tr|bl|br)$/.test(corner) ? corner : "tl");
    grip.title = "ドラッグでサイズ変更";
    let rz = null;
    grip.addEventListener("pointerdown", e => {
      e.preventDefault(); rz = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };
      try { grip.setPointerCapture(e.pointerId); } catch (x) {}
    });
    grip.addEventListener("pointermove", e => {
      if (!rz) return;
      const maxW = global.innerWidth * 0.98, maxH = global.innerHeight * 0.96;
      el.style.width = Math.max(minW, Math.min(maxW, rz.w + signX * (e.clientX - rz.x))) + "px";
      el.style.height = Math.max(minH, Math.min(maxH, rz.h + signY * (e.clientY - rz.y))) + "px";
    });
    const end = e => { rz = null; try { grip.releasePointerCapture(e.pointerId); } catch (x) {} };
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
    el.appendChild(grip);
  }

  function attachAllResize() {
    document.querySelectorAll("[data-ui-resize]").forEach(attachResize);
  }

  // 公開API: 行の追加/削除など内容変化の直後／動的生成パネルに呼べば即適用できる。
  const api = {
    updatePinScroll: updateAll, updatePinScrollEl: updateOne,
    attachResize: attachAllResize, attachResizeEl: attachResize
  };

  function init() {
    updateAll();
    attachAllResize();
    global.addEventListener("resize", updateAll);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.UICommon = Object.assign(global.UICommon || {}, api);
})(window);
