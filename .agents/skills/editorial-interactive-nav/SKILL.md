---
name: editorial-interactive-nav
description: Production-grade blueprint and reusable skill for an Awwwards-winning Editorial Fullscreen Typographic Navigation Menu featuring fluid SVG morphing curves, character-split kinetic hover stagger, magnetic toggle button, luminous cursor follower, and frosted glass depth.
---

# Editorial Interactive Navigation Menu — Production Blueprint

A master blueprint for implementing an **Awwwards-grade, high-fashion typographic navigation menu** with fluid morphing SVG backdrop curves, magnetic physics, and kinetic micro-stagger animations.

---

## 1. Visual Architecture & Key Design Invariants

```
+-----------------------------------------------------------------------------+
|                                                          [ MENU ] (Magnetic)|
|                                                                             |
|  INDEX (Mono 0.72rem)                           07 DESTINATIONS (Mono)      |
|  -------------------------------------------------------------------------  |
|  The Thesis                                                             01  |
|  -------------------------------------------------------------------------  |
|  The Trilemma                       (o) Glowing Cursor Follower         02  |
|  =========================================================================  |
|  Six Pillars                 [Hover Line: #ff4d0a -> Gradient]          03  |
|  -------------------------------------------------------------------------  |
|  What the Server Saw                                                    04  |
|  -------------------------------------------------------------------------  |
|  Egress Guard                                                           05  |
|  -------------------------------------------------------------------------  |
|  Benchmarks                                                             06  |
|  -------------------------------------------------------------------------  |
|  Judge Q&A                                                              07  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Aesthetic & Interaction Pillars
1. **Curtain Drop Morphing SVG**: A fullscreen SVG `<path>` whose bottom edge dynamically recalculates a quadratic bezier curve (`Q 50 ${y + bulge} 0 ${y}`) during GSAP entry and exit, creating an elastic liquid drop effect.
2. **High-Impact Display Typography**: Built with **Syne** (700/800 weight) or similar editorial display font (`clamp(2rem, 3.8vw, 3.8rem)`), combined with JetBrains Mono / monospace section indexes (`01`, `02`, etc.).
3. **Sibling Dimming with Motion Offset**: Hovering any destination dims all other items to `opacity: 0.25; filter: blur(0.4px);` while translating the active title `+14px` rightward with an orange-to-transparent animated underline highlight.
4. **Kinetic Character Micro-Stagger**: Each letter in the menu title is automatically split into individual `<span class="k-char">` elements. On hover, GSAP triggers an upward wave stagger (`y: -5px`, `stagger: 0.015s`).
5. **Magnetic Floating Toggle**: The "MENU" / "CLOSE" trigger button tracks cursor proximity (`hypot < 75px`), gently floating toward the pointer, and performs randomized character flickering during state transitions.
6. **Double-Layer Frosted Glass**: The menu backdrop applies `backdrop-filter: blur(36px) saturate(180%);` with `rgba(9, 10, 15, 0.82)`. Simultaneously, the underlying page (`body.is-menu-open > section`) receives `filter: blur(16px); transform: scale(0.988);` for deep three-dimensional staging.

---

## 2. Dependencies & CDN Setup

Include the following libraries in your document `<head>`:

```html
<!-- Typography: Syne (Display), Montserrat/Inter (Sans), JetBrains Mono (Monospace) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Montserrat:wght@400;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">

<!-- GSAP + ScrollTrigger (Motion & Timelines) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

<!-- Optional: Lenis Smooth Scroll -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js"></script>
```

---

## 3. HTML Markup Specification

Drop this markup into your `<body>`:

```html
<!-- ==================== TOP-RIGHT FIXED MENU TOGGLER ==================== -->
<button class="nav-toggler" id="nav-toggler" aria-label="Toggle Navigation Menu">Menu</button>

