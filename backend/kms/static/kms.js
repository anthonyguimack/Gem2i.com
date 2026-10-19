/* KMS public theme JS — newsticker, slider, nav, search, dark mode, reactions. */
(function () {
  "use strict";

  // mobile nav
  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("navMenu");
  if (burger && menu) burger.addEventListener("click", function () { menu.classList.toggle("open"); });

  // search toggle
  var btnSearch = document.getElementById("btnSearch");
  var searchForm = document.getElementById("searchForm");
  if (btnSearch && searchForm) {
    btnSearch.addEventListener("click", function (e) {
      e.stopPropagation();
      searchForm.classList.toggle("open");
      var inp = searchForm.querySelector("input");
      if (searchForm.classList.contains("open") && inp) inp.focus();
    });
    document.addEventListener("click", function (e) {
      if (!searchForm.contains(e.target) && e.target !== btnSearch) searchForm.classList.remove("open");
    });
  }

  // dark mode
  var btnDark = document.getElementById("btnDarkMode");
  if (btnDark) btnDark.addEventListener("click", function () {
    fetch("/switch-dark-mode", { method: "POST" }).then(function () { location.reload(); });
  });

  // newsticker rotation
  var nt = document.getElementById("newsticker");
  if (nt) {
    var items = nt.querySelectorAll("li");
    var idx = 0, timer = null;
    function show(i) {
      items[idx].classList.remove("active");
      idx = (i + items.length) % items.length;
      items[idx].classList.add("active");
    }
    function auto() { timer = setInterval(function () { show(idx + 1); }, 5000); }
    if (items.length > 1) {
      auto();
      var p = document.getElementById("ntPrev"), n = document.getElementById("ntNext");
      if (p) p.addEventListener("click", function () { clearInterval(timer); show(idx - 1); auto(); });
      if (n) n.addEventListener("click", function () { clearInterval(timer); show(idx + 1); auto(); });
    }
  }

  // main slider
  var slider = document.getElementById("mainSlider");
  if (slider) {
    var slides = slider.querySelectorAll(".slide");
    var dots = slider.querySelectorAll(".slider-dots .dot");
    var si = 0, st = null;
    function go(i) {
      slides[si].classList.remove("active");
      if (dots[si]) dots[si].classList.remove("active");
      si = (i + slides.length) % slides.length;
      slides[si].classList.add("active");
      if (dots[si]) dots[si].classList.add("active");
    }
    function sauto() { st = setInterval(function () { go(si + 1); }, 6500); }
    if (slides.length > 1) {
      sauto();
      var sp = document.getElementById("slPrev"), sn = document.getElementById("slNext");
      if (sp) sp.addEventListener("click", function () { clearInterval(st); go(si - 1); sauto(); });
      if (sn) sn.addEventListener("click", function () { clearInterval(st); go(si + 1); sauto(); });
      dots.forEach(function (d) {
        d.addEventListener("click", function () { clearInterval(st); go(parseInt(d.dataset.i, 10)); sauto(); });
      });
    }
  }

  // cookies banner
  var cb = document.getElementById("cookiesBanner");
  var cbBtn = document.getElementById("btnAcceptCookies");
  if (cb && cbBtn) cbBtn.addEventListener("click", function () {
    fetch("/close-cookies-warning-post", { method: "POST" }).finally(function () { cb.remove(); });
  });

  // reactions
  var rx = document.querySelector(".post-reactions");
  if (rx) {
    var postId = rx.dataset.postId;
    var voted = false;
    rx.querySelectorAll(".reaction").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (voted) return;
        voted = true;
        fetch("/reaction/" + postId + "/" + btn.dataset.kind, { method: "POST" })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok && data.counts) {
              Object.keys(data.counts).forEach(function (k) {
                var el = document.getElementById("rc-" + k);
                if (el) el.textContent = data.counts[k];
              });
            }
          })
          .catch(function () { voted = false; });
      });
    });
  }
})();

