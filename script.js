/* =========================================================
   ReFio — interações (Vanilla JS)
   1. Fio contínuo (progresso de scroll)
   2. Revelações com Intersection Observer
   3. Contador dos dados
   4. Transição de fundo (Manifesto)
   5. Texto que atravessa a tela (O Ciclo)
   6. Tooltip que acompanha o cursor (O Acervo)
   ========================================================= */
(() => {
  "use strict";

  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- 1. FIO CONTÍNUO ---------- */
  const fioLinha = document.querySelector(".fio__linha");

  function atualizarFio() {
    if (!fioLinha) return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const p = total > 0 ? window.scrollY / total : 0;
    // 0.03 de mínimo: o fio nunca começa invisível
    fioLinha.style.strokeDashoffset = String(1 - clamp(p * 0.97 + 0.03));
  }

  /* ---------- 2. REVELAÇÕES ---------- */
  const alvos = document.querySelectorAll(".rv, .fade");

  if ("IntersectionObserver" in window && !reduzido) {
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          if (e.target.matches("[data-contar], [data-contar] *")) iniciarContagem(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    alvos.forEach((el) => io.observe(el));
  } else {
    alvos.forEach((el) => el.classList.add("in"));
  }

  /* ---------- 3. CONTADOR ---------- */
  function iniciarContagem(el) {
    const nums = el.matches("[data-alvo]") ? [el] : el.querySelectorAll("[data-alvo]");
    nums.forEach((n) => {
      if (n.dataset.feito) return;
      n.dataset.feito = "1";
      const fim = parseInt(n.dataset.alvo, 10);
      if (reduzido) { n.textContent = fim; return; }
      const dur = 1800;
      const t0 = performance.now();
      const passo = (t) => {
        const k = clamp((t - t0) / dur);
        const suave = 1 - Math.pow(1 - k, 4);
        n.textContent = Math.round(fim * suave);
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  }

  document.querySelectorAll("[data-alvo]").forEach((n) => {
    // Sem JS o número final já está no HTML; aqui zeramos só para animar.
    if (!reduzido && "IntersectionObserver" in window) n.textContent = "0";
  });

  /* ---------- 4. FUNDO: OFF-WHITE → QUASE PRETO ---------- */
  const gatilhoFundo = document.querySelector("[data-fundo]");
  const claro = [242, 237, 225];
  const escuro = [14, 14, 12];

  function atualizarFundo() {
    if (!gatilhoFundo) return;
    const r = gatilhoFundo.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.95 - r.top) / (vh * 0.85));
    const bg = claro.map((c, i) => Math.round(lerp(c, escuro[i], p)));
    const fg = escuro.map((c, i) => Math.round(lerp(c, claro[i], p)));
    const raiz = document.documentElement.style;
    raiz.setProperty("--bg", `rgb(${bg})`);
    raiz.setProperty("--fg", `rgb(${fg})`);
  }

  /* ---------- 5. TEXTO QUE ATRAVESSA A TELA ---------- */
  const faixas = document.querySelectorAll("[data-atravessa]");

  function atualizarFaixas() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    faixas.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      const p = clamp((vh * 0.9 - r.top) / (vh * 0.9 + r.height * 0.4));
      const sobra = el.scrollWidth - vw + vw * 0.1;
      const dir = parseInt(el.dataset.atravessa, 10) || 1;
      const x = dir > 0 ? -sobra * p : -sobra * (1 - p);
      el.style.transform = `translate3d(${x + vw * 0.04}px,0,0)`;
    });
  }

  /* ---------- 6. TOOLTIP DO ACERVO ---------- */
  const tip = document.getElementById("tip");
  const pecas = document.querySelectorAll("[data-tecnica]");

  if (tip && pecas.length) {
    const corpoTip = tip.querySelector("span");
    let alvoX = 0, alvoY = 0, x = 0, y = 0, ativo = false;

    const posicionar = () => {
      x = lerp(x, alvoX, 0.22);
      y = lerp(y, alvoY, 0.22);
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const px = clamp(x + 22, 8, window.innerWidth - w - 8);
      const py = clamp(y + 22, 8, window.innerHeight - h - 8);
      tip.style.transform = `translate3d(${px}px,${py}px,0)`;
      if (ativo) requestAnimationFrame(posicionar);
    };

    const mostrar = (el, px, py) => {
      corpoTip.textContent = el.dataset.tecnica;
      alvoX = x = px; alvoY = y = py;
      tip.classList.add("on");
      if (!ativo) { ativo = true; requestAnimationFrame(posicionar); }
    };

    const esconder = () => { ativo = false; tip.classList.remove("on"); };

    pecas.forEach((el) => {
      el.addEventListener("mouseenter", (e) => mostrar(el, e.clientX, e.clientY));
      el.addEventListener("mousemove", (e) => { alvoX = e.clientX; alvoY = e.clientY; });
      el.addEventListener("mouseleave", esconder);
      // Acessibilidade: teclado e toque
      el.addEventListener("focus", () => {
        const r = el.getBoundingClientRect();
        mostrar(el, r.left + r.width * 0.3, r.bottom - 10);
      });
      el.addEventListener("blur", esconder);
    });
  }

  /* ---------- LOOP DE SCROLL ---------- */
  let agendado = false;
  function aoRolar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      atualizarFio();
      atualizarFundo();
      if (!reduzido) atualizarFaixas();
      agendado = false;
    });
  }

  window.addEventListener("scroll", aoRolar, { passive: true });
  window.addEventListener("resize", aoRolar);
  window.addEventListener("load", aoRolar);
  aoRolar();
})();
