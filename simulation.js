"use strict";
// ── Constants ──────────────────────────────────────────────────────────
const ISR_ENTRY = 100, ISR_EXIT = 100, ISR_BODY = 50, DMA_IRQ = 100;
const C_POLL = () => isDark ? "#FF4C4C" : "#EF4444";
const C_INT = () => isDark ? "#00D4AA" : "#059669";
const C_DMA = () => isDark ? "#B47FFF" : "#7C3AED";
const C_BUSY = "#E74C3C", C_IDLE = "#10B981";
const SPEED_MS = [0, 2, 6, 14, 28, 55];

// ── Theme ──────────────────────────────────────────────────────────────
let isDark = false;
const html = document.documentElement;
function applyTheme(dark) {
    isDark = dark; html.setAttribute("data-theme", dark ? "dark" : "light");
    document.querySelector("#theme-toggle .theme-icon") ||
        (document.getElementById("theme-toggle").textContent = dark ? "☀️" : "🌙");
    document.getElementById("theme-toggle").textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("io-theme", dark ? "dark" : "light");
    if (chartCPU) rebuildAllCharts();
}
document.getElementById("theme-toggle").addEventListener("click", () => applyTheme(!isDark));
if (localStorage.getItem("io-theme") === "dark") applyTheme(true);

// ── Toast ──────────────────────────────────────────────────────────────
function toast(msg, dur = 3000) {
    const d = document.createElement("div"); d.className = "toast"; d.textContent = msg;
    document.getElementById("toast-container").appendChild(d);
    setTimeout(() => d.remove(), dur);
}

// ── Confetti ───────────────────────────────────────────────────────────
function launchConfetti() {
    const cv = document.getElementById("confetti-canvas");
    cv.style.display = "block"; cv.width = innerWidth; cv.height = innerHeight;
    const ctx = cv.getContext("2d");
    const parts = Array.from({ length: 120 }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * -200,
        vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 2,
        r: Math.random() * 8 + 4, c: ["#3B82F6", "#059669", "#7C3AED", "#F59E0B", "#EF4444"][Math.random() * 5 | 0],
        a: Math.random() * Math.PI * 2
    }));
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        parts.forEach(p => {
            ctx.save(); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frame / 120);
            ctx.translate(p.x, p.y); ctx.rotate(p.a + frame * 0.05);
            ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); ctx.restore();
            p.x += p.vx; p.y += p.vy; p.vy += 0.06;
        });
        if (++frame < 150) requestAnimationFrame(draw);
        else { ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = "none"; }
    }
    draw();
}

// ── Particles hero canvas ──────────────────────────────────────────────
(function initParticles() {
    const cv = document.getElementById("particles-canvas");
    if (!cv) return;
    function resize() { cv.width = cv.parentElement.offsetWidth; cv.height = cv.parentElement.offsetHeight; }
    resize(); window.addEventListener("resize", resize);
    const ctx = cv.getContext("2d");
    const pts = Array.from({ length: 40 }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 1
    }));
    function frame() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        pts.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > cv.width) p.vx *= -1;
            if (p.y < 0 || p.y > cv.height) p.vy *= -1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? "rgba(79,142,247,0.25)" : "rgba(59,130,246,0.18)"; ctx.fill();
        });
        requestAnimationFrame(frame);
    }
    frame();
})();

// ── Event Log ─────────────────────────────────────────────────────────
let logStart = null;
function logEvent(tech, msg) {
    const el = document.getElementById("event-log");
    const empty = el.querySelector(".log-empty"); if (empty) empty.remove();
    if (!logStart) logStart = Date.now();
    const t = ((Date.now() - logStart) / 1000).toFixed(2) + "s";
    const row = document.createElement("div"); row.className = "log-entry";
    row.innerHTML = `<span class="log-time">[${t}]</span><span class="log-tech-${tech.toLowerCase()}">${tech.padEnd(10)}</span><span class="log-msg">${msg}</span>`;
    el.appendChild(row); el.scrollTop = el.scrollHeight;
}
document.getElementById("btn-clear-log").addEventListener("click", () => {
    document.getElementById("event-log").innerHTML = '<div class="log-empty">Log cleared.</div>';
    logStart = null;
});
document.getElementById("btn-copy-log").addEventListener("click", () => {
    const text = [...document.getElementById("event-log").querySelectorAll(".log-entry")]
        .map(r => r.textContent).join("\n");
    navigator.clipboard.writeText(text).then(() => toast("📋 Log copied!"));
});

