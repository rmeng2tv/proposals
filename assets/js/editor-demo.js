/* 에디터 체험 · 업종 공통. 업종별 문구·사진은 HTML에만 있고, 여기서는 읽어서 DEFAULTS로 삼는다 */
(function () {
  var sample = document.querySelector(".smp");
  var frame = document.querySelector(".alm-ed-frame");
  var panel = document.querySelector(".alm-ed-panel");
  if (!sample || !frame || !panel) return;

  var handle = panel.querySelector("[data-action='sheet']");
  var body = panel.querySelector(".alm-ed-panel__body");
  var sheetMode = window.matchMedia("(max-width: 1023px)");
  var uploads = {};

  function readDefaults() {
    var texts = {};
    sample.querySelectorAll("[data-field]").forEach(function (el) {
      if (!(el.dataset.field in texts)) texts[el.dataset.field] = el.textContent.trim();
    });
    var photos = {};
    sample.querySelectorAll("[data-photo]").forEach(function (el) {
      photos[el.dataset.photo] = {
        src: el.querySelector("img").getAttribute("src"),
        fx: Number(el.dataset.fx || 50),
        fy: Number(el.dataset.fy || 50),
        dim: Number(el.dataset.dim || 0)
      };
    });
    return { draft: sample.dataset.draft || "1", device: frame.dataset.device || "pc", texts: texts, photos: photos };
  }

  var DEFAULTS = readDefaults();
  var state = clone(DEFAULTS);

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function render() {
    sample.dataset.draft = state.draft;
    frame.dataset.device = state.device;

    document.querySelectorAll("[data-set]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(state[btn.dataset.set] === btn.dataset.value));
    });

    sample.querySelectorAll("[data-field]").forEach(function (el) {
      el.textContent = state.texts[el.dataset.field];
    });

    panel.querySelectorAll("[data-bind]").forEach(function (input) {
      var value = state.texts[input.dataset.bind];
      if (input.value !== value) input.value = value;
      var count = input.parentElement.querySelector(".alm-ed-count");
      if (count) count.textContent = value.length + " / " + input.maxLength;
    });

    sample.querySelectorAll("[data-photo]").forEach(function (el) {
      var p = state.photos[el.dataset.photo];
      var img = el.querySelector("img");
      if (img.getAttribute("src") !== p.src) img.setAttribute("src", p.src);
      el.style.setProperty("--fx", p.fx + "%");
      el.style.setProperty("--fy", p.fy + "%");
      el.style.setProperty("--dim", String(p.dim / 100));
    });

    panel.querySelectorAll("[data-focus]").forEach(function (box) {
      var p = state.photos[box.dataset.focus];
      var img = box.querySelector("img");
      if (img.getAttribute("src") !== p.src) img.setAttribute("src", p.src);
      box.style.setProperty("--fx", p.fx + "%");
      box.style.setProperty("--fy", p.fy + "%");
    });

    panel.querySelectorAll("[data-dim]").forEach(function (range) {
      var p = state.photos[range.dataset.dim];
      var wrap = range.closest(".alm-ed-range");
      var off = wrap.dataset.dimDrafts.split(" ").indexOf(state.draft) === -1;
      range.value = p.dim;
      range.disabled = off;
      wrap.classList.toggle("is-off", off);
      wrap.querySelector("output").textContent = p.dim + "%";
    });
  }

  function setSheet(open) {
    panel.classList.toggle("is-open", open);
    handle.setAttribute("aria-expanded", String(open));
    handle.textContent = open ? "닫고 결과 보기" : "편집하기";
    body.inert = sheetMode.matches && !open;
  }

  function revokeUploads() {
    Object.keys(uploads).forEach(function (key) { URL.revokeObjectURL(uploads[key]); });
    uploads = {};
  }

  function flashField(key) {
    var input = panel.querySelector("[data-bind='" + key + "']");
    if (!input) return;
    var group = input.closest("details");
    if (group) group.open = true;
    setSheet(true);
    var field = input.closest(".alm-ed-field");
    field.classList.add("is-flash");
    setTimeout(function () { field.classList.remove("is-flash"); }, 1200);
    input.focus({ preventScroll: true });
    field.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  panel.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.bind) state.texts[t.dataset.bind] = t.value;
    else if (t.dataset.dim) state.photos[t.dataset.dim].dim = Number(t.value);
    else return;
    render();
  });

  panel.addEventListener("change", function (e) {
    var key = e.target.dataset.upload;
    if (!key) return;
    var file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || file.type.indexOf("image/") !== 0) return;
    // 서버 전송 없이 이 브라우저 메모리 안에서만 쓰는 임시 주소. 바꿀 때마다 이전 것은 해제
    if (uploads[key]) URL.revokeObjectURL(uploads[key]);
    uploads[key] = URL.createObjectURL(file);
    state.photos[key].src = uploads[key];
    state.photos[key].fx = 50;
    state.photos[key].fy = 50;
    render();
  });

  panel.addEventListener("click", function (e) {
    var box = e.target.closest("[data-focus]");
    if (!box) return;
    var rect = box.getBoundingClientRect();
    var p = state.photos[box.dataset.focus];
    p.fx = Math.round(Math.min(100, Math.max(0, (e.clientX - rect.left) / rect.width * 100)));
    p.fy = Math.round(Math.min(100, Math.max(0, (e.clientY - rect.top) / rect.height * 100)));
    render();
  });

  document.addEventListener("click", function (e) {
    var setter = e.target.closest("[data-set]");
    if (setter) {
      state[setter.dataset.set] = setter.dataset.value;
      render();
      return;
    }
    var action = e.target.closest("[data-action]");
    if (action && action.dataset.action === "reset") {
      revokeUploads();
      state = clone(DEFAULTS);
      render();
      return;
    }
    if (action && action.dataset.action === "sheet") {
      setSheet(!panel.classList.contains("is-open"));
      return;
    }
    var field = e.target.closest(".smp [data-field]");
    if (field) flashField(field.dataset.field);
  });

  sheetMode.addEventListener("change", function () { setSheet(panel.classList.contains("is-open")); });
  setSheet(false);
  render();
})();
