/* KMS admin JS — sidebar, confirms, slug, tags input, selection toggles, file manager. */
(function () {
  "use strict";

  // sidebar (mobile) + treeview
  var tgl = document.getElementById("sidebarToggle");
  var sb = document.getElementById("mainSidebar");
  if (tgl && sb) tgl.addEventListener("click", function () {
    sb.classList.toggle("open");                       /* mobile: slide-in drawer */
  });
  // desktop chevron in the sidebar brand → icon-only collapse
  var col = document.getElementById("sidebarCollapse");
  if (col) col.addEventListener("click", function () {
    document.body.classList.toggle("sidebar-collapse");
  });
  document.querySelectorAll(".treeview > a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.target.classList.contains("caret") || e.offsetX > a.offsetWidth - 34) {
        e.preventDefault();
        a.parentElement.classList.toggle("open");
      }
    });
  });

  // color fields (theme-colors screen): sync picker <-> hex text input
  document.querySelectorAll("input[type=color][data-color-for]").forEach(function (p) {
    var t = document.getElementById("cf-" + p.dataset.colorFor);
    if (!t) return;
    p.addEventListener("input", function () { t.value = p.value; });
    t.addEventListener("input", function () {
      var v = t.value.trim();
      if (v && v[0] !== "#") v = "#" + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) p.value = v;
    });
  });

  // delete confirms
  document.querySelectorAll("form.js-confirm").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      if (!window.confirm(f.dataset.confirm || "Are you sure?")) e.preventDefault();
    });
  });

  // slug auto-fill from title (only when slug empty)
  var title = document.getElementById("postTitle");
  var slug = document.getElementById("postSlug");
  if (title && slug) {
    var slugTouched = slug.value.length > 0;
    slug.addEventListener("input", function () { slugTouched = slug.value.length > 0; });
    title.addEventListener("input", function () {
      if (!slugTouched) {
        slug.value = title.value.toLowerCase()
          .normalize("NFKD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 190);
      }
    });
  }

  // subcategory filter by parent
  var selCat = document.getElementById("selCategory");
  var selSub = document.getElementById("selSubcategory");
  if (selCat && selSub) {
    var filterSubs = function () {
      var pid = selCat.value;
      Array.prototype.forEach.call(selSub.options, function (o) {
        if (!o.value) return;
        o.hidden = o.dataset.parent !== pid;
        if (o.hidden && o.selected) selSub.value = "";
      });
    };
    selCat.addEventListener("change", filterSubs);
    filterSubs();
  }

  // tags input (chips -> hidden CSV)
  var tagsWrap = document.getElementById("tagsInput");
  var tagTyper = document.getElementById("tagTyper");
  var tagsHidden = document.getElementById("tagsHidden");
  if (tagsWrap && tagTyper && tagsHidden) {
    var tags = (tagsHidden.value || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var sync = function () { tagsHidden.value = tags.join(","); };
    var renderChip = function (t) {
      var chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.appendChild(document.createTextNode(t));
      var x = document.createElement("button");
      x.type = "button"; x.textContent = "×";
      x.addEventListener("click", function () {
        tags = tags.filter(function (v) { return v !== t; });
        chip.remove(); sync();
      });
      chip.appendChild(x);
      tagsWrap.insertBefore(chip, tagTyper);
    };
    tags.forEach(renderChip);
    tagTyper.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        var v = tagTyper.value.replace(/,/g, "").trim();
        if (v && tags.indexOf(v) === -1) { tags.push(v); renderChip(v); sync(); }
        tagTyper.value = "";
      }
    });
  }

  // scheduled checkbox hint: submitting with a future date keeps it scheduled
  // selection toggles (slider/featured/breaking/recommended lists)
  document.querySelectorAll(".sel-toggle").forEach(function (cb) {
    cb.addEventListener("change", function () {
      var fd = new FormData();
      fd.append("post_id", cb.dataset.post);
      fd.append("sel", cb.dataset.sel);
      fd.append("on", cb.checked ? "1" : "0");
      fetch("/admin/post-selection", { method: "POST", body: fd })
        .then(function (r) { if (!r.ok) cb.checked = !cb.checked; })
        .catch(function () { cb.checked = !cb.checked; });
    });
  });

  // posts list "Select an option" row actions (Varient-style options dropdown)
  document.querySelectorAll("select.row-action").forEach(function (sel) {
    sel.addEventListener("change", function () {
      var v = sel.value;
      sel.value = "";
      if (!v) return;
      var id = sel.dataset.post;
      if (v === "view") { window.open("/" + sel.dataset.slug, "_blank", "noopener"); return; }
      if (v === "preview") { window.open("/admin/preview-post/" + id, "_blank", "noopener"); return; }
      if (v === "edit") { window.location = "/admin/edit-post/" + id; return; }
      var actions = {
        draft: { action: "/admin/post-set-draft" },
        publish: { action: "/admin/post-approve" },
        replicate: { action: "/admin/kms-replicate", confirm: "Replicate this post to the configured target brands?" },
        delete: { action: "/admin/post-delete", confirm: "Delete this post?" }
      };
      var a = actions[v];
      if (!a) return;
      if (a.confirm && !window.confirm(a.confirm)) return;
      var f = document.createElement("form");
      f.method = "post"; f.action = a.action;
      var i = document.createElement("input");
      i.type = "hidden"; i.name = "post_id"; i.value = id;
      f.appendChild(i);
      document.body.appendChild(f);
      f.submit();
    });
  });

  /* ── File Manager ─────────────────────────────────────────────────────── */
  var fm = {
    modal: document.getElementById("fileManager"),
    backdrop: document.getElementById("fmBackdrop"),
    grid: document.getElementById("fmGrid"),
    more: document.getElementById("fmMore"),
    select: document.getElementById("fmSelect"),
    search: document.getElementById("fmSearch"),
    upload: document.getElementById("fmUpload"),
    status: document.getElementById("fmStatus"),
    offset: 0, q: "", picked: null, target: null, currentId: null, autoFind: false,
    loading: false, gen: 0, loadAll: false,
  };
  if (!fm.modal) return;

  // The image already assigned to whatever opened the picker, so we can jump
  // straight to it instead of making the author hunt through the paginated grid.
  function fmCurrentImageId(target) {
    var v = "";
    if (target === "main") {
      var el = document.getElementById("imageId");
      v = el ? el.value : "";
    } else if (target && target.indexOf("item:") === 0) {
      var row = document.querySelector('.type-item-row[data-row="' + target.slice(5) + '"]');
      var hid = row && row.querySelector(".item-image-id");
      v = hid ? hid.value : "";
    }
    return (v || "").trim();
  }

  function fmOpen(target) {
    fm.target = target;
    fm.picked = null;
    fm.currentId = fmCurrentImageId(target);
    fm.autoFind = !!fm.currentId;   // keep paging until the assigned image shows
    fm.loadAll = true;              // load the WHOLE library so every image is visible
    fm.select.disabled = true;
    fm.modal.hidden = false;
    fm.backdrop.hidden = false;
    fmLoad(true);
  }
  function fmClose() { fm.modal.hidden = true; fm.backdrop.hidden = true; }
  document.getElementById("fmClose").addEventListener("click", fmClose);
  fm.backdrop.addEventListener("click", fmClose);

  function fmLoad(reset) {
    if (!reset && fm.loading) return;              // don't stack incremental loads
    if (reset) { fm.offset = 0; fm.grid.innerHTML = ""; fm.gen++; }
    var gen = fm.gen;
    fm.loading = true;
    var fd = new FormData();
    fd.append("offset", fm.offset);
    fd.append("q", fm.q);
    fetch("/admin/file/get-images", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        fm.loading = false;
        if (gen !== fm.gen || !data.ok) return;    // a reset superseded this load
        data.images.forEach(fmAddItem);
        fm.offset += data.images.length;
        fm.more.hidden = !data.more;
        fm.status.textContent = data.total + " images";
        // On open, page through the WHOLE library so every image is present (the
        // author assigns manually and must see them all). `loadAll` covers that;
        // `autoFind` still stops early once the assigned image is reached only for
        // the scroll position; `notScrollable` is the fallback. Never while searching.
        var notScrollable = fm.grid.scrollHeight <= fm.grid.clientHeight + 4;
        if (data.more && !fm.q && (fm.loadAll || fm.autoFind || notScrollable)) fmLoad(false);
      })
      .catch(function () { fm.loading = false; });
  }
  fm.more.addEventListener("click", function () { fmLoad(false); });
  // Infinite scroll: load the next page as the grid nears its bottom, so a large
  // library is fully browsable by scrolling (the "Load More" button stays too).
  fm.grid.addEventListener("scroll", function () {
    if (fm.loading || fm.autoFind || fm.more.hidden) return;
    if (fm.grid.scrollTop + fm.grid.clientHeight >= fm.grid.scrollHeight - 48) fmLoad(false);
  });

  var searchTimer = null;
  fm.search.addEventListener("input", function () {
    clearTimeout(searchTimer);
    fm.autoFind = false;   // a search is an explicit intent — don't jump to the assigned image
    fm.loadAll = false;    // filtered results page on scroll, not all-at-once
    searchTimer = setTimeout(function () { fm.q = fm.search.value; fmLoad(true); }, 350);
  });

  function fmAddItem(img) {
    var div = document.createElement("div");
    div.className = "fm-item";
    div.dataset.id = img.id;
    var im = document.createElement("img");
    im.src = img.small; im.alt = img.name; im.loading = "lazy";
    div.appendChild(im);
    var del = document.createElement("button");
    del.className = "fm-del"; del.type = "button"; del.textContent = "×";
    del.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!window.confirm("Delete this image?")) return;
      var fd = new FormData();
      fd.append("image_id", img.id);
      fetch("/admin/file/delete-image", { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.ok) div.remove(); });
    });
    div.appendChild(del);
    div.addEventListener("click", function () {
      fm.grid.querySelectorAll(".fm-item.selected").forEach(function (el) { el.classList.remove("selected"); });
      div.classList.add("selected");
      fm.picked = img;
      fm.select.disabled = false;
    });
    fm.grid.appendChild(div);
    // Pre-select + reveal the image already assigned to the post, so the author
    // lands on it instead of paging through the grid to find it.
    if (fm.currentId && String(img.id) === String(fm.currentId)) {
      div.classList.add("selected");
      fm.picked = img;
      fm.select.disabled = false;
      fm.autoFind = false;
      try { div.scrollIntoView({ block: "nearest" }); } catch (e) {}
    }
  }

  function fmDoUpload(fileOrBlob, filename, watermark) {
    fm.status.textContent = "Uploading…";
    var fd = new FormData();
    fd.append("file", fileOrBlob, filename || "image.jpg");
    // Watermark is now burned in SERVER-SIDE per brand; the client just says whether.
    fd.append("watermark", watermark === false ? "0" : "1");
    fetch("/admin/file/upload-image", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        fm.upload.value = "";
        fm.autoFind = false;   // a fresh upload lands at the top — don't jump to the old assigned image
        if (d.ok) fmLoad(true);
        else fm.status.textContent = d.error || "Upload failed";
      })
      .catch(function () { fm.status.textContent = "Upload failed"; });
  }

  // On upload, open the adjust step first (Crop / Auto Stretch / Use Original).
  fm.upload.addEventListener("change", function () {
    var f = fm.upload.files[0];
    if (f) adjOpen(f);
  });

  /* ── Image Adjust: Crop / Auto Stretch / Use Original ─────────────────────
     Runs entirely client-side. The chosen result is drawn on a <canvas> and the
     resulting JPEG blob is what gets uploaded (never the untouched original,
     unless "Use Original" is picked). Target = 3:2, matching the featured-image
     variant (image_big 870x580) so it fills the display slots edge-to-edge. */
  var RATIO = 3 / 2;
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  var adj = {
    modal: document.getElementById("imageAdjust"),
    backdrop: document.getElementById("adjBackdrop"),
    stage: document.getElementById("adjStage"),
    preview: document.getElementById("adjPreview"),
    hint: document.getElementById("adjHint"),
    mode: "crop", file: null, url: null, img: null, box: null,
    disp: { scale: 1, w: 0, h: 0 }, crop: { x: 0, y: 0, w: 0, h: 0 },
  };

  // Brand-logo watermark. Loaded from the KMS's OWN origin (same-origin => the
  // canvas stays untainted) so it can be burned into the uploaded image. If no
  // logo is configured the endpoint 404s and the whole option is hidden.
  var wmImg = null;
  if (adj.modal) {
    var _wm = new Image();
    _wm.onload = function () {
      wmImg = _wm;
      var pv = document.getElementById("adjWmPreview");
      if (pv) pv.src = "/admin/watermark-logo";
      var row = document.getElementById("adjWmRow");
      if (row) row.hidden = false;
    };
    _wm.onerror = function () {
      var row = document.getElementById("adjWmRow");
      if (row) row.hidden = true;
    };
    _wm.src = "/admin/watermark-logo";
  }
  function wmOn() {
    var cb = document.getElementById("adjWatermark");
    return !!(wmImg && wmImg.naturalWidth && cb && cb.checked);
  }
  function syncWmPreview() {
    var pv = document.getElementById("adjWmPreview");
    if (pv) pv.hidden = !wmOn();
  }
  function drawWatermark(ctx, cw, ch) {
    if (!wmImg || !wmImg.naturalWidth) return;
    var tw = Math.round(cw * 0.20);
    var th = Math.round(wmImg.naturalHeight * (tw / wmImg.naturalWidth));
    var m = Math.round(cw * 0.04);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(wmImg, cw - tw - m, ch - th - m, tw, th);
    ctx.restore();
  }

  function adjOpen(file) {
    if (!adj.modal) { fmDoUpload(file, file.name); return; }  // no modal -> upload as-is
    adj.file = file;
    if (adj.url) URL.revokeObjectURL(adj.url);
    adj.url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function () {
      adj.img = im;
      adj.modal.hidden = false;
      adj.backdrop.hidden = false;
      setMode("crop");
    };
    im.onerror = function () { fm.status.textContent = "Could not read that image."; fm.upload.value = ""; };
    im.src = adj.url;
  }

  function adjClose() {
    if (!adj.modal) return;
    adj.modal.hidden = true;
    adj.backdrop.hidden = true;
    if (adj.url) { URL.revokeObjectURL(adj.url); adj.url = null; }
    adj.img = null; adj.file = null; fm.upload.value = "";
  }

  function setMode(m) {
    adj.mode = m;
    adj.modal.querySelectorAll(".adj-mode").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === m);
    });
    if (m === "crop") {
      buildCropStage();
      adj.hint.textContent = "Drag inside the box to move it, drag a corner to resize. It stays locked to 3:2, so nothing is distorted — only the area outside is cut.";
    } else if (m === "stretch") {
      buildFlatStage(true);
      adj.hint.textContent = "The whole image is scaled to fill 3:2 with no cropping. Watch the preview for distortion if the shape is far from 3:2.";
    } else {
      buildFlatStage(false);
      adj.hint.textContent = "The image is uploaded unchanged. It may letterbox inside the fixed 3:2 slots.";
    }
  }

  function fitDisp(maxW, maxH) {
    var s = Math.min(maxW / adj.img.naturalWidth, maxH / adj.img.naturalHeight, 1);
    adj.disp = { scale: s, w: Math.round(adj.img.naturalWidth * s), h: Math.round(adj.img.naturalHeight * s) };
  }

  function buildCropStage() {
    fitDisp(560, 400);
    adj.stage.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "adj-cropwrap";
    wrap.style.width = adj.disp.w + "px";
    wrap.style.height = adj.disp.h + "px";
    var im = document.createElement("img");
    im.src = adj.url; im.className = "adj-cropimg"; im.draggable = false;
    wrap.appendChild(im);
    var box = document.createElement("div");
    box.className = "adj-cropbox";
    ["nw", "ne", "sw", "se"].forEach(function (h) {
      var hd = document.createElement("span");
      hd.className = "adj-handle h-" + h; hd.dataset.h = h;
      box.appendChild(hd);
    });
    wrap.appendChild(box);
    adj.stage.appendChild(wrap);
    adj.box = box;
    // largest 3:2 rectangle, centred
    var cw = adj.disp.w, ch = cw / RATIO;
    if (ch > adj.disp.h) { ch = adj.disp.h; cw = ch * RATIO; }
    adj.crop = { x: (adj.disp.w - cw) / 2, y: (adj.disp.h - ch) / 2, w: cw, h: ch };
    renderCrop();
    wireCrop(box);
  }

  function renderCrop() {
    var c = adj.crop, b = adj.box;
    b.style.left = c.x + "px"; b.style.top = c.y + "px";
    b.style.width = c.w + "px"; b.style.height = c.h + "px";
    updatePreview();
  }

  function resizeCorner(c, h, dx, dy) {
    var minW = 60;
    var right = c.x + c.w, bottom = c.y + c.h;
    var ax = (h === "nw" || h === "sw") ? right : c.x;   // fixed (opposite) corner x
    var ay = (h === "nw" || h === "ne") ? bottom : c.y;  // fixed corner y
    var mx = ((h === "ne" || h === "se") ? right : c.x) + dx;  // moving corner x
    var my = ((h === "sw" || h === "se") ? bottom : c.y) + dy; // moving corner y
    var w = Math.max(minW, Math.abs(mx - ax));
    var hh = w / RATIO;
    var roomX = (mx >= ax) ? (adj.disp.w - ax) : ax;     // horizontal room to the anchor
    var roomY = (my >= ay) ? (adj.disp.h - ay) : ay;     // vertical room to the anchor
    if (w > roomX) { w = roomX; hh = w / RATIO; }
    if (hh > roomY) { hh = roomY; w = hh * RATIO; }
    c.w = w; c.h = hh;
    c.x = (mx >= ax) ? ax : ax - w;
    c.y = (my >= ay) ? ay : ay - hh;
  }

  function wireCrop(box) {
    var drag = null;
    function move(e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      var c = { x: drag.c.x, y: drag.c.y, w: drag.c.w, h: drag.c.h };
      if (drag.mode === "move") {
        c.x = clamp(c.x + dx, 0, adj.disp.w - c.w);
        c.y = clamp(c.y + dy, 0, adj.disp.h - c.h);
      } else {
        resizeCorner(c, drag.h, dx, dy);
      }
      adj.crop = c; renderCrop();
    }
    function up() {
      drag = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    box.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      var isHandle = e.target.classList.contains("adj-handle");
      drag = { mode: isHandle ? "resize" : "move", h: e.target.dataset.h,
               sx: e.clientX, sy: e.clientY,
               c: { x: adj.crop.x, y: adj.crop.y, w: adj.crop.w, h: adj.crop.h } };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }

  function buildFlatStage(stretch) {
    fitDisp(560, 400);
    adj.stage.innerHTML = "";
    var box = document.createElement("div");
    box.className = "adj-flat";
    box.style.backgroundImage = 'url("' + adj.url + '")';
    if (stretch) {
      var w = adj.disp.w, h = w / RATIO;
      if (h > 400) { h = 400; w = h * RATIO; }
      box.style.width = w + "px"; box.style.height = h + "px";
      box.style.backgroundSize = "100% 100%";
    } else {
      box.style.width = adj.disp.w + "px"; box.style.height = adj.disp.h + "px";
      box.style.backgroundSize = "contain";
      box.style.backgroundPosition = "center";
    }
    adj.stage.appendChild(box);
    updatePreview();
  }

  function updatePreview() {
    var pv = adj.preview;
    pv.style.backgroundImage = 'url("' + adj.url + '")';
    var pw = pv.clientWidth, ph = pv.clientHeight;
    if (adj.mode === "crop") {
      var s = adj.disp.scale;
      var sx = adj.crop.x / s, sy = adj.crop.y / s, sw = adj.crop.w / s, sh = adj.crop.h / s;
      pv.style.backgroundSize = (pw * adj.img.naturalWidth / sw) + "px " + (ph * adj.img.naturalHeight / sh) + "px";
      pv.style.backgroundPosition = (-sx / sw * pw) + "px " + (-sy / sh * ph) + "px";
    } else if (adj.mode === "stretch") {
      pv.style.backgroundSize = "100% 100%";
      pv.style.backgroundPosition = "0 0";
    } else {
      pv.style.backgroundSize = "contain";
      pv.style.backgroundPosition = "center";
    }
    syncWmPreview();
  }

  function adjConfirm() {
    var wm = wmOn();
    // "Use Original" = upload the untouched (CLEAN) file; the brand watermark, if
    // requested, is burned in SERVER-SIDE per brand — never baked by the browser.
    if (adj.mode === "original") { fmDoUpload(adj.file, adj.file.name, wm); adjClose(); return; }
    var canvas = document.createElement("canvas");
    var nw = adj.img.naturalWidth, nh = adj.img.naturalHeight, ctx;
    if (adj.mode === "crop") {
      var s = adj.disp.scale;
      var sx = adj.crop.x / s, sy = adj.crop.y / s, sw = adj.crop.w / s, sh = adj.crop.h / s;
      var ow = Math.min(Math.round(sw), 2000), oh = Math.round(ow / RATIO);
      canvas.width = ow; canvas.height = oh;
      ctx = canvas.getContext("2d");
      ctx.drawImage(adj.img, sx, sy, sw, sh, 0, 0, ow, oh);
    } else if (adj.mode === "stretch") {
      var ow2 = Math.min(nw, 1800), oh2 = Math.round(ow2 / RATIO);
      canvas.width = ow2; canvas.height = oh2;
      ctx = canvas.getContext("2d");
      ctx.drawImage(adj.img, 0, 0, nw, nh, 0, 0, ow2, oh2);
    } else {  // original shape, but re-encoded so the watermark can be burned in
      var ow3 = Math.min(nw, 2000), oh3 = Math.round(nh * (ow3 / nw));
      canvas.width = ow3; canvas.height = oh3;
      ctx = canvas.getContext("2d");
      ctx.drawImage(adj.img, 0, 0, nw, nh, 0, 0, ow3, oh3);
    }
    canvas.toBlob(function (blob) {
      if (!blob) { fm.status.textContent = "Could not process the image."; return; }
      var base = (adj.file.name || "image").replace(/\.[^.]+$/, "");
      fmDoUpload(blob, base + "-" + adj.mode + ".jpg", wm);
      adjClose();
    }, "image/jpeg", 0.92);
  }

  if (adj.modal) {
    adj.modal.querySelectorAll(".adj-mode").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.dataset.mode); });
    });
    document.getElementById("adjClose").addEventListener("click", adjClose);
    document.getElementById("adjCancel").addEventListener("click", adjClose);
    adj.backdrop.addEventListener("click", adjClose);
    document.getElementById("adjConfirm").addEventListener("click", adjConfirm);
    var wmCb = document.getElementById("adjWatermark");
    if (wmCb) wmCb.addEventListener("change", syncWmPreview);
  }

  fm.select.addEventListener("click", function () {
    if (!fm.picked) return;
    if (fm.target === "main") {
      var idInput = document.getElementById("imageId");
      var prev = document.getElementById("mainImagePreview");
      if (idInput) idInput.value = fm.picked.id;
      if (prev) prev.innerHTML = '<img src="' + fm.picked.big + '" alt="">';
    } else if (fm.target === "editor" && window.tinymce && tinymce.activeEditor) {
      tinymce.activeEditor.insertContent('<img src="' + fm.picked.big + '" alt="' + (fm.picked.name || "") + '">');
    } else if (fm.target && fm.target.indexOf("item:") === 0) {
      // per-item image for gallery / sorted-list / TOC post editors (Phase 4c-1)
      var row = document.querySelector('.type-item-row[data-row="' + fm.target.slice(5) + '"]');
      if (row) {
        var hid = row.querySelector(".item-image-id");
        var prev = row.querySelector(".item-image-preview");
        if (hid) hid.value = fm.picked.id;
        if (prev) prev.innerHTML = '<img src="' + fm.picked.big + '" alt="">';
      }
    }
    fmClose();
  });
  window.kmsFmOpen = fmOpen;

  var btnMain = document.getElementById("btnBrowseMain");
  if (btnMain) btnMain.addEventListener("click", function () { fmOpen("main"); });
  var btnResetMain = document.getElementById("btnResetMain");
  if (btnResetMain) btnResetMain.addEventListener("click", function () {
    var idInput = document.getElementById("imageId");
    var prev = document.getElementById("mainImagePreview");
    if (idInput) idInput.value = "";
    if (prev) prev.innerHTML = "";
    // Also clear the "Image URL" + description so Reset fully empties the post
    // image (an image_url alone would otherwise keep supplying a thumbnail).
    var form = idInput ? idInput.form : document;
    var urlInput = form.querySelector('input[name="image_url"]');
    if (urlInput) urlInput.value = "";
    var descInput = form.querySelector('input[name="image_description"]');
    if (descInput) descInput.value = "";
  });
  var btnEd = document.getElementById("btnEditorImage");
  if (btnEd) btnEd.addEventListener("click", function () { fmOpen("editor"); });
  /* AI Writer button is handled by the post_form modal (Phase 4a). */
})();
