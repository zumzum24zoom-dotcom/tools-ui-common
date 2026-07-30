/* ============================================================================
   ui-common.js — 全ツール共通UI挙動（正本: tools-ui-common / submodule）
   ----------------------------------------------------------------------------
   各ツールHTMLの末尾に1行:
     <script src="/01_tools/ui-common/ui-common.js"></script>
   data属性駆動・ゼロ設定で自動起動。グローバル汚染は window.UICommon のみ。

   部品一覧（詳細は README.md）:
     UC-01 pin-scroll  横はみ出す表のスクロールバーを可視範囲に固定
     UC-02 copy        クリップボードへコピー＋トースト通知
     UC-03 accordion   セクションの開閉
     UC-04 pick        候補から選ぶ（単一/複数）
     UC-05 text-mark   本文をドラッグして印を付ける
     UC-06 autosave    入力欄の自動保存・復元
   ============================================================================ */
(function (global) {
  "use strict";

  const doc = global.document;
  const $$ = (sel, root) => Array.prototype.slice.call((root || doc).querySelectorAll(sel));

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
    $$("[data-ui-pin-scroll]").forEach(updateOne);
  }

  /* --------------------------------------------------------------------------
     [UC-02] copy — クリップボードへコピー＋トースト
     対象: [data-ui-copy]（値はコピー元のCSSセレクタ）
           [data-ui-copy-text]（値をそのままコピー）
     挙動: クリックでコピー。成功/失敗のトーストを自動生成して表示する。
           トーストのDOMをツール側で用意する必要はない。
     文言: data-ui-copy-done で上書き可（既定「コピーしました」）。
     注意: navigator.clipboard は http://localhost では使えるが、
           安全でないオリジンでは失敗する。そのため textarea+execCommand の
           フォールバックを必ず通す（この二段構えを何度も手書きしていた）。
  -------------------------------------------------------------------------- */
  let toastEl = null;
  function toast(msg, isError) {
    if (!toastEl) {
      toastEl = doc.createElement("div");
      toastEl.className = "ui-toast";
      doc.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle("ui-toast-error", !!isError);
    toastEl.classList.add("on");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("on"), 1800);
  }

  function readSource(btn) {
    if (btn.hasAttribute("data-ui-copy-text")) return btn.getAttribute("data-ui-copy-text");
    const sel = btn.getAttribute("data-ui-copy");
    if (!sel) return "";
    const src = doc.querySelector(sel);
    if (!src) return "";
    return ("value" in src && src.value !== undefined && src.tagName !== "DIV")
      ? src.value : (src.textContent || "");
  }

  async function copyText(text) {
    try {
      if (global.navigator.clipboard && global.isSecureContext !== false) {
        await global.navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error("clipboard unavailable");
    } catch (e) {
      try {
        const ta = doc.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        doc.body.appendChild(ta);
        ta.select();
        const ok = doc.execCommand("copy");
        doc.body.removeChild(ta);
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  function onCopyClick(e) {
    const btn = e.target.closest("[data-ui-copy],[data-ui-copy-text]");
    if (!btn) return;
    const text = readSource(btn);
    if (!text) { toast("コピーする内容がありません", true); return; }
    copyText(text).then(ok => {
      toast(ok ? (btn.getAttribute("data-ui-copy-done") || "コピーしました")
               : "コピーできませんでした", !ok);
      if (ok) btn.dispatchEvent(new CustomEvent("ui:copied", { bubbles: true, detail: { text } }));
    });
  }

  /* --------------------------------------------------------------------------
     [UC-03] accordion — セクションの開閉
     対象: [data-ui-accordion] を持つ「容器」。中の各節は
           .ui-acc（節）> .ui-acc-head（見出し・クリック対象）+ .ui-acc-body（中身）
     挙動: 見出しクリックで .open をトグル。
           data-ui-accordion="exclusive" なら同じ容器内で常に1つだけ開く。
     API: UICommon.openSection(el) で外から開く（実行中の節を見せる用途）。
  -------------------------------------------------------------------------- */
  function onAccordionClick(e) {
    const head = e.target.closest(".ui-acc-head");
    if (!head) return;
    const sec = head.closest(".ui-acc");
    const box = head.closest("[data-ui-accordion]");
    if (!sec || !box) return;
    const exclusive = box.getAttribute("data-ui-accordion") === "exclusive";
    const willOpen = !sec.classList.contains("open");
    if (exclusive) $$(".ui-acc", box).forEach(s => s.classList.remove("open"));
    sec.classList.toggle("open", willOpen);
  }

  function openSection(sec) {
    if (!sec) return;
    const box = sec.closest("[data-ui-accordion]");
    if (box && box.getAttribute("data-ui-accordion") === "exclusive") {
      $$(".ui-acc", box).forEach(s => s.classList.remove("open"));
    }
    sec.classList.add("open");
  }

  /* --------------------------------------------------------------------------
     [UC-04] pick — 候補から選ぶ
     対象: [data-ui-pick] を持つ容器（値は "single"（既定）または "multi"）
           中の候補は [data-ui-pick-value]
     挙動: クリックで .ui-picked をトグル（single は排他）。
           容器に ui:pick イベントを発火（detail: {value, values}）。
     API: UICommon.getPicked(container) → 選択中の値の配列
  -------------------------------------------------------------------------- */
  function getPicked(box) {
    return $$("[data-ui-pick-value].ui-picked", box)
      .map(el => el.getAttribute("data-ui-pick-value"));
  }

  function onPickClick(e) {
    const item = e.target.closest("[data-ui-pick-value]");
    if (!item) return;
    const box = item.closest("[data-ui-pick]");
    if (!box) return;
    const multi = box.getAttribute("data-ui-pick") === "multi";
    const value = item.getAttribute("data-ui-pick-value");
    if (multi) {
      item.classList.toggle("ui-picked");
    } else {
      const already = item.classList.contains("ui-picked");
      $$("[data-ui-pick-value]", box).forEach(el => el.classList.remove("ui-picked"));
      if (!already) item.classList.add("ui-picked");
    }
    box.dispatchEvent(new CustomEvent("ui:pick", {
      bubbles: true, detail: { value, values: getPicked(box) }
    }));
  }

  /* --------------------------------------------------------------------------
     [UC-05] text-mark — 本文をドラッグして印を付ける
     対象: [data-ui-mark] の要素。本文は UICommon.setMarkText(el, text) で入れる
           （HTMLを直接書かない。印の再描画で消えるため）
     挙動: ドラッグ選択 → 浮かぶボタン → クリックで <mark> を付ける。
           付いた印をクリックで解除。既存の印と重なる選択は拒否。
     イベント: 要素に ui:markchange（detail: {marks}）を発火
     API: UICommon.setMarkText(el, text) / UICommon.getMarks(el) /
          UICommon.clearMarks(el) / UICommon.setMarks(el, marks)

     ここに閉じ込めてある落とし穴（何度も手書きして毎回踏んだ）:
       - 文字オフセットは TreeWalker で数える（innerHTML の位置とはズレる）
       - 浮かぶボタンは position:fixed。getBoundingClientRect() の値に
         window.scrollY を足すと二重加算で画面外に飛ぶ（足さないのが正解）
       - 画面端でボタンがはみ出さないよう innerWidth/innerHeight でクランプ
       - 既存の印と重なる範囲は弾く（入れ子の <mark> ができて壊れる）
  -------------------------------------------------------------------------- */
  const markStore = new WeakMap();   // el -> {text, marks:[{start,end,text}], uid}
  let markTip = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function ensureTip() {
    if (markTip) return markTip;
    markTip = doc.createElement("button");
    markTip.type = "button";
    markTip.className = "ui-mark-tip";
    markTip.textContent = "ここに印を付ける";
    doc.body.appendChild(markTip);
    markTip.addEventListener("click", () => {
      const host = markTip._host;
      const st = host && markStore.get(host);
      if (!st) return;
      st.marks.push({
        id: "m" + (++st.uid),
        start: markTip._start,
        end: markTip._end,
        text: markTip._text,
      });
      hideTip();
      global.getSelection().removeAllRanges();
      renderMarks(host);
    });
    return markTip;
  }

  function hideTip() {
    if (markTip) { markTip.classList.remove("on"); markTip._host = null; }
  }

  function textOffset(container, node, offset) {
    let count = 0;
    const w = doc.createTreeWalker(container, global.NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) {
      if (n === node) return count + offset;
      count += n.textContent.length;
    }
    return count;
  }

  function renderMarks(el) {
    const st = markStore.get(el);
    if (!st) return;
    let html = "", pos = 0;
    const sorted = st.marks.slice().sort((a, b) => a.start - b.start);
    for (const m of sorted) {
      html += esc(st.text.slice(pos, m.start));
      html += '<mark class="ui-mark" data-ui-mark-id="' + m.id + '" title="クリックで印を外す">'
            + esc(st.text.slice(m.start, m.end)) + "</mark>";
      pos = m.end;
    }
    html += esc(st.text.slice(pos));
    el.innerHTML = html;
    el.dispatchEvent(new CustomEvent("ui:markchange", {
      bubbles: true, detail: { marks: st.marks.slice() }
    }));
  }

  function setMarkText(el, text) {
    if (!el) return;
    markStore.set(el, { text: String(text == null ? "" : text), marks: [], uid: 0 });
    renderMarks(el);
  }
  function getMarks(el) {
    const st = markStore.get(el);
    return st ? st.marks.slice() : [];
  }
  function clearMarks(el) {
    const st = markStore.get(el);
    if (!st) return;
    st.marks = [];
    renderMarks(el);
  }
  function setMarks(el, marks) {
    const st = markStore.get(el);
    if (!st) return;
    st.marks = (marks || []).slice();
    st.uid = st.marks.length;
    renderMarks(el);
  }

  function onMarkMouseUp(e) {
    const host = e.target.closest("[data-ui-mark]");
    if (!host) return;
    const st = markStore.get(host);
    if (!st) return;                       // setMarkText で本文を入れていない
    const sel = global.getSelection();
    if (!sel || !sel.rangeCount) { hideTip(); return; }
    const r = sel.getRangeAt(0);
    if (!host.contains(r.commonAncestorContainer)) { hideTip(); return; }
    const a = textOffset(host, r.startContainer, r.startOffset);
    const b = textOffset(host, r.endContainer, r.endOffset);
    const s = Math.min(a, b), t = Math.max(a, b);
    if (s === t) { hideTip(); return; }
    // 既存の印と重なる選択は弾く（入れ子の mark ができて壊れる）
    if (st.marks.some(m => s < m.end && t > m.start)) { hideTip(); return; }

    const tip = ensureTip();
    tip._host = host; tip._start = s; tip._end = t; tip._text = sel.toString();
    const rect = r.getBoundingClientRect();
    // position:fixed はビューポート基準。scrollY を足すと画面外へ飛ぶ
    const top = Math.min(rect.bottom + 8, global.innerHeight - 52);
    const left = Math.min(Math.max(8, rect.left), global.innerWidth - 190);
    tip.style.top = top + "px";
    tip.style.left = left + "px";
    tip.classList.add("on");
  }

  function onMarkClick(e) {
    const m = e.target.closest("mark[data-ui-mark-id]");
    if (!m) return;
    const host = m.closest("[data-ui-mark]");
    const st = host && markStore.get(host);
    if (!st) return;
    st.marks = st.marks.filter(x => x.id !== m.getAttribute("data-ui-mark-id"));
    renderMarks(host);
  }

  /* --------------------------------------------------------------------------
     [UC-06] autosave — 入力欄の自動保存・復元
     対象: [data-ui-autosave] を持つ input / textarea / select
           値は保存キー（省略時は要素の id を使う）
     挙動: input/change で localStorage に保存。起動時に復元。
     名前空間: data-ui-autosave-ns（既定はページのパス）でツール間の衝突を防ぐ。
     API: UICommon.clearAutosave() で保存済みを消す
  -------------------------------------------------------------------------- */
  function autosaveNS(el) {
    return el.getAttribute("data-ui-autosave-ns") || ("ui:" + global.location.pathname);
  }
  function autosaveKey(el) {
    const k = el.getAttribute("data-ui-autosave") || el.id;
    return k ? autosaveNS(el) + ":" + k : null;
  }
  function saveOne(el) {
    const key = autosaveKey(el);
    if (!key) return;
    try {
      const v = (el.type === "checkbox" || el.type === "radio") ? (el.checked ? "1" : "") : el.value;
      global.localStorage.setItem(key, v);
    } catch (e) {}
  }
  function restoreAutosave() {
    $$("[data-ui-autosave]").forEach(el => {
      const key = autosaveKey(el);
      if (!key) return;
      try {
        const v = global.localStorage.getItem(key);
        if (v === null) return;
        if (el.type === "checkbox" || el.type === "radio") el.checked = !!v;
        else el.value = v;
      } catch (e) {}
    });
  }
  function clearAutosave() {
    $$("[data-ui-autosave]").forEach(el => {
      const key = autosaveKey(el);
      if (!key) return;
      try { global.localStorage.removeItem(key); } catch (e) {}
    });
  }

  /* -------------------------------------------------------------------------- */

  const api = {
    // UC-01
    updatePinScroll: updateAll,
    updatePinScrollEl: updateOne,
    // UC-02
    copyText: copyText,
    toast: toast,
    // UC-03
    openSection: openSection,
    // UC-04
    getPicked: getPicked,
    // UC-05
    setMarkText: setMarkText,
    getMarks: getMarks,
    setMarks: setMarks,
    clearMarks: clearMarks,
    // UC-06
    restoreAutosave: restoreAutosave,
    clearAutosave: clearAutosave,
  };

  function init() {
    updateAll();
    global.addEventListener("resize", updateAll);

    // 委譲でまとめて拾う（動的に増える要素にも効く）
    doc.addEventListener("click", onCopyClick);
    doc.addEventListener("click", onAccordionClick);
    doc.addEventListener("click", onPickClick);
    doc.addEventListener("click", onMarkClick);
    doc.addEventListener("mouseup", onMarkMouseUp);
    doc.addEventListener("mousedown", e => {
      if (markTip && !markTip.contains(e.target) && !e.target.closest("[data-ui-mark]")) hideTip();
    });
    doc.addEventListener("input", e => {
      if (e.target.hasAttribute && e.target.hasAttribute("data-ui-autosave")) saveOne(e.target);
    });
    doc.addEventListener("change", e => {
      if (e.target.hasAttribute && e.target.hasAttribute("data-ui-autosave")) saveOne(e.target);
    });

    restoreAutosave();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.UICommon = Object.assign(global.UICommon || {}, api);
})(window);
