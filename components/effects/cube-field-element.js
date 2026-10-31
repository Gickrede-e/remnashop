/* <cube-field> — невесомая интерактивная геометрия для hero GickShop.
   Vanilla web component, canvas 2D, без зависимостей.
   Атрибуты:
     accent="#66e08a"                 цвет линий/свечения
     count="14"                       количество кубов
     mode="отталкивание|притяжение"   реакция на курсор
     faces="каркас|грани"             только рёбра или с полупрозрачными гранями
     scale="1"                        масштаб кубов (0.34 — сайдбар, 0.8 — auth)
     dust="54"                        количество частиц пыли
   Поведение: медленный дрейф в невесомости, parallax всей сцены за курсором,
   кубы отталкиваются/притягиваются к курсору, клик по фону — ударная волна.
   Уважает prefers-reduced-motion (статичный кадр), пауза вне вьюпорта.
   Источник: шаблоны Claude Design (templates/<шаблон>/cube-field.js).
   Импортировать только на клиенте — модуль регистрирует customElements. */
(() => {
  // SSR/тесты: без DOM регистрировать нечего (модуль импортируется лениво,
  // но guard делает его безопасным при любом способе загрузки).
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('cube-field')) return;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function hexToRgb(hex) {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 102, g: 224, b: 138 };
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  const VERTS = [];
  for (let i = 0; i < 8; i++) VERTS.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
  const F = 920; // фокусное расстояние проекции

  const makeRng = (seed) => {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
  };

  class CubeField extends HTMLElement {
    static get observedAttributes() { return ['accent', 'count', 'mode', 'faces', 'dust', 'scale']; }

    constructor() {
      super();
      this._cubes = [];
      this._dust = [];
      this._ripples = [];
      this._pointer = { x: -1e4, y: -1e4, inside: false };
      this._yaw = 0; this._pitch = 0; this._yawT = 0; this._pitchT = 0;
      this._cyaw = 1; this._syaw = 0; this._cpit = 1; this._spit = 0;
      this._t = 0; this._last = 0; this._raf = 0;
      this._running = false; this._inView = true;
      this._count = 0; this._attract = false; this._solid = false;
      this._scale = 1; this._dustCount = 54;
      this._rgb = { r: 102, g: 224, b: 138 };
      this._w = 0; this._h = 0;
      this._onMove = this._onMove.bind(this);
      this._onDown = this._onDown.bind(this);
      this._onVis = this._onVis.bind(this);
      this._frame = this._frame.bind(this);
    }

    connectedCallback() {
      if (this._canvas) return;
      this.style.display = 'block';
      if (!this.style.position) this.style.position = 'relative';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this.style.overflow = 'hidden';
      this._canvas = document.createElement('canvas');
      this._canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
      this.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');
      this._rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      this._syncConfig();
      this._buildDust();
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);
      this._resize();
      if (!this._rm) {
        window.addEventListener('pointermove', this._onMove, { passive: true });
        window.addEventListener('pointerdown', this._onDown, { passive: true });
        document.addEventListener('visibilitychange', this._onVis);
        this._io = new IntersectionObserver((es) => {
          this._inView = es[0] ? es[0].isIntersecting : true;
          this._updateRunning();
        });
        this._io.observe(this);
        this._updateRunning();
      }
    }

    disconnectedCallback() {
      this._running = false;
      cancelAnimationFrame(this._raf);
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('pointerdown', this._onDown);
      document.removeEventListener('visibilitychange', this._onVis);
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
    }

    attributeChangedCallback() {
      if (!this._ctx) return;
      this._syncConfig();
      if (!this._running) { this._step(0); this._render(); }
    }

    _syncConfig() {
      this._rgb = hexToRgb(this.getAttribute('accent') || '#66e08a');
      const mode = (this.getAttribute('mode') || '').toLowerCase();
      this._attract = mode.includes('притя') || mode.includes('attract');
      const faces = (this.getAttribute('faces') || '').toLowerCase();
      this._solid = faces.includes('гран') || faces.includes('solid');
      const scale = parseFloat(this.getAttribute('scale')) || 1;
      if (scale !== this._scale) { this._scale = scale; this._count = 0; }
      const dustRaw = parseInt(this.getAttribute('dust'), 10);
      const dustCount = Number.isNaN(dustRaw) ? 54 : clamp(dustRaw, 0, 200);
      if (dustCount !== this._dustCount) { this._dustCount = dustCount; this._buildDust(); }
      const count = clamp(parseInt(this.getAttribute('count'), 10) || 14, 4, 40);
      if (count !== this._count) { this._count = count; this._buildCubes(); }
    }

    _buildCubes() {
      const rng = makeRng(1337);
      const n = this._count;
      const cubes = [];
      for (let i = 0; i < n; i++) {
        const main = i < Math.max(3, Math.round(n * 0.72)); // основной кластер справа
        const nx = main ? 0.52 + rng() * 0.42 : 0.05 + rng() * 0.4;
        const ny = 0.1 + rng() * 0.78;
        const z0 = main ? -240 + rng() * 520 : 140 + rng() * 380;
        const size = (main ? 18 + rng() * 34 : 9 + rng() * 14) * this._scale;
        cubes.push({
          nx, ny, z0, size,
          off: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
          rot: { x: rng() * 6.283, y: rng() * 6.283, z: rng() * 6.283 },
          w: { x: 0, y: 0, z: 0 },
          base: { x: (rng() - 0.5) * 0.3, y: (rng() - 0.5) * 0.34, z: (rng() - 0.5) * 0.22 },
          phase: rng() * 6.283,
          bobAmp: (6 + rng() * 14) * this._scale,
          bobSpeed: 0.35 + rng() * 0.5,
          spinBias: rng() > 0.5 ? 1 : -1,
          excite: 0, sx: 0, sy: 0, s: 1, z2: 0,
          pv: new Array(8)
        });
      }
      // якорный крупный куб в фокусе композиции
      if (cubes[0]) {
        cubes[0].nx = 0.68; cubes[0].ny = 0.42; cubes[0].z0 = -150;
        cubes[0].size = 58 * this._scale; cubes[0].bobAmp = 9 * this._scale;
      }
      for (const c of cubes) { c.w.x = c.base.x; c.w.y = c.base.y; c.w.z = c.base.z; }
      this._cubes = cubes;
    }

    _buildDust() {
      const rng = makeRng(99);
      this._dust = Array.from({ length: this._dustCount }, (_, i) => ({
        nx: rng(), ny: rng(), z: 80 + rng() * 520,
        vx: (rng() - 0.5) * 0.008, vy: (rng() - 0.5) * 0.006,
        r: 0.8 + rng() * 1.3,
        glyph: i % 9 === 0
      }));
    }

    _resize() {
      const w = this.clientWidth || 1, h = this.clientHeight || 1;
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      this._w = w; this._h = h;
      this._canvas.width = Math.round(w * dpr);
      this._canvas.height = Math.round(h * dpr);
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!this._running) { this._step(0); this._render(); }
    }

    _onVis() { this._updateRunning(); }

    _updateRunning() {
      const should = !this._rm && this._inView && !document.hidden && this.isConnected;
      if (should && !this._running) {
        this._running = true;
        this._last = performance.now();
        this._raf = requestAnimationFrame(this._frame);
      } else if (!should && this._running) {
        this._running = false;
        cancelAnimationFrame(this._raf);
      }
    }

    _onMove(e) {
      const r = this.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      this._pointer.x = x; this._pointer.y = y; this._pointer.inside = inside;
      if (inside && r.width > 0) {
        this._yawT = clamp((x / r.width - 0.5) * 0.26, -0.13, 0.13);
        this._pitchT = clamp(-(y / r.height - 0.5) * 0.2, -0.1, 0.1);
      } else {
        this._yawT = 0; this._pitchT = 0;
      }
    }

    _onDown(e) {
      if (e.button && e.button !== 0) return;
      const t = e.target;
      if (t && t.closest && t.closest('a, button, input, select, textarea, [data-no-shock]')) return;
      const r = this.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      this._shock(x, y);
    }

    _shock(x, y) {
      for (const c of this._cubes) {
        const dx = c.sx - x, dy = c.sy - y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const k = Math.exp(-d / 300);
        const ux = dx / d, uy = dy / d;
        c.vel.x += (ux * 1500 * k) / (c.s || 1);
        c.vel.y += (uy * 1500 * k) / (c.s || 1);
        c.w.x += uy * 2.2 * k * c.spinBias;
        c.w.y += -ux * 2.6 * k * c.spinBias;
        c.w.z += 1.3 * k * c.spinBias;
        c.excite = Math.min(1, c.excite + k * 1.2);
      }
      this._ripples.push({ x, y, t: 0 });
      if (this._ripples.length > 6) this._ripples.shift();
    }

    _frame(now) {
      const dt = clamp((now - this._last) / 1000, 0.001, 0.05);
      this._last = now;
      this._t += dt;
      this._step(dt);
      this._render();
      if (this._running) this._raf = requestAnimationFrame(this._frame);
    }

    _step(dt) {
      const w = this._w, h = this._h;
      if (!w || !h) return;
      const cx = w / 2, cy = h / 2;
      this._yaw += (this._yawT - this._yaw) * Math.min(1, dt * 2.2);
      this._pitch += (this._pitchT - this._pitch) * Math.min(1, dt * 2.2);
      const cyaw = this._cyaw = Math.cos(this._yaw);
      const syaw = this._syaw = Math.sin(this._yaw);
      const cpit = this._cpit = Math.cos(this._pitch);
      const spit = this._spit = Math.sin(this._pitch);
      const p = this._pointer;
      const R = 250;

      for (const c of this._cubes) {
        // пружина к «дому» + вязкость: дрейф в невесомости
        c.vel.x += -c.off.x * 2.1 * dt;
        c.vel.y += -c.off.y * 2.1 * dt;
        const drag = Math.exp(-1.35 * dt);
        c.vel.x *= drag; c.vel.y *= drag;
        c.off.x += c.vel.x * dt; c.off.y += c.vel.y * dt;
        c.rot.x += c.w.x * dt; c.rot.y += c.w.y * dt; c.rot.z += c.w.z * dt;
        c.w.x += (c.base.x - c.w.x) * 0.5 * dt;
        c.w.y += (c.base.y - c.w.y) * 0.5 * dt;
        c.w.z += (c.base.z - c.w.z) * 0.5 * dt;

        const bobX = Math.cos(this._t * c.bobSpeed * 0.8 + c.phase * 1.7) * c.bobAmp * 0.6;
        const bobY = Math.sin(this._t * c.bobSpeed + c.phase) * c.bobAmp;
        const wx = (c.nx - 0.5) * w + bobX + c.off.x;
        const wy = (c.ny - 0.5) * h + bobY + c.off.y;
        const wz = c.z0;

        // глобальный parallax сцены
        const x1 = wx * cyaw + wz * syaw;
        const z1 = -wx * syaw + wz * cyaw;
        const y1 = wy * cpit - z1 * spit;
        const z2 = wy * spit + z1 * cpit;
        const s = F / (F + Math.max(z2, -F + 120));
        c.s = s; c.z2 = z2;
        c.sx = cx + x1 * s; c.sy = cy + y1 * s;

        // реакция на курсор
        let exciteT = 0;
        if (p.inside) {
          const dx = c.sx - p.x, dy = c.sy - p.y;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f01 = 1 - d / R;
            const ux = dx / Math.max(d, 14), uy = dy / Math.max(d, 14);
            let sign = this._attract ? -1 : 1;
            if (this._attract && d < 80) sign = 1; // не даём прилипнуть к курсору
            const k = (3400 * f01 * f01 * dt) / s;
            c.vel.x += ux * k * sign;
            c.vel.y += uy * k * sign;
            c.w.x += uy * f01 * dt * 3.2 * c.spinBias;
            c.w.y += -ux * f01 * dt * 3.2 * c.spinBias;
            exciteT = f01;
          }
        }
        c.excite += (exciteT - c.excite) * Math.min(1, dt * (exciteT > c.excite ? 9 : 3));

        // вершины: поворот куба -> мировая позиция -> parallax -> проекция
        const crx = Math.cos(c.rot.x), srx = Math.sin(c.rot.x);
        const cry = Math.cos(c.rot.y), sry = Math.sin(c.rot.y);
        const crz = Math.cos(c.rot.z), srz = Math.sin(c.rot.z);
        for (let i = 0; i < 8; i++) {
          let vx = VERTS[i][0] * c.size, vy = VERTS[i][1] * c.size, vz = VERTS[i][2] * c.size;
          let ty = vy * crx - vz * srx, tz = vy * srx + vz * crx; vy = ty; vz = tz;
          let tx = vx * cry + vz * sry; tz = -vx * sry + vz * cry; vx = tx; vz = tz;
          tx = vx * crz - vy * srz; ty = vx * srz + vy * crz; vx = tx; vy = ty;
          const gx = wx + vx, gy = wy + vy, gz = wz + vz;
          const ax = gx * cyaw + gz * syaw;
          const az1 = -gx * syaw + gz * cyaw;
          const ay = gy * cpit - az1 * spit;
          const az = gy * spit + az1 * cpit;
          const ss = F / (F + Math.max(az, -F + 120));
          c.pv[i] = [cx + ax * ss, cy + ay * ss, az];
        }
      }

      for (const rp of this._ripples) rp.t += dt;
      this._ripples = this._ripples.filter((rp) => rp.t < 0.9);

      for (const d of this._dust) {
        d.nx += d.vx * dt; d.ny += d.vy * dt;
        if (d.nx < -0.05) d.nx += 1.1; else if (d.nx > 1.05) d.nx -= 1.1;
        if (d.ny < -0.05) d.ny += 1.1; else if (d.ny > 1.05) d.ny -= 1.1;
      }
    }

    _render() {
      const ctx = this._ctx, w = this._w, h = this._h;
      if (!ctx || !w || !h) return;
      const { r, g, b } = this._rgb;
      const col = (a) => `rgba(${r},${g},${b},${a})`;
      const ink = (a) => `rgba(235,242,235,${a})`;
      const cx = w / 2, cy = h / 2;
      const cyaw = this._cyaw, syaw = this._syaw, cpit = this._cpit, spit = this._spit;
      ctx.clearRect(0, 0, w, h);

      // пыль/глифы — глубина фона
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const d of this._dust) {
        const wx = (d.nx - 0.5) * w, wy = (d.ny - 0.5) * h, wz = d.z;
        const x1 = wx * cyaw + wz * syaw;
        const z1 = -wx * syaw + wz * cyaw;
        const y1 = wy * cpit - z1 * spit;
        const z2 = wy * spit + z1 * cpit;
        const s = F / (F + z2);
        const px = cx + x1 * s, py = cy + y1 * s;
        const a = clamp(0.02 + (s - 0.6) * 0.16, 0.02, 0.15);
        if (d.glyph) {
          ctx.fillStyle = col(a + 0.05);
          ctx.fillText('+', px, py);
        } else {
          ctx.fillStyle = ink(a);
          ctx.beginPath();
          ctx.arc(px, py, d.r * s, 0, 6.2832);
          ctx.fill();
        }
      }

      // ударные волны от клика
      for (const rp of this._ripples) {
        const pr = 30 + rp.t * 520;
        const a = 0.32 * (1 - rp.t / 0.9);
        ctx.strokeStyle = col(a);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, pr, 0, 6.2832); ctx.stroke();
        ctx.strokeStyle = col(a * 0.5);
        ctx.beginPath(); ctx.arc(rp.x, rp.y, pr * 0.62, 0, 6.2832); ctx.stroke();
      }

      // кубы: дальние -> ближние
      const order = [...this._cubes].sort((A, B) => B.z2 - A.z2);
      for (const c of order) {
        const tN = clamp((c.s - 0.7) / 0.6, 0, 1);
        const ex = c.excite;

        if (this._solid) {
          const faces = FACES
            .map((f) => ({ f, z: (c.pv[f[0]][2] + c.pv[f[1]][2] + c.pv[f[2]][2] + c.pv[f[3]][2]) / 4 }))
            .sort((a2, b2) => b2.z - a2.z);
          for (const { f } of faces) {
            ctx.fillStyle = col(0.03 + 0.045 * tN + 0.05 * ex);
            ctx.beginPath();
            ctx.moveTo(c.pv[f[0]][0], c.pv[f[0]][1]);
            for (let i = 1; i < 4; i++) ctx.lineTo(c.pv[f[i]][0], c.pv[f[i]][1]);
            ctx.closePath();
            ctx.fill();
          }
        }

        ctx.beginPath();
        for (const e of EDGES) {
          ctx.moveTo(c.pv[e[0]][0], c.pv[e[0]][1]);
          ctx.lineTo(c.pv[e[1]][0], c.pv[e[1]][1]);
        }
        ctx.strokeStyle = col(clamp(0.24 + 0.5 * tN + 0.35 * ex, 0.12, 0.95));
        ctx.lineWidth = 0.9 + 0.7 * tN + 0.7 * ex;
        ctx.stroke();
        if (tN > 0.4 || ex > 0.25) { // мягкое свечение ближних/возбуждённых
          ctx.strokeStyle = col(0.05 + 0.09 * ex);
          ctx.lineWidth = 5;
          ctx.stroke();
        }

        if (tN > 0.25) {
          ctx.fillStyle = col(clamp(0.3 + 0.4 * tN + 0.3 * ex, 0, 0.95));
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(c.pv[i][0], c.pv[i][1], 1.1 + 0.9 * tN, 0, 6.2832);
            ctx.fill();
          }
        }
      }
    }
  }

  customElements.define('cube-field', CubeField);
})();