<!-- ==================== OBSCURA OVERLAY NAVIGATION MENU ==================== -->
<nav class="menu" id="obscura-menu" aria-label="Main navigation" aria-hidden="true">
  <!-- SVG Curved Morphing Curtain Layer -->
  <svg class="menu-curve-svg" id="menu-curve-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path id="menu-curve-path" d="M 0 0 L 100 0 L 100 0 Q 50 0 0 0 Z" fill="rgba(9, 10, 15, 0.82)"></path>
  </svg>

  <!-- Frosted Glass Dark Backdrop -->
  <div class="menu-bg"></div>

  <!-- Luminous Fluid Cursor Follower -->
  <div class="menu-cursor-follower" id="menu-cursor-follower" aria-hidden="true"></div>

  <!-- Central Centered Content Container -->
  <div class="menu-container">
    <!-- Subheader Bar: Index & Total Count -->
    <div class="menu-sub-bar">
      <span class="menu-sub-label">INDEX</span>
      <span class="menu-sub-label">07 DESTINATIONS</span>
    </div>

    <!-- Main Typographic Navigation List -->
    <div class="menu-items">
      <a class="menu-item" href="#hero">
        <span class="item-title">The Thesis</span>
        <span class="item-index">01</span>
      </a>

      <a class="menu-item" href="#problem">
        <span class="item-title">The Trilemma</span>
        <span class="item-index">02</span>
      </a>

      <a class="menu-item" href="#architecture">
        <span class="item-title">Six Pillars</span>
        <span class="item-index">03</span>
      </a>

      <a class="menu-item" href="#diff-section">
        <span class="item-title">What the Server Saw</span>
        <span class="item-index">04</span>
      </a>

      <a class="menu-item" href="#egress-guard">
        <span class="item-title">Egress Guard</span>
        <span class="item-index">05</span>
      </a>

      <a class="menu-item" href="#benchmarks">
        <span class="item-title">Benchmarks</span>
        <span class="item-index">06</span>
      </a>

      <a class="menu-item" href="#qa">
        <span class="item-title">Judge Q&amp;A</span>
        <span class="item-index">07</span>
      </a>
    </div>
  </div>
</nav>
```

---

## 4. Complete CSS Stylesheet Specification

Add these rules to your stylesheet (e.g., `navigation.css`):

```css
/* ==========================================================================
   EDITORIAL INTERACTIVE NAVIGATION DESIGN SYSTEM
   ========================================================================== */

:root {
  --nav-accent: #FC5000;
  --nav-accent-glow: rgba(252, 80, 0, 0.6);
  --nav-bg: rgba(9, 10, 15, 0.52);
  --nav-svg-fill: rgba(9, 10, 15, 0.40);
  --nav-text-primary: #f5f5f7;
  --nav-text-muted: rgba(255, 255, 255, 0.35);
  --nav-font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
  --nav-font-mono: 'JetBrains Mono', monospace;
  --nav-font-body: 'Montserrat', sans-serif;
}