/* Phase 4a: comment reply links */
(function () {
  var parent = document.getElementById("commentParent");
  if (!parent) return;
  var box = document.getElementById("commentReplying");
  var nameEl = document.getElementById("commentReplyName");
  var cancel = document.getElementById("commentReplyCancel");
  document.querySelectorAll(".comment-reply-link").forEach(function (a) {
    a.addEventListener("click", function () {
      parent.value = a.getAttribute("data-parent") || "0";
      var head = a.closest(".comment-head");
      var author = head ? head.querySelector(".comment-author") : null;
      if (nameEl) nameEl.textContent = author ? author.textContent : "";
      if (box) box.hidden = false;
    });
  });
  if (cancel) cancel.addEventListener("click", function (e) {
    e.preventDefault();
    parent.value = "0";
    if (box) box.hidden = true;
  });
})();

/* ── Phase 4c-2: quiz play + poll voting ────────────────────────────────── */
(function () {
  var qp = document.getElementById("quizPlay");
  if (qp) {
    var btn = document.getElementById("quizSubmit");
    btn.addEventListener("click", function () {
      var answers = {};
      qp.querySelectorAll(".quiz-q").forEach(function (q) {
        var sel = q.querySelector("input:checked");
        if (sel) answers[q.dataset.q] = sel.dataset.a;
      });
      btn.disabled = true;
      fetch("/quiz-submit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: parseInt(qp.dataset.postId, 10), answers: answers }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) { btn.disabled = false; return; }
          var res = document.getElementById("quizResult");
          var html = "";
          if (d.mode === "trivia") {
            html += "<h3>You got " + d.correct_count + " / " + d.total + " correct</h3>";
            qp.querySelectorAll(".quiz-q").forEach(function (q, i) {
              var pq = d.per_question[i];
              if (!pq) return;
              q.classList.add(pq.was_correct ? "q-correct" : "q-wrong");
              var labels = q.querySelectorAll(".quiz-ans");
              if (pq.correct_index >= 0 && labels[pq.correct_index])
                labels[pq.correct_index].classList.add("ans-correct");
            });
          }
          if (d.result) html += "<h4>" + d.result.title + "</h4>" +
            (d.result.description ? "<p>" + d.result.description + "</p>" : "");
          else if (d.mode === "personality") html += "<p>Answer more questions to get a result.</p>";
          res.innerHTML = html;
          res.hidden = false;
          res.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
        .catch(function () { btn.disabled = false; });
    });
  }

  var pp = document.getElementById("pollPlay");
  if (pp) {
    var init = {};
    var initEl = document.getElementById("pollInit");
    if (initEl) { try { init = JSON.parse(initEl.textContent); } catch (e) {} }
    var renderQ = function (q, counts, mineA) {
      var qi = q.dataset.q, total = 0;
      var opts = q.querySelectorAll(".poll-option");
      opts.forEach(function (o) { total += counts[qi + ":" + o.dataset.a] || 0; });
      opts.forEach(function (o) {
        var n = counts[qi + ":" + o.dataset.a] || 0;
        var pct = total ? Math.round(n * 100 / total) : 0;
        var wrap = o.querySelector(".poll-bar-wrap");
        wrap.hidden = false;
        o.querySelector(".poll-bar").style.width = pct + "%";
        o.querySelector(".poll-pct").textContent = pct + "% (" + n + ")";
        var b = o.querySelector(".poll-vote-btn");
        if (mineA !== undefined) {
          b.disabled = true;
          if (String(mineA) === o.dataset.a) b.classList.add("voted");
        }
      });
    };
    var applyState = function (data) {
      pp.querySelectorAll(".poll-q").forEach(function (q) {
        var mine = data.mine || {};
        var qi = q.dataset.q;
        if (mine[qi] !== undefined || pp.dataset.public === "1")
          renderQ(q, data.counts || {}, mine[qi]);
      });
    };
    applyState(init);
    pp.querySelectorAll(".poll-vote-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var opt = b.closest(".poll-option");
        var q = b.closest(".poll-q");
        fetch("/post-poll-vote", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: parseInt(pp.dataset.postId, 10),
                                 question: parseInt(q.dataset.q, 10),
                                 answer: parseInt(opt.dataset.a, 10) }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.ok) applyState(d); });
      });
    });
  }
})();

