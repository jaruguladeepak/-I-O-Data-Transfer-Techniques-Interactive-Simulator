# ⚡ I/O Data Transfer Techniques – Interactive Simulator

> **Computer Architecture Project** · Implementation & Evaluation of Programmed I/O, Interrupt-Driven I/O, and DMA

[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue?logo=github)](https://pages.github.com/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

---

## 🚀 Live Demo

```
https://<your-username>.github.io/<your-repo>/github-pages/
```

---

## 📋 Overview

This web application **simulates and compares** three fundamental I/O data transfer techniques on a **1 MB disk read scenario** with cycle-accurate hardware metrics — all running entirely in the browser.

| Technique | CPU During Transfer | Interrupts | Best For |
|---|---|---|---|
| 🔄 **Programmed I/O** | 100% busy (polling) | 0 | Tiny transfers |
| ⚡ **Interrupt-Driven** | ~4% (ISR only) | N per block | Medium data |
| 🚀 **DMA** | ~0% (CPU free) | 1 (completion) | Large data ✓ |

---

## ✨ Features

### 🎮 Interactive Simulation
- **Run / Step / Reset** controls — run all 3 techniques simultaneously or step block-by-block
- **5 animation speed levels** — Fastest to Slowest
- **Configurable parameters** — file size, block size, CPU speed (1–4 GHz), device speed, ISR overhead, DMA setup cycles

### 📊 Live Visualizations (6 Charts)
- **CPU Utilization %** — line chart comparing all 3 techniques in real time
- **Throughput (MB/s)** — effective data rate as transfer progresses
- **Transfer Progress** — block count over time
- **Break-Even Analysis** — crossover point where DMA beats Interrupt I/O
- **Gantt Chart** — CPU busy vs idle timeline per technique
- **Overhead Pie / Doughnut** — overhead cycle breakdown

### 🖥 Architecture Animations
- **Animated hardware diagrams** — CPU, Memory, Disk Controller, DMA Controller drawn on Canvas
- **Memory Grid Heatmap** — 16×16 grid fills block-by-block (red/green/purple per technique)
- **Packet animations** — moving data packets across the bus
- **Oscilloscope Waveform** — real-time CPU activity signal (HIGH=busy, LOW=idle)
- **Live IRQ counter** with flashing dot on each interrupt

### 📈 Results & Analysis
- **Performance grade cards** — D / B+ / A+ for each technique
- **8-metric results table** — transfer time, throughput, CPU%, idle%, IRQs, overhead cycles, total cycles, speedup vs polling
- **Radar chart** — 5-dimension comparison (CPU Efficiency, Throughput, Overhead, IRQs, Scalability)
- **Break-even math box** — formula + calculated N_break and D_break
- **Cycle-level statistics panel** — per-technique overhead/block, throughput, idle %

### 🔧 Productivity Tools
- **⌨ Keyboard shortcuts** — `R` run, `S` step, `Esc` reset, `D` dark/light, `C` export CSV, `?` help
- **🔗 Share URL** — encode config in URL query params, copy link instantly
- **⬇ Export CSV** — download all metrics + config as `io_results.csv`
- **{ } Export JSON** — full results + config as `io_results.json`
- **🖨 Print Report** — clean printable layout (navbar/buttons hidden)
- **📋 Event Log** — timestamped simulation events log with Copy button

### 🎨 UI / UX
- **Light theme (default)** with full **dark mode** toggle (🌙 / ☀️), persisted via `localStorage`
- **Sticky navbar** with smooth-scroll navigation
- **Algorithm Flowcharts section** — visual decision-flow diagrams for all 3 techniques
- **Viva Preparation Guide** — 8 Q&A cards with keyword search filter
- **Scroll reveal animations** — elements animate in as you scroll
- **Floating particle background** in hero section
- **🎉 Confetti** celebration on simulation complete
- **Back-to-top button**
- **Responsive** — works on desktop, tablet, and mobile

---

## 📁 File Structure

```
github-pages/
├── index.html       # Full SPA — hero, theory, flowcharts, simulator, results, viva
├── style.css        # Light/dark theme via CSS custom properties
├── simulation.js    # Simulation engine + all feature logic
└── README.md        # This file
```

**No build step required** — open `index.html` directly or serve via any static file host.

---

## 🚀 Deploy to GitHub Pages

### Option A — Root deployment (simplest)

```bash
# From your project root
git init
git add .
git commit -m "feat: I/O Simulation web app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then on GitHub → **Settings → Pages → Source: `main` branch / `root` folder → Save**

Your URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/github-pages/`

### Option B — Deploy only the `github-pages` folder

```bash
git subtree push --prefix "github-pages" origin gh-pages
```

Then on GitHub → **Settings → Pages → Source: `gh-pages` branch / `root` → Save**

Your URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## 💻 Local Preview

```bash
# Python (fastest)
python -m http.server 8765 --directory github-pages
# → http://localhost:8765

# Node.js
npx serve github-pages
# → http://localhost:3000
```

---

## ⌨ Keyboard Shortcuts

| Key | Action |
|---|---|
| `R` | Run simulation |
| `S` | Step-by-step mode |
| `Esc` | Reset |
| `D` | Toggle dark / light theme |
| `N` | Next block (step mode) |
| `C` | Export CSV |
| `?` | Show this help |

---

## 🔬 Simulation Model

**Scenario:** Read `N` blocks of `B` bytes from disk controller to main memory.

### Programmed I/O
```
overhead_per_block = poll_cycles × 4
CPU_utilization    = 100%   (always busy-waiting)
total_cycles       = N × (poll_overhead + copy_cycles)
```

### Interrupt-Driven I/O
```
overhead_per_block = ISR_entry + ISR_body + ISR_exit  (default 250 cy)
CPU_utilization    = busy_cycles / total_cycles × 100
total_cycles       = N × (device_transfer + ISR_overhead + copy_cycles)
```

### DMA
```
overhead           = DMA_setup + completion_IRQ  (default 600 cy, one-time)
CPU_utilization    ≈ overhead / total_cycles × 100  (~0%)
total_cycles       = DMA_setup + device_transfer_all + completion_IRQ
```

### Break-Even Formula
```
N_break = ⌈ DMA_total_overhead / ISR_per_block ⌉
D_break = N_break × block_size

DMA wins when: data_size > D_break
```

---

## 📚 Theory Summary

- **Programmed I/O** — CPU continuously polls a status register. Simple but wastes 100% of CPU cycles. Suitable only for very small, infrequent transfers.

- **Interrupt-Driven I/O** — CPU starts the transfer and resumes other work. The device fires an interrupt for each block completed; the ISR copies data and returns. ISR overhead scales linearly with block count.

- **DMA** — CPU programs a dedicated DMA controller with source, destination, and byte count. The DMA controller becomes bus master and transfers all data autonomously while the CPU executes freely. One completion interrupt at the end. Best for large, sustained transfers.

---

## 🎓 Dependencies

| Library | Version | Purpose |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.4.0 | Line, bar, radar, doughnut charts |
| [Google Fonts  (Inter + JetBrains Mono)](https://fonts.google.com/) | latest | Typography |
| HTML5 Canvas API | browser built-in | Architecture diagrams, memory grid, oscilloscope, particles |

---

## 📄 License

This project is created for academic purposes as part of a **Computer Architecture** course project.

---

*Built with HTML · CSS · JavaScript · Chart.js · Hosted on GitHub Pages*