/* ── 1. MAGNETIC TOGGLE BUTTON ── */
.nav-toggler {
  position: fixed;
  top: clamp(18px, 3vh, 32px);
  right: clamp(18px, 3vw, 36px);
  z-index: 1200;
  text-transform: uppercase;
  font-family: var(--nav-font-body);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.65rem 1.6rem;
  color: #ffffff;
  background: var(--nav-accent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 9999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 0 20px rgba(252, 80, 0, 0.45);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
  user-select: none;
}

.nav-toggler:hover {
  background: #ff6017;
  border-color: rgba(255, 255, 255, 0.65);
  box-shadow: 0 10px 30px rgba(252, 80, 0, 0.65), 0 0 22px rgba(252, 80, 0, 0.5);
  transform: translateY(-2px) scale(1.03);
}

.nav-toggler:active {
  transform: translateY(0px) scale(0.98);
}

/* State when menu is open */
body.is-menu-open .nav-toggler {
  z-index: 1350;
  background: #252427;
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

body.is-menu-open .nav-toggler:hover {
  background: var(--nav-accent);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 24px rgba(252, 80, 0, 0.6);
}

/* ── 2. BACKGROUND PAGE DEPTH BLUR WHEN ACTIVE ── */
body > section,
body > footer,
body > main,
body > header:not(.menu) {
  transition: filter 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

body.is-menu-open > section,
body.is-menu-open > footer,
body.is-menu-open > main,
body.is-menu-open > header:not(.menu) {
  filter: blur(8px);
  transform: scale(0.988);
}

/* ── 3. FULLSCREEN OVERLAY CONTAINER ── */
.menu {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(2.5rem, 5vh, 4.5rem) clamp(1.5rem, 5vw, 5rem) clamp(2rem, 4vh, 3.5rem);
  background: transparent;
  color: var(--nav-text-primary);
  z-index: 1200;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 77, 10, 0.4) transparent;
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu.is-menu-open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
}

/* SVG Curved Morphing Curtain */
.menu-curve-svg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}

.menu-curve-svg path {
  fill: var(--nav-svg-fill);
}

/* Frosted Glass Backdrop Layer */
.menu-bg {
  position: fixed;
  inset: 0;
  background: var(--nav-bg);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  z-index: -2;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.5s ease;
}

/* ── 4. LUMINOUS CURSOR FOLLOWER ── */
.menu-cursor-follower {
  position: fixed;
  top: 0;
  left: 0;
  width: 14px;
  height: 14px;
  background-color: var(--nav-accent);
  box-shadow: 0 0 16px var(--nav-accent-glow);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1250;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  transition: opacity 0.25s ease, width 0.25s ease, height 0.25s ease, background-color 0.2s ease;
  will-change: transform, opacity;
}

.menu.is-menu-open .menu-cursor-follower.is-hovering {
  opacity: 1;
  width: 44px;
  height: 44px;
  background-color: rgba(255, 77, 10, 0.22);
  border: 1.5px solid var(--nav-accent);
  box-shadow: 0 0 28px rgba(255, 77, 10, 0.5);
  transform: translate(-50%, -50%) scale(1);
}

/* ── 5. CENTERED CONTENT CONTAINER ── */
.menu-container {
  width: 100%;
  max-width: 1360px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: auto auto;
  z-index: 1;
}

.menu-sub-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-bottom: clamp(0.4rem, 0.8vh, 0.75rem);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-family: var(--nav-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  color: var(--nav-text-muted);
  font-weight: 600;
  text-transform: uppercase;
}

/* ── 6. BIG TYPOGRAPHIC DESTINATION ITEMS ── */
.menu-items {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0.2rem 0;
}

.menu-item {
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: clamp(0.35rem, 0.8vh, 0.75rem) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
  position: relative;
  cursor: pointer;
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Full-Width Gradient Underline on Hover */
.menu-item::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 1.5px;
  background: linear-gradient(90deg, #ff4d0a 0%, rgba(255, 77, 10, 0.8) 50%, transparent 100%);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 12px rgba(255, 77, 10, 0.6);
  pointer-events: none;
}

.menu-item:hover::after {
  transform: scaleX(1);
}

.item-title {
  font-family: var(--nav-font-display);
  font-weight: 700;
  font-size: clamp(2rem, 3.8vw, 3.8rem);
  letter-spacing: -0.024em;
  line-height: 1.14;
  color: var(--nav-text-primary);
  display: inline-block;
  will-change: transform;
  transition: color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-item:hover .item-title {
  color: #ffffff;
  transform: translateX(14px);
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

.item-index {
  font-family: var(--nav-font-mono);
  font-size: clamp(0.95rem, 1.15vw, 1.2rem);
  font-weight: 500;
  color: var(--nav-text-muted);
  letter-spacing: 0.08em;
  transition: color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-item:hover .item-index {
  color: #ffffff;
  transform: translateX(-4px);
}

/* Sibling Dimming on Menu List Hover */
.menu-items:hover .menu-item {
  opacity: 0.25;
  filter: blur(0.4px);
}

.menu-items .menu-item:hover {
  opacity: 1;
  filter: blur(0);
}

/* ── 7. RESPONSIVE MOBILE ADAPTATION ── */
@media (max-width: 900px) {
  .menu {
    padding: 2rem 1.5rem;
  }

  .item-title {
    font-size: clamp(1.8rem, 5.5vw, 2.6rem);
  }
}
```

---

## 5. Modern JavaScript Engine Implementation

Add this module (e.g., `initEditorialNav.js`) to your project:

```javascript
/**
 * Initializer for Awwwards-grade Editorial Overlay Navigation
 */
export function initEditorialNav({
  lenis = null,
  onNavigate = null,
} = {}) {
  const menu = document.getElementById("obscura-menu");
  const menuBg = menu ? menu.querySelector(".menu-bg") : null;
  const menuSubBar = menu ? menu.querySelector(".menu-sub-bar") : null;
  const menuItems = menu ? menu.querySelectorAll(".menu-item") : [];
  const follower = document.getElementById("menu-cursor-follower");
  const navToggler = document.getElementById("nav-toggler");
  const curvePath = document.getElementById("menu-curve-path");

  if (!menu || !navToggler) return;

  // ── 1. SPLIT CHARACTERS FOR KINETIC MICRO-STAGGER ──
  const itemCharMaps = [];
  menuItems.forEach((item) => {
    const title = item.querySelector(".item-title");
    if (!title) return;

    const text = title.textContent.trim();
    title.innerHTML = "";
    const chars = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const span = document.createElement("span");
      span.className = "k-char";
      span.style.display = "inline-block";
      span.style.willChange = "transform";
      span.textContent = char === " " ? "\u00A0" : char;
      title.appendChild(span);
      chars.push(span);
    }

    itemCharMaps.push({ item, chars });
  });

  // ── 2. FLUID MAGNETIC SPOTLIGHT CURSOR ──
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let posX = mouseX;
  let posY = mouseY;
  let cursorRaf = null;

  const renderCursor = () => {
    posX += (mouseX - posX) * 0.2;
    posY += (mouseY - posY) * 0.2;
    if (follower) {
      follower.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`;
    }
    cursorRaf = requestAnimationFrame(renderCursor);
  };

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // ── 3. HOVER WAVE MOTION ON SPLIT CHARS ──
  itemCharMaps.forEach(({ item, chars }) => {
    item.addEventListener("mouseenter", () => {
      if (follower) follower.classList.add("is-hovering");
      if (typeof gsap !== "undefined") {
        gsap.killTweensOf(chars);
        gsap.to(chars, {
          y: -5,
          color: "#ffffff",
          duration: 0.32,
          stagger: 0.015,
          ease: "power2.out",
          overwrite: true,
        });
      }
    });

    item.addEventListener("mouseleave", () => {
      if (follower) follower.classList.remove("is-hovering");
      if (typeof gsap !== "undefined") {
        gsap.killTweensOf(chars);
        gsap.to(chars, {
          y: 0,
          color: "#f5f5f7",
          duration: 0.28,
          stagger: 0.01,
          ease: "power2.out",
          overwrite: true,
        });
      }
    });
  });

  // ── 4. SVG CURVED MORPHING CURTAIN GSAP TIMELINE ──
  let tl = null;
  const curveProgress = { y: 0, bulge: 0 };

  const updateSvgCurve = () => {
    if (!curvePath) return;
    const y = curveProgress.y;
    const b = curveProgress.bulge;
    curvePath.setAttribute("d", `M 0 0 L 100 0 L 100 ${y} Q 50 ${y + b} 0 ${y} Z`);
  };

  const setupMenuAnimation = () => {
    if (typeof gsap === "undefined") return;

    tl = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.out" },
      onReverseComplete: () => {
        menu.classList.remove("is-menu-open");
        menu.style.pointerEvents = "";
        if (cursorRaf) cancelAnimationFrame(cursorRaf);
        cursorRaf = null;
      },
    });

    // Step A: Morphing SVG Drop
    tl.fromTo(
      curveProgress,
      { y: 0, bulge: 0 },
      {
        y: 100,
        bulge: 38,
        duration: 0.6,
        ease: "power3.in",
        onUpdate: updateSvgCurve,
      },
      0
    ).to(
      curveProgress,
      {
        bulge: 0,
        duration: 0.45,
        ease: "power2.out",
        onUpdate: updateSvgCurve,
      },
      0.52
    );

    // Step B: Backdrop Glass Fade
    tl.to(menuBg, { opacity: 1, duration: 0.5 }, 0.2);

    // Step C: Sub-bar slide down
    if (menuSubBar) {
      tl.fromTo(
        menuSubBar,
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
        0.32
      );
    }

    // Step D: Staggered entrance for big items
    tl.fromTo(
      menuItems,
      { opacity: 0, y: 38 },
      {
        opacity: 1,
        y: 0,
        duration: 0.72,
        stagger: 0.05,
        ease: "power4.out",
      },
      0.36
    );
  };

  // ── 5. MAGNETIC BUTTON PHYSICS ──
  let btnBounds = null;
  const handleNavMagnetic = (e) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (!btnBounds) btnBounds = navToggler.getBoundingClientRect();

    const btnCenterX = btnBounds.left + btnBounds.width / 2;
    const btnCenterY = btnBounds.top + btnBounds.height / 2;
    const dist = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

    if (dist < 75) {
      const pullX = (e.clientX - btnCenterX) * 0.38;
      const pullY = (e.clientY - btnCenterY) * 0.38;
      navToggler.style.transform = `translate3d(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px, 0)`;
    } else if (navToggler.style.transform && navToggler.style.transform !== "none") {
      navToggler.style.transform = "translate3d(0, 0, 0)";
    }
  };

  window.addEventListener("mousemove", handleNavMagnetic);
  window.addEventListener("resize", () => {
    btnBounds = null;
  });

  // ── 6. BUTTON CHARACTER FLICKER ──
  function flickerTextTo(element, text) {
    if (!element) return;
    if (typeof gsap === "undefined") {
      element.textContent = text;
      return;
    }

    element.innerHTML = "";
    const chars = [];
    for (let c of text) {
      const span = document.createElement("span");
      span.textContent = c;
      span.style.display = "inline-block";
      element.appendChild(span);
      chars.push(span);
    }
    gsap.fromTo(
      chars,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.04,
        ease: "power2.inOut",
        overwrite: true,
        stagger: { amount: 0.16, from: "random" },
      }
    );
  }

  // ── 7. TOGGLE STATE MANAGEMENT ──
  let isMenuOpen = false;

  const openMenu = () => {
    if (isMenuOpen) return;
    isMenuOpen = true;
    menu.classList.add("is-menu-open");
    document.body.classList.add("is-menu-open");
    menu.setAttribute("aria-hidden", "false");
    menu.style.pointerEvents = "auto";
    if (lenis) lenis.stop();

    if (!cursorRaf) {
      posX = mouseX;
      posY = mouseY;
      renderCursor();
    }

    if (tl) tl.timeScale(1).play();
    flickerTextTo(navToggler, "Close");
  };

  const closeMenu = (fast = false) => {
    if (!isMenuOpen) return;
    isMenuOpen = false;
    menu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-menu-open");
    if (lenis) lenis.start();

    if (fast || !tl) {
      menu.classList.remove("is-menu-open");
      menu.style.pointerEvents = "none";
      if (tl) tl.pause(0);
      if (cursorRaf) cancelAnimationFrame(cursorRaf);
      cursorRaf = null;
    } else {
      menu.style.pointerEvents = "none";
      tl.timeScale(2.4).reverse();
    }
    flickerTextTo(navToggler, "Menu");
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu(false);
    } else {
      openMenu();
    }
  };

  navToggler.addEventListener("click", toggleMenu);

  // ── 8. LINK CLICK HANDLING & NAVIGATION ──
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const href = item.getAttribute("href");
      if (!href || href.startsWith("http")) return;

      e.preventDefault();
      closeMenu(false);

      setTimeout(() => {
        if (typeof onNavigate === "function") {
          onNavigate(href);
        } else {
          const target = document.querySelector(href);
          if (target) {
            if (lenis) {
              lenis.scrollTo(target, { duration: 1.1, offset: -40 });
            } else {
              target.scrollIntoView({ behavior: "smooth" });
            }
          }
        }
      }, 320);
    });
  });

  // Close on backdrop click
  if (menuBg) {
    menuBg.addEventListener("click", () => {
      if (isMenuOpen) closeMenu(false);
    });
  }

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen) {
      closeMenu(false);
    }
  });

  // Ready Hook
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setupMenuAnimation);
  } else {
    setupMenuAnimation();
  }

  return { openMenu, closeMenu, toggleMenu };
}
```

---

## 6. How to Use in Any Project

### Option A: Standard Vanilla HTML/JS
1. Paste the HTML into `index.html`.
2. Link the CSS in `index.html`.
3. In `main.js`:
   ```javascript
   import { initEditorialNav } from './initEditorialNav.js';

   const lenis = new Lenis();
   initEditorialNav({ lenis });
   ```

### Option B: React / Next.js
1. Place the SVG and container in a component `EditorialMenu.tsx`.
2. Run `initEditorialNav` in a `useEffect()` hook on mount:
   ```tsx
   useEffect(() => {
     const nav = initEditorialNav({
       onNavigate: (href) => router.push(href),
     });
     return () => nav.closeMenu(true);
   }, []);
   ```

---

## 7. Customization Parameters & Tuning Guide

| Parameter | CSS Variable / Selector | Default | Description |
| :--- | :--- | :--- | :--- |
| **Accent Glow** | `--nav-accent` | `#FC5000` | Highlight color for button, glowing cursor, and active item line |
| **Curtain Backdrop** | `--nav-bg` | `rgba(9, 10, 15, 0.82)` | Background color for SVG curtain and frosted blur layer |
| **Display Typography** | `--nav-font-display` | `'Syne', sans-serif` | Editorial display font for big navigation titles |
| **Item Font Scale** | `.item-title` | `clamp(2rem, 3.8vw, 3.8rem)` | Responsive fluid typography formula |
| **Curtain Elasticity** | `bulge: 38` in JS | `38` | Controls the quadratic bezier liquid bulge of the drop curtain |
| **Magnetic Reach** | `dist < 75` in JS | `75px` | Proximity radius within which the Menu button pulls toward the cursor |