/* Back to top (D-2026-80) — mirrors the beta's BackToTop.js: reveal past 300px,
   smooth-scroll home. Passive scroll listener; honours reduced motion. */
(function () {
  var btn = document.getElementById("btnToTop");
  if (!btn) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function onScroll() { btn.classList.toggle("show", window.scrollY > 300); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });
})();

/* ============================================================================
   Reading-comprehension quiz (member-only, article-attached) — Stage 1.
   Presentation only: one question at a time, instant correct/incorrect feedback
   with an explanation, then a final score. No server round-trip, no persistence
   yet (the Member-Points hook comes in a later stage). Data is embedded in
   #kmsQuizData only for logged-in members (server-gated in _render_post).
   ========================================================================== */
(function () {
  var dataEl = document.getElementById("kmsQuizData");
  var modal = document.getElementById("kmsQuizModal");
  var openBtn = document.getElementById("kmsQuizOpen");
  if (!dataEl || !modal || !openBtn) return;

  var data;
  try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { return; }
  var questions = (data && data.questions) || [];
  if (!questions.length) return;

  var LETTERS = ["A", "B", "C", "D", "E", "F"];
  var bodyEl = document.getElementById("kmsQuizBody");
  var nextBtn = document.getElementById("kmsQuizNext");
  var stepEl = document.getElementById("kmsQuizStep");
  var totalEl = document.getElementById("kmsQuizTotal");
  var barEl = document.getElementById("kmsQuizBar");
  var tallyEl = document.getElementById("kmsQuizTally");
  var progressEl = document.getElementById("kmsQuizProgress");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastFocus = null;

  var idx = 0, score = 0, answered = [], picks = [], finished = false, submitted = false;

  function reset() {
    idx = 0; score = 0; answered = []; picks = []; finished = false; submitted = false;
    for (var i = 0; i < questions.length; i++) { answered[i] = false; picks[i] = -1; }
  }

  function setBar() {
    var done = 0;
    for (var i = 0; i < questions.length; i++) if (answered[i]) done++;
    if (finished) done = questions.length;
    barEl.style.width = ((done / questions.length) * 100) + "%";
  }

  function renderQuestion() {
    var q = questions[idx];
    finished = false;
    progressEl.hidden = false;
    stepEl.textContent = String(idx + 1);
    totalEl.textContent = String(questions.length);
    bodyEl.scrollTop = 0;

    var wrap = document.createElement("div");
    var qh = document.createElement("div");
    qh.className = "kms-quiz-question";
    qh.textContent = (idx + 1) + ". " + (q.q || "");
    wrap.appendChild(qh);

    var opts = document.createElement("div");
    opts.className = "kms-quiz-opts";
    (q.options || []).forEach(function (text, oi) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "kms-quiz-opt";
      var letter = document.createElement("span");
      letter.className = "kms-quiz-letter";
      letter.textContent = LETTERS[oi] || String(oi + 1);
      var span = document.createElement("span");
      span.className = "kms-quiz-opt-text";
      span.textContent = text;
      b.appendChild(letter); b.appendChild(span);
      b.addEventListener("click", function () { choose(oi); });
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    bodyEl.innerHTML = "";
    bodyEl.appendChild(wrap);

    tallyEl.hidden = (score === 0 && !anyAnswered());
    if (!tallyEl.hidden) tallyEl.textContent = score + " correct so far";
    nextBtn.disabled = true;
    nextBtn.textContent = (idx === questions.length - 1) ? "See results" : "Next";
    setBar();
  }

  function anyAnswered() {
    for (var i = 0; i < questions.length; i++) if (answered[i]) return true;
    return false;
  }

  function choose(oi) {
    if (answered[idx]) return;
    answered[idx] = true;
    picks[idx] = oi;
    var q = questions[idx];
    var correct = q.correct;
    var isRight = (oi === correct);
    if (isRight) score++;

    var btns = bodyEl.querySelectorAll(".kms-quiz-opt");
    btns.forEach(function (b, bi) {
      b.disabled = true;
      if (bi === correct) b.classList.add("is-correct");
      if (bi === oi && !isRight) b.classList.add("is-wrong");
    });

    var ex = document.createElement("div");
    ex.className = "kms-quiz-explain";
    var verdict = document.createElement("div");
    verdict.className = "kms-quiz-verdict " + (isRight ? "ok" : "no");
    verdict.textContent = isRight ? "✓ Correct" : "✕ Not quite";
    ex.appendChild(verdict);
    if (q.explanation) {
      var lbl = document.createElement("b");
      lbl.textContent = "Why";
      var p = document.createElement("span");
      p.textContent = q.explanation;
      ex.appendChild(lbl); ex.appendChild(p);
    }
    bodyEl.querySelector(".kms-quiz-opts").insertAdjacentElement("afterend", ex);

    tallyEl.hidden = false;
    tallyEl.textContent = score + " / " + questions.length + " correct";
    nextBtn.disabled = false;
    setBar();
  }

  function showResults() {
    finished = true;
    var total = questions.length;
    var pct = Math.round((score / total) * 100);
    var msg;
    if (pct >= 90) msg = "Outstanding — you clearly absorbed this article.";
    else if (pct >= 70) msg = "Solid work — a strong grasp of the key ideas.";
    else if (pct >= 50) msg = "Good start — a re-read will lock in the details.";
    else msg = "Worth another read — the core ideas are subtle here.";

    progressEl.hidden = true;
    tallyEl.hidden = true;
    bodyEl.innerHTML = "";
    var r = document.createElement("div");
    r.className = "kms-quiz-result";
    var ring = document.createElement("div");
    ring.className = "kms-quiz-ring";
    var rspan = document.createElement("span");
    rspan.textContent = pct + "%";
    ring.appendChild(rspan);
    var num = document.createElement("div");
    num.className = "kms-quiz-score-num";
    num.textContent = score + "/" + total;
    var lbl = document.createElement("div");
    lbl.className = "kms-quiz-score-lbl";
    lbl.textContent = "correct answers";
    var m = document.createElement("div");
    m.className = "kms-quiz-score-msg";
    m.textContent = msg;
    r.appendChild(ring); r.appendChild(num); r.appendChild(lbl); r.appendChild(m);
    bodyEl.appendChild(r);
    submitAttempt(r);
    if (reduce) { ring.style.setProperty("--pct", pct); }
    else { ring.style.setProperty("--pct", 0); requestAnimationFrame(function () {
      ring.style.transition = "none";
      var start = null;
      function step(ts) { if (!start) start = ts; var t = Math.min((ts - start) / 600, 1);
        ring.style.setProperty("--pct", Math.round(pct * t)); if (t < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }); }
    nextBtn.textContent = "Close";
    nextBtn.disabled = false;
    setBar();
  }

  function submitAttempt(container) {
    if (submitted || !data.post_id) return;
    submitted = true;
    var ans = {};
    for (var i = 0; i < picks.length; i++) ans[i] = picks[i];
    fetch("/quiz-attempt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: data.post_id, answers: ans })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok && d.first_attempt) {
        var note = document.createElement("div");
        note.className = "kms-quiz-recorded";
        note.textContent = "✓ Your result has been recorded.";
        container.appendChild(note);
      }
      if (d && d.ok && d.passed === false) {
        var hint = document.createElement("div");
        hint.className = "kms-quiz-recorded";
        hint.textContent = "Score 80% or more to earn points — you can retake the quiz.";
        container.appendChild(hint);
      }
    }).catch(function () {});
  }

  function openModal() {
    lastFocus = document.activeElement;
    reset();
    renderQuestion();
    modal.hidden = false;
    document.body.classList.add("kms-quiz-lock");
    nextBtn.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("kms-quiz-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  openBtn.addEventListener("click", openModal);
  nextBtn.addEventListener("click", function () {
    if (finished) { closeModal(); return; }
    if (!answered[idx]) return;
    if (idx < questions.length - 1) { idx++; renderQuestion(); }
    else { showResults(); }
  });
  modal.querySelectorAll("[data-quiz-close]").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();