// ── Oscilloscope ───────────────────────────────────────────────────────
const OSC = { poll: [], int: [], dma: [] };
function oscPush(tech, busy) {
    const arr = OSC[tech]; arr.push(busy ? 1 : 0);
    if (arr.length > 200) arr.shift();
    drawOsc();
}
function drawOsc() {
    const cv = document.getElementById("osc-canvas"); if (!cv) return;
    cv.width = cv.offsetWidth || 800; cv.height = 120;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = isDark ? "#1E2130" : "#F8FAFC"; ctx.fillRect(0, 0, cv.width, cv.height);
    const tracks = [{ data: OSC.poll, c: C_POLL(), y: 20 },
    { data: OSC.int, c: C_INT(), y: 55 },
    { data: OSC.dma, c: C_DMA(), y: 90 }];
    tracks.forEach(({ data, c, y }) => {
        if (!data.length) return;
        ctx.strokeStyle = c; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const step = cv.width / 200;
        data.forEach((v, i) => {
            const px = i * step, py = y - (v * 22);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.stroke();
        // label
        ctx.fillStyle = c; ctx.font = "10px Inter";
        ctx.fillText(["Polling", "Interrupt", "DMA"][tracks.indexOf(tracks.find(t => t.y === y))], 4, y - 26);
    });
}

// ── Memory Grid ───────────────────────────────────────────────────────
const MEM_GRID = { poll: new Float32Array(256), int: new Float32Array(256), dma: new Float32Array(256) };
function updateMemGrid(key, frac) {
    const g = MEM_GRID[key]; const filled = Math.round(frac * 256);
    for (let i = 0; i < 256; i++) g[i] = i < filled ? 1 : 0;
    drawMemGrid(key);
}
function drawMemGrid(key) {
    const id = { poll: "mem-poll", int: "mem-int", dma: "mem-dma" }[key];
    const cv = document.getElementById(id); if (!cv) return;
    const ctx = cv.getContext("2d"); const g = MEM_GRID[key];
    const cols = 16, rows = 16, cw = cv.width / cols, ch = cv.height / rows;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const filled = isDark ? { poll: "#FF4C4C", int: "#00D4AA", dma: "#B47FFF" } : { poll: "#EF4444", int: "#059669", dma: "#7C3AED" };
    const empty = isDark ? "#2A2E3F" : "#E2E8F0";
    for (let i = 0; i < 256; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        ctx.fillStyle = g[i] ? filled[key] : empty;
        ctx.fillRect(col * cw + 1, row * ch + 1, cw - 2, ch - 2);
    }
}

// ── Arch Canvas Drawing ───────────────────────────────────────────────
function drawArch(id, tech, cpuBusy, dmaActive, progress) {
    const cv = document.getElementById(id); if (!cv) return;
    const ctx = cv.getContext("2d"); const W = cv.width, H = cv.height;
    ctx.fillStyle = isDark ? "#1E2130" : "#F8FAFC"; ctx.fillRect(0, 0, W, H);
    const cpuC = cpuBusy ? (isDark ? C_BUSY : "#EF4444") : (isDark ? "#2ECC71" : "#10B981");
    const memC = isDark ? "#3498DB" : "#3B82F6", diskC = isDark ? "#E67E22" : "#F59E0B";
    const dmaC2 = dmaActive ? (isDark ? "#9B59B6" : "#7C3AED") : (isDark ? "#444" : "#CBD5E1");
    const lc = isDark ? "rgba(255,255,255,.15)" : "rgba(100,116,139,.25)";
    function box(x, y, w, h, lbl, fill, glow) {
        ctx.save(); if (glow) { ctx.shadowColor = fill; ctx.shadowBlur = 16; }
        ctx.fillStyle = fill; ctx.strokeStyle = glow ? fill : lc; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px Inter"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        lbl.split("\n").forEach((l, i, a) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (a.length - 1) / 2) * 13));
    }
    function ln(x1, y1, x2, y2, c, dash = []) {
        ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    }
    const CX = 20, CY = 55, CW = 90, CH = 65, MX = 260, MY = 20, MW = 105, MH = 52, DKX = 260, DKY = 115, DKW = 105, DKH = 52;
    const DMAX = 165, DMAY = 115, DMAW = 75, DMAH = 52;
    box(CX, CY, CW, CH, "CPU", cpuC, true);
    box(MX, MY, MW, MH, "Main\nMemory", memC, false);
    box(DKX, DKY, DKW, DKH, "Disk\nCtrl", diskC, false);
    if (tech === "dma") {
        box(DMAX, DMAY, DMAW, DMAH, "DMA\nCtrl", dmaC2, dmaActive);
        ln(CX + CW, CY + CH * .8, DMAX, DMAY + DMAH * .4, "#EC4899", [5, 3]);
        ln(DMAX + DMAW, DMAY + DMAH / 2, DKX, DKY + DKH / 2, dmaC2);
        ln(DMAX + DMAW / 2, DMAY, MX + MW * .4, MY + MH, dmaC2);
    } else {
        ln(CX + CW, CY + CH * .7, DKX, DKY + DKH * .4, lc, [5, 4]);
        ln(CX + CW, CY + CH * .3, MX, MY + MH * .6, memC);
    }
    if (progress > 0) {
        const fw = (MW - 8) * Math.min(progress, 1);
        ctx.fillStyle = "rgba(255,255,255,.4)";
        ctx.beginPath(); ctx.roundRect(MX + 4, MY + MH - 14, fw, 10, 4); ctx.fill();
    }
    ctx.fillStyle = cpuBusy ? C_BUSY : C_IDLE; ctx.font = "bold 9px Inter"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(cpuBusy ? "● BUSY" : "● IDLE", CX + 2, CY + CH + 6);
}
// Packet
function pkt(id, x1, y1, x2, y2, c) {
    const cv = document.getElementById(id); if (!cv) return;
    const ctx = cv.getContext("2d"); const steps = 10, dt = 22;
    const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps; let i = 0, px = x1, py = y1;
    const tid = setInterval(() => {
        ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        px += dx; py += dy; if (++i >= steps) clearInterval(tid);
    }, dt);
}

// ── Charts ────────────────────────────────────────────────────────────
let chartCPU, chartTP, chartProg, chartBE, chartGantt, chartPie, chartRadar, chartFinal;
let storedResults = null, ganttData = { poll: [], int: [], dma: [] };

function cd() {
    const g = isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)";
    const t = isDark ? "#788090" : "#718096";
    return {
        responsive: true, animation: { duration: 0 },
        plugins: { legend: { labels: { color: t, font: { size: 11 }, boxWidth: 14 } } },
        scales: {
            x: { ticks: { color: t, font: { size: 9 } }, grid: { color: g } },
            y: { ticks: { color: t, font: { size: 9 } }, grid: { color: g } }
        }
    };
}
function mkLine(id, yLbl, yMin, yMax) {
    const ctx = document.getElementById(id).getContext("2d");
    return new Chart(ctx, {
        type: "line", data: {
            labels: [], datasets: [
                { label: "Polling", data: [], borderColor: C_POLL(), backgroundColor: "transparent", borderWidth: 2, pointRadius: 0 },
                { label: "Interrupt", data: [], borderColor: C_INT(), backgroundColor: "transparent", borderWidth: 2, pointRadius: 0 },
                { label: "DMA", data: [], borderColor: C_DMA(), backgroundColor: "transparent", borderWidth: 2, pointRadius: 0 },
            ]
        }, options: {
            ...cd(), scales: {
                ...cd().scales,
                y: {
                    ...cd().scales.y, ...(yMin != null ? { min: yMin } : {}), ...(yMax != null ? { max: yMax } : {}),
                    title: { display: !!yLbl, text: yLbl, color: "#718096", font: { size: 9 } }
                }
            }
        }
    });
}
function initCharts() {
    [chartCPU, chartTP, chartProg, chartBE, chartGantt, chartPie, chartRadar, chartFinal]
        .forEach(c => c && c.destroy());
    chartCPU = mkLine("chart-cpu", "CPU %", 0, 105);
    chartTP = mkLine("chart-tp", "MB/s", 0);
    chartProg = mkLine("chart-prog", "Blocks", 0);
    // Break-even
    chartBE = new Chart(document.getElementById("chart-be").getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [] }, options: {
            ...cd(), scales: {
                ...cd().scales,
                y: { ...cd().scales.y, title: { display: true, text: "Overhead cycles", color: "#718096", font: { size: 9 } } },
                x: { ...cd().scales.x, title: { display: true, text: "N blocks", color: "#718096", font: { size: 9 } } }
            }
        }
    });
    // Gantt (horizontal bar)
    chartGantt = new Chart(document.getElementById("chart-gantt").getContext("2d"), {
        type: "bar",
        data: { labels: ["Polling", "Interrupt", "DMA"], datasets: [] },
        options: {
            ...cd(), indexAxis: "y",
            plugins: { ...cd().plugins, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw?.toFixed(2)}s` } } },
            scales: {
                x: { ...cd().scales.x, title: { display: true, text: "Time (s)", color: "#718096", font: { size: 9 } } },
                y: { ...cd().scales.y }
            }
        }
    });
    // Pie
    chartPie = new Chart(document.getElementById("chart-pie").getContext("2d"), {
        type: "doughnut",
        data: {
            labels: ["Polling Overhead", "Interrupt Overhead", "DMA Overhead"],
            datasets: [{ data: [0, 0, 0], backgroundColor: [C_POLL() + "CC", C_INT() + "CC", C_DMA() + "CC"], borderWidth: 2 }]
        },
        options: {
            responsive: true, animation: { duration: 0 },
            plugins: { legend: { labels: { color: isDark ? "#788090" : "#718096", font: { size: 11 } } } }
        }
    });
}
function rebuildAllCharts() {
    initCharts();
    renderBE(storedResults ? storedResults._sim.numBlocks : 512, 250, 600);
    if (storedResults) showResults(storedResults._results, storedResults._sim);
}
function push(chart, idx, y) {
    const ds = chart.data.datasets[idx]; ds.data.push(y);
    while (chart.data.labels.length < ds.data.length) chart.data.labels.push(chart.data.labels.length);
}
function refresh() { chartCPU.update("none"); chartTP.update("none"); chartProg.update("none"); }

// BE chart
function renderBE(N, isrPer, dmaOH) {
    const max = Math.max(N * 1.6, 200), step = Math.max(1, Math.floor(max / 80));
    const xs = [], intA = [], dmaA = [];
    for (let n = 0; n <= max; n += step) { xs.push(n); intA.push(n * isrPer); dmaA.push(dmaOH); }
    chartBE.data.labels = xs;
    chartBE.data.datasets = [
        { label: `Interrupt OH (×${isrPer})`, data: intA, borderColor: C_INT(), backgroundColor: "transparent", borderWidth: 2, pointRadius: 0 },
        { label: `DMA OH (${dmaOH} fixed)`, data: dmaA, borderColor: C_DMA(), backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, borderDash: [7, 4] },
    ];
    chartBE.update();
}

// Gantt update
function updateGantt(tech, busyTime, idleTime) {
    const idx = { poll: 0, int: 1, dma: 2 }[tech];
    const busyC = [C_POLL() + "AA", C_INT() + "AA", C_DMA() + "AA"][idx];
    chartGantt.data.datasets = [
        {
            label: "CPU Busy", data: [
                OSC.poll.filter(v => v).length / Math.max(OSC.poll.length, 1) * busyTime,
                OSC.int.filter(v => v).length / Math.max(OSC.int.length, 1) * busyTime,
                OSC.dma.filter(v => v).length / Math.max(OSC.dma.length, 1) * busyTime
            ], backgroundColor: [C_POLL() + "99", C_INT() + "99", C_DMA() + "99"]
        },
        {
            label: "CPU Idle", data: [
                OSC.poll.filter(v => !v).length / Math.max(OSC.poll.length, 1) * idleTime,
                OSC.int.filter(v => !v).length / Math.max(OSC.int.length, 1) * idleTime,
                OSC.dma.filter(v => !v).length / Math.max(OSC.dma.length, 1) * idleTime
            ], backgroundColor: ["rgba(16,185,129,.4)", "rgba(16,185,129,.4)", "rgba(16,185,129,.4)"]
        }
    ];
    chartGantt.update("none");
}

// ── Simulation Engine ─────────────────────────────────────────────────
class IOSim {
    constructor(cfg) {
        Object.assign(this, cfg);
        this.numBlocks = Math.floor(cfg.size / cfg.block);
        this.running = false; this.stepMode = cfg.stepMode || false;
        this._stepResolve = null; this.results = {};
    }
    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
    _yld() { return this._delay(SPEED_MS[this.speed] || 14); }
    async _waitStep(b) {
        if (!this.stepMode) return;
        document.getElementById("step-cur").textContent = b;
        document.getElementById("step-total").textContent = this.numBlocks;
        await new Promise(r => { this._stepResolve = r; });
    }
    nextStep() { if (this._stepResolve) { this._stepResolve(); this._stepResolve = null; } }
    async run(onUpd) {
        this.running = true;
        logStart = Date.now();
        logEvent("SYS", "Simulation started");
        await this._poll(onUpd);
        await this._intr(onUpd);
        await this._dma(onUpd);
        this.running = false;
        logEvent("SYS", "All 3 techniques complete");
        return this.results;
    }
    async _poll(onUpd) {
        const N = this.numBlocks; let tcy = 0, ocy = 0;
        const ppc = Math.round((this.block / this.dev) * this.cpu / 4);
        logEvent("POLL", "Starting Programmed I/O (busy-wait)");
        for (let b = 0; b < N; b++) {
            if (!this.running) break;
            await this._waitStep(b + 1);
            ocy += ppc * 4; tcy += ppc * 4 + this.block;
            const el = tcy / this.cpu, tp = (b + 1) * this.block / el;
            oscPush("poll", true);
            if (b % Math.max(1, N / 40 | 0) === 0) {
                onUpd("poll", b + 1, N, 100, tp, el, ocy, false);
                await this._yld();
            }
        }
        const t = tcy / this.cpu;
        this.results.polling = {
            name: "Programmed I/O", cpu_util: 100, idle: 0, time: t,
            tp: this.size / t, irqs: 0, overhead: ocy, total_cy: tcy
        };
        onUpd("poll", N, N, 100, this.size / t, t, ocy, true);
        logEvent("POLL", `Done: ${t.toFixed(4)}s, CPU 100%, 0 IRQs`);
    }
    async _intr(onUpd) {
        const N = this.numBlocks; let tcy = 0, ocy = 0, bcy = 0, irqs = 0;
        const dcy = (this.block / this.dev) * this.cpu;
        logEvent("INT", "Starting Interrupt-Driven I/O");
        for (let b = 0; b < N; b++) {
            if (!this.running) break;
            await this._waitStep(b + 1);
            ocy += this.isr; bcy += this.isr + this.block; tcy += dcy + this.isr + this.block;
            irqs++;
            const el = tcy / this.cpu, tp = (b + 1) * this.block / el, cpu = bcy / tcy * 100;
            oscPush("int", false); // mostly idle
            if (b % Math.max(1, N / 40 | 0) === 0) {
                onUpd("int", b + 1, N, cpu, tp, el, ocy, false);
                // flash IRQ dot
                const fl = document.getElementById("irq-flash-int");
                if (fl) { fl.classList.add("active"); setTimeout(() => fl.classList.remove("active"), 200); }
                document.getElementById("irq-int-val").textContent = irqs;
                await this._yld();
            }
        }
        const t = tcy / this.cpu, cpuF = bcy / tcy * 100;
        this.results.interrupt = {
            name: "Interrupt-Driven", cpu_util: cpuF, idle: 100 - cpuF,
            time: t, tp: this.size / t, irqs: N, overhead: ocy, total_cy: tcy
        };
        onUpd("int", N, N, cpuF, this.size / t, t, ocy, true);
        logEvent("INT", `Done: ${t.toFixed(4)}s, CPU ${cpuF.toFixed(1)}%, ${N} IRQs`);
    }
    async _dma(onUpd) {
        const N = this.numBlocks, dcy = (this.size / this.dev) * this.cpu;
        const setup = this.dmaSetup, comp = DMA_IRQ, tcy = setup + dcy + comp, bcy = setup + comp;
        const steps = Math.min(40, N);
        logEvent("DMA", "Starting DMA transfer");
        for (let s = 0; s <= steps; s++) {
            if (!this.running) break;
            await this._waitStep(Math.round(s / steps * N));
            const frac = s / steps, bl = Math.round(frac * N);
            const el = (setup + frac * dcy) / this.cpu, tp = bl > 0 ? bl * this.block / el : 0, cpu = bcy / tcy * 100;
            oscPush("dma", s === 0 || s === steps); // busy only at start/end
            onUpd("dma", bl, N, cpu, tp, el, setup + comp, s === steps);
            await this._yld();
        }
        document.getElementById("irq-dma-val").textContent = "1";
        const t = tcy / this.cpu, cpuF = bcy / tcy * 100;
        this.results.dma = {
            name: "DMA", cpu_util: cpuF, idle: 100 - cpuF,
            time: t, tp: this.size / t, irqs: 1, overhead: setup + comp, total_cy: tcy
        };
        logEvent("DMA", `Done: ${t.toFixed(4)}s, CPU ${cpuF.toFixed(2)}%, 1 IRQ`);
    }
}

// ── Show Results ──────────────────────────────────────────────────────
function showResults(res, sim) {
    storedResults = { _results: res, _sim: sim };
    document.getElementById("results").style.display = "block";
    const r = [res.polling, res.interrupt, res.dma];

    // Score cards
    const grades = [{ t: "Polling", g: "D", c: "#EF4444", d: "100% CPU wasted" },
    { t: "Interrupt", g: "B+", c: "#3B82F6", d: "CPU freed between blocks" },
    { t: "DMA", g: "A+", c: "#059669", d: "CPU ~0% during transfer" }];
    document.getElementById("score-cards").innerHTML =
        grades.map(({ t, g, c, d }) => `<div class="score-card" data-tech="${t}">
      <div class="score-name">${t}</div>
      <div class="score-grade" style="color:${c}">${g}</div>
      <div class="score-desc">${d}</div></div>`).join("");

    // Stats row
    const speedup = v => (r[0].time / v).toFixed(1) + "×";
    document.getElementById("stats-row").innerHTML = `
    <div class="stats-card"><div class="sname">Best Throughput</div><div class="sval">${(r[2].tp / 1e6).toFixed(1)} MB/s</div><div class="sdesc">DMA wins</div></div>
    <div class="stats-card"><div class="sname">CPU Freed (DMA)</div><div class="sval">${(r[0].cpu_util - r[2].cpu_util).toFixed(0)}%</div><div class="sdesc">vs Polling</div></div>
    <div class="stats-card"><div class="sname">IRQ Reduction</div><div class="sval">${r[1].irqs - 1}×</div><div class="sdesc">DMA vs Interrupt</div></div>
    <div class="stats-card"><div class="sname">Overhead Saving</div><div class="sval">${(r[1].overhead / r[2].overhead).toFixed(0)}×</div><div class="sdesc">DMA vs Interrupt</div></div>`;

    // Table
    const fmt = (v, u = "", d = 2) => isFinite(v) ? v.toFixed(d) + u : "--";
    const rows = [
        ["Transfer Time", r.map(x => fmt(x.time, "s"))],
        ["Throughput", r.map(x => fmt(x.tp / 1e6, " MB/s"))],
        ["CPU Utilization", r.map(x => fmt(x.cpu_util, " %", 1))],
        ["CPU Idle", r.map(x => fmt(x.idle, " %", 1))],
        ["Interrupts", r.map(x => x.irqs.toLocaleString())],
        ["Overhead Cycles", r.map(x => Math.round(x.overhead).toLocaleString())],
        ["Total Cycles", r.map(x => Math.round(x.total_cy).toLocaleString())],
        ["vs Polling Speed", r.map((x, i) => i === 0 ? "baseline" : speedup(x.time))],
    ];
    document.getElementById("results-body").innerHTML = rows.map(([l, v]) => `<tr>
    <td>${l}</td><td class="poll-h">${v[0]}</td><td class="int-h">${v[1]}</td><td class="dma-h">${v[2]}</td></tr>`).join("");

    // Findings
    document.getElementById("key-findings").innerHTML = `
    <div class="finding-card"><strong>⚡ Interrupt vs Polling</strong><span>CPU freed ${(r[0].cpu_util - r[1].cpu_util).toFixed(1)}%. ${r[1].irqs.toLocaleString()} ISR calls.</span></div>
    <div class="finding-card"><strong>🚀 DMA vs Polling</strong><span>CPU drops to ${r[2].cpu_util.toFixed(2)}% — ${(r[0].cpu_util / Math.max(r[2].cpu_util, 0.01)).toFixed(0)}× freed.</span></div>
    <div class="finding-card"><strong>📉 Overhead</strong><span>DMA: ${Math.round(r[2].overhead).toLocaleString()} cy vs Interrupt: ${Math.round(r[1].overhead).toLocaleString()} cy.</span></div>
    <div class="finding-card"><strong>⚖ Break-even</strong><span>DMA wins above ${Math.ceil(r[2].overhead / sim.isr)} blocks (${(Math.ceil(r[2].overhead / sim.isr) * sim.block / 1024).toFixed(1)} KB).</span></div>`;

    // Min/Max/Avg Panel
    const nBreak = Math.ceil(r[2].overhead / sim.isr);
    document.getElementById("minmax-panel").innerHTML = `
    <h4>📐 Cycle-Level Statistics</h4>
    <div class="minmax-grid">
      ${["poll", "int", "dma"].map((k, i) => `<div class="mm-card mm-${k}">
        <div class="mm-tech">${["Polling", "Interrupt", "DMA"][i]}</div>
        <div class="mm-row"><span>Total time</span><span>${r[["polling", "interrupt", "dma"][i]].time.toFixed(4)}s</span></div>
        <div class="mm-row"><span>Overhead/block</span><span>${i === 0 ? (sim.block / sim.dev * sim.cpu / 4 * 4).toFixed(0) :
            i === 1 ? sim.isr.toString() :
                Math.round(r.dma.overhead / sim.numBlocks)
        } cy</span></div>
        <div class="mm-row"><span>CPU Idle</span><span>${r[["polling", "interrupt", "dma"][i]].idle.toFixed(1)}%</span></div>
        <div class="mm-row"><span>Throughput</span><span>${(r[["polling", "interrupt", "dma"][i]].tp / 1e6).toFixed(2)} MB/s</span></div>
      </div>`).join("")}
    </div>`;

    // Break-even box
    const isrPer = sim.isr, dmaOH = sim.dmaSetup + DMA_IRQ;
    const dBreak = nBreak * sim.block;
    document.getElementById("breakeven-box").innerHTML = `
    <h4>⚖ Break-Even Analysis: DMA vs Interrupt I/O</h4>
    ISR overhead/block = ${ISR_ENTRY}+${ISR_BODY}+${ISR_EXIT} = ${isrPer} cycles<br/>
    DMA total overhead = ${sim.dmaSetup}+${DMA_IRQ} = ${dmaOH} cycles [one-time]<br/><br/>
    N_break = ⌈${dmaOH}/${isrPer}⌉ = <strong>${nBreak} blocks</strong><br/>
    D_break = ${nBreak}×${sim.block} = <strong>${dBreak.toLocaleString()} bytes (${(dBreak / 1024).toFixed(2)} KB)</strong><br/><br/>
    This scenario: ${(sim.size / 1024).toFixed(0)} KB → DMA ${(sim.size > dBreak ? "✓ wins" : "✗ not yet optimal")}`;

    // Radar
    if (chartRadar) chartRadar.destroy();
    const tick = isDark ? "#788090" : "#718096";
    chartRadar = new Chart(document.getElementById("chart-radar").getContext("2d"), {
        type: "radar",
        data: {
            labels: ["CPU Eff", "Throughput", "Low OH", "Low IRQs", "Scalability"], datasets: [
                { label: "Polling", data: [0, 60, 50, 100, 20], borderColor: C_POLL(), backgroundColor: C_POLL() + "33", borderWidth: 2 },
                { label: "Interrupt", data: [85, 75, 70, 30, 70], borderColor: C_INT(), backgroundColor: C_INT() + "33", borderWidth: 2 },
                { label: "DMA", data: [99, 90, 99, 99, 99], borderColor: C_DMA(), backgroundColor: C_DMA() + "33", borderWidth: 2 },
            ]
        }, options: {
            responsive: true, scales: {
                r: {
                    min: 0, max: 100,
                    ticks: { color: tick, font: { size: 8 } }, grid: { color: tick + "33" }, pointLabels: { color: tick, font: { size: 10 } }
                }
            },
            plugins: { legend: { labels: { color: tick, font: { size: 11 } } } }
        }
    });

    // Final bar
    if (chartFinal) chartFinal.destroy();
    chartFinal = new Chart(document.getElementById("chart-final").getContext("2d"), {
        type: "bar",
        data: {
            labels: ["CPU%", "MB/s", "Time(s)", "IRQs", "OH MCy"], datasets: [
                { label: "Polling", backgroundColor: C_POLL() + "BB", data: [r[0].cpu_util, r[0].tp / 1e6, r[0].time, r[0].irqs, r[0].overhead / 1e6] },
                { label: "Interrupt", backgroundColor: C_INT() + "BB", data: [r[1].cpu_util, r[1].tp / 1e6, r[1].time, r[1].irqs, r[1].overhead / 1e6] },
                { label: "DMA", backgroundColor: C_DMA() + "BB", data: [r[2].cpu_util, r[2].tp / 1e6, r[2].time, r[2].irqs, r[2].overhead / 1e6] },
            ]
        }, options: cd()
    });

    // Pie - overhead breakdown
    chartPie.data.datasets[0].data = [r[0].overhead / 1e6, r[1].overhead / 1e6, r[2].overhead / 1e6];
    chartPie.data.datasets[0].backgroundColor = [C_POLL() + "CC", C_INT() + "CC", C_DMA() + "CC"];
    chartPie.update();

    // Gantt
    const maxT = Math.max(r[0].time, r[1].time, r[2].time);
    chartGantt.data.datasets = [
        {
            label: "CPU Busy", data: [r[0].time * 1, r[1].time * r[1].cpu_util / 100, r[2].time * r[2].cpu_util / 100],
            backgroundColor: [C_POLL() + "99", C_INT() + "99", C_DMA() + "99"], stack: "s"
        },
        {
            label: "CPU Idle", data: [0, r[1].time * r[1].idle / 100, r[2].time * r[2].idle / 100],
            backgroundColor: ["rgba(16,185,129,.35)", "rgba(16,185,129,.35)", "rgba(16,185,129,.35)"], stack: "s"
        },
    ];
    chartGantt.update();

    renderBE(sim.numBlocks, isrPer, dmaOH);
    document.getElementById("results").scrollIntoView({ behavior: "smooth" });
    triggerReveal();
    toast("✅ Simulation complete — scroll down for results!");
    launchConfetti();
}

// ── CSV / JSON Export ─────────────────────────────────────────────────
function exportCSV() {
    if (!storedResults) { toast("Run the simulation first!"); return; }
    const { _results: r, _sim: s } = storedResults;
    const rows = [
        ["Metric", "Polling", "Interrupt", "DMA"],
        ["Time (s)", r.polling.time.toFixed(4), r.interrupt.time.toFixed(4), r.dma.time.toFixed(4)],
        ["Throughput MB/s", (r.polling.tp / 1e6).toFixed(3), (r.interrupt.tp / 1e6).toFixed(3), (r.dma.tp / 1e6).toFixed(3)],
        ["CPU %", r.polling.cpu_util.toFixed(2), r.interrupt.cpu_util.toFixed(2), r.dma.cpu_util.toFixed(2)],
        ["CPU Idle %", r.polling.idle.toFixed(2), r.interrupt.idle.toFixed(2), r.dma.idle.toFixed(2)],
        ["IRQs", r.polling.irqs, r.interrupt.irqs, r.dma.irqs],
        ["Overhead cy", Math.round(r.polling.overhead), Math.round(r.interrupt.overhead), Math.round(r.dma.overhead)],
        ["Total cy", Math.round(r.polling.total_cy), Math.round(r.interrupt.total_cy), Math.round(r.dma.total_cy)],
        ["", "Config", "", ""],
        ["File size", s.size, "", ""], ["Block size", s.block, "", ""],
        ["CPU GHz", (s.cpu / 1e9).toFixed(1), "", ""], ["Device MB/s", (s.dev / 1e6).toFixed(0), "", ""],
        ["ISR cycles", s.isr, "", ""], ["DMA Setup", s.dmaSetup, "", ""],
    ];
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.map(r => r.join(",")).join("\n"));
    a.download = "io_results.csv"; a.click(); toast("📄 CSV exported!");
}
function exportJSON() {
    if (!storedResults) { toast("Run the simulation first!"); return; }
    const { _results: r, _sim: s } = storedResults;
    const blob = new Blob([JSON.stringify({ config: s, results: r }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "io_results.json"; a.click(); toast("{ } JSON exported!");
}

// ── Share URL ─────────────────────────────────────────────────────────
function shareURL() {
    const params = new URLSearchParams({
        size: document.getElementById("cfg-size").value,
        block: document.getElementById("cfg-block").value,
        cpu: document.getElementById("cfg-cpu").value,
        dev: document.getElementById("cfg-dev").value,
        isr: document.getElementById("cfg-isr").value,
        dma: document.getElementById("cfg-dma-setup").value,
    });
    const url = location.origin + location.pathname + "?" + params.toString();
    navigator.clipboard.writeText(url).then(() => toast("🔗 URL copied to clipboard!"))
        .catch(() => prompt("Copy this URL:", url));
}
function loadFromURL() {
    const p = new URLSearchParams(location.search);
    if (p.get("size")) document.getElementById("cfg-size").value = p.get("size");
    if (p.get("block")) document.getElementById("cfg-block").value = p.get("block");
    if (p.get("cpu")) document.getElementById("cfg-cpu").value = p.get("cpu");
    if (p.get("dev")) document.getElementById("cfg-dev").value = p.get("dev");
    if (p.get("isr")) document.getElementById("cfg-isr").value = p.get("isr");
    if (p.get("dma")) document.getElementById("cfg-dma-setup").value = p.get("dma");
    if (p.has("size")) toast("⚙ Config loaded from shared URL!");
}

// ── Fullscreen Chart ──────────────────────────────────────────────────
document.querySelectorAll(".fullscreen-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const ov = document.getElementById("fullscreen-overlay");
        ov.classList.add("open");
        const fsCv = document.getElementById("chart-fullscreen");
        const map = { cpu: chartCPU, tp: chartTP, prog: chartProg, be: chartBE, gantt: chartGantt, pie: chartPie };
        const src = map[btn.dataset.chart]; if (!src) return;
        const fc = document.getElementById("chart-fullscreen").getContext("2d");
        // Just note: Chart.js can't easily copy charts. Show a message instead.
        fsCv.getContext("2d").clearRect(0, 0, fsCv.width, fsCv.height);
        fsCv.getContext("2d").font = "20px Inter";
        fsCv.getContext("2d").fillStyle = "#718096";
        fsCv.getContext("2d").textAlign = "center";
        fsCv.getContext("2d").fillText("Use browser zoom (Ctrl+) to enlarge charts", fsCv.width / 2, 100);
        toast("💡 Tip: Ctrl + scroll to zoom, or use Print for full-page charts");
    });
});
document.getElementById("fullscreen-close").addEventListener("click", () =>
    document.getElementById("fullscreen-overlay").classList.remove("open"));

// ── Viva Search Filter ────────────────────────────────────────────────
document.getElementById("viva-filter").addEventListener("input", function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll(".viva-card").forEach(c => {
        c.classList.toggle("hidden", !c.dataset.q.includes(q) && q.length > 0);
    });
});

// ── Keyboard Shortcuts ────────────────────────────────────────────────
document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (k === "r") runSimulation(false);
    else if (k === "s") runSimulation(true);
    else if (k === "escape") { resetSim(); document.getElementById("shortcuts-modal").classList.remove("open"); }
    else if (k === "d") applyTheme(!isDark);
    else if (k === "n") currentSim?.nextStep();
    else if (k === "c") exportCSV();
    else if (k === "?") document.getElementById("shortcuts-modal").classList.add("open");
});
["shortcuts-btn", "btn-help", "footer-shortcuts"].forEach(id => {
    const el = document.getElementById(id); if (el)
        el.addEventListener("click", e => { e.preventDefault(); document.getElementById("shortcuts-modal").classList.add("open"); });
});
document.getElementById("shortcuts-modal").addEventListener("click", e => {
    if (e.target === document.getElementById("shortcuts-modal"))
        e.target.classList.remove("open");
});

// ── UI helpers ────────────────────────────────────────────────────────
const TECH_IDX = { poll: 0, int: 1, dma: 2 };
const BADGE_ID = { poll: "badge-poll", int: "badge-int", dma: "badge-dma" };
const BAR_ID = { poll: "bar-poll", int: "bar-int", dma: "bar-dma" };
const STAT_ID = { poll: "stat-poll", int: "stat-int", dma: "stat-dma" };
const ARCH_ID = { poll: "arch-poll", int: "arch-int", dma: "arch-dma" };
const MEM_ID = { poll: "mem-poll", int: "mem-int", dma: "mem-dma" };

function setBadge(tech, state) {
    const el = document.getElementById(BADGE_ID[tech]); if (!el) return;
    el.textContent = state; el.className = "arch-badge" + (state === "RUNNING" ? " running" : state === "DONE" ? " done" : "");
}

let currentSim = null;

async function runSimulation(stepMode) {
    if (currentSim?.running) return;
    const speed = parseInt(document.getElementById("cfg-speed").value) || 3;
    const cfg = {
        size: +document.getElementById("cfg-size").value,
        block: +document.getElementById("cfg-block").value,
        cpu: +document.getElementById("cfg-cpu").value,
        dev: +document.getElementById("cfg-dev").value,
        isr: +document.getElementById("cfg-isr").value,
        dmaSetup: +document.getElementById("cfg-dma-setup").value,
        speed, stepMode
    };
    document.getElementById("btn-run").disabled = true;
    document.getElementById("btn-run").textContent = "⏳ Running…";
    document.getElementById("btn-step").disabled = true;
    document.getElementById("results").style.display = "none";
    if (stepMode) document.getElementById("step-banner").style.display = "flex";
    initCharts();
    OSC.poll = []; OSC.int = []; OSC.dma = [];
    MEM_GRID.poll.fill(0); MEM_GRID.int.fill(0); MEM_GRID.dma.fill(0);
    ["poll", "int", "dma"].forEach(t => {
        drawArch(ARCH_ID[t], t, false, false, 0);
        drawMemGrid(t); setBadge(t, "QUEUED");
        document.getElementById(BAR_ID[t]).style.width = "0%";
        document.getElementById(STAT_ID[t]).textContent = "CPU: — | Blocks: — | Throughput: —";
    });
    renderBE(Math.floor(cfg.size / cfg.block), cfg.isr, cfg.dmaSetup + DMA_IRQ);
    logEvent("SYS", "Config: " + JSON.stringify({ size: cfg.size, block: cfg.block }));

    currentSim = new IOSim(cfg);
    const N = currentSim.numBlocks;
    const lastPkt = { poll: 0, int: 0, dma: 0 };

    function onUpd(tech, blks, total, cpuUtil, tp, elapsed, oh, done) {
        const frac = blks / Math.max(total, 1), dsIdx = TECH_IDX[tech];
        if (blks % Math.max(1, total / 40 | 0) === 0 || done) {
            push(chartCPU, dsIdx, cpuUtil); push(chartTP, dsIdx, tp / 1e6); push(chartProg, dsIdx, blks);
            refresh();
        }
        document.getElementById(BAR_ID[tech]).style.width = (frac * 100).toFixed(1) + "%";
        setBadge(tech, done ? "DONE" : "RUNNING");
        const irqTxt = tech === "poll" ? "0 IRQs" : tech === "dma" ? "1 IRQ" : `${blks} IRQs`;
        document.getElementById(STAT_ID[tech]).textContent =
            `CPU: ${cpuUtil.toFixed(1)}% | Blks: ${blks.toLocaleString()}/${total.toLocaleString()} | TP: ${(tp / 1e6).toFixed(2)} MB/s | ${irqTxt}`;
        drawArch(ARCH_ID[tech], tech, tech === "poll", tech === "dma" && !done, frac);
        updateMemGrid(tech, frac);
        if (done) updateGantt(tech, elapsed, elapsed);
        if (blks !== lastPkt[tech] && blks % Math.max(1, total / 10 | 0) === 0 && !done) {
            lastPkt[tech] = blks;
            if (tech === "poll") pkt(ARCH_ID[tech], 115, 88, 260, 44, C_POLL());
            if (tech === "int") pkt(ARCH_ID[tech], 260, 141, 115, 88, C_INT());
            if (tech === "dma") pkt(ARCH_ID[tech], 240, 141, 260, 44, C_DMA());
        }
        drawOsc();
    }

    const results = await currentSim.run(onUpd);
    if (!currentSim.running || Object.keys(results).length === 3) showResults(results, currentSim);
    document.getElementById("step-banner").style.display = "none";
    document.getElementById("btn-run").disabled = false;
    document.getElementById("btn-run").textContent = "▶ Run";
    document.getElementById("btn-step").disabled = false;
    ["poll", "int", "dma"].forEach(t => setBadge(t, "DONE"));
}

function resetSim() {
    if (currentSim) { currentSim.running = false; currentSim = null; }
    storedResults = null; OSC.poll = []; OSC.int = []; OSC.dma = [];
    initCharts();
    ["poll", "int", "dma"].forEach(t => {
        drawArch(ARCH_ID[t], t, false, false, 0); drawMemGrid(t);
        setBadge(t, "IDLE"); document.getElementById(BAR_ID[t]).style.width = "0%";
        document.getElementById(STAT_ID[t]).textContent = "CPU: — | Blocks: — | Throughput: —";
    });
    document.getElementById("results").style.display = "none";
    document.getElementById("step-banner").style.display = "none";
    document.getElementById("btn-run").disabled = false;
    document.getElementById("btn-run").textContent = "▶ Run";
    document.getElementById("btn-step").disabled = false;
    drawOsc(); toast("↺ Reset complete");
}

// Speed label
document.getElementById("cfg-speed").addEventListener("input", function () {
    document.getElementById("speed-label") =
        document.getElementById("speed-label").textContent =
        ["", "Fastest", "Fast", "Normal", "Slow", "Slowest"][this.value] || "Normal";
});

// Scrolls
window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", scrollY > 20);
    document.getElementById("back-to-top").classList.toggle("visible", scrollY > 400);
}, { passive: true });
document.getElementById("back-to-top").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

// Scroll reveal
function triggerReveal() {
    document.querySelectorAll(".reveal").forEach(el => {
        if (el.getBoundingClientRect().top < innerHeight - 60) el.classList.add("visible");
    });
}
window.addEventListener("scroll", triggerReveal, { passive: true });

// Event wiring
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-run").addEventListener("click", () => runSimulation(false));
    document.getElementById("btn-step").addEventListener("click", () => runSimulation(true));
    document.getElementById("btn-reset").addEventListener("click", resetSim);
    document.getElementById("btn-export-csv").addEventListener("click", exportCSV);
    document.getElementById("btn-export-csv2")?.addEventListener("click", exportCSV);
    document.getElementById("btn-export-json")?.addEventListener("click", exportJSON);
    document.getElementById("btn-share")?.addEventListener("click", shareURL);
    document.getElementById("btn-share2")?.addEventListener("click", shareURL);
    document.getElementById("share-btn")?.addEventListener("click", shareURL);
    document.getElementById("btn-next-step")?.addEventListener("click", () => currentSim?.nextStep());
    document.getElementById("btn-exit-step")?.addEventListener("click", () => {
        if (currentSim) currentSim.stepMode = false;
        document.getElementById("step-banner").style.display = "none";
    });

    initCharts();
    ["poll", "int", "dma"].forEach(t => { drawArch(ARCH_ID[t], t, false, false, 0); drawMemGrid(t); });
    renderBE(512, 250, 600);
    loadFromURL();
    triggerReveal();
});
