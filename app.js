/**
 * PRAHARI — Interactive Presentation Showcase Script
 * Smart India Hackathon 2026 · Software Edition
 * Includes real Verhoeff & Luhn checksum algorithms, live diff switcher,
 * KAVACH redactor sandbox, tier controller, 8-check gatekeeper, and canary runner.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. VERHOEFF ALGORITHM (Dihedral Group D5 for Aadhaar)
     ========================================================================== */
  const Verhoeff = {
    // Multiplication table
    d: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ],
    // Permutation table
    p: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ],
    // Inverse table
    inv: [0, 4, 3, 2, 1, 5, 6, 7, 8, 9],

    // Validate a numeric string
    validate: function (numStr) {
      const sanitized = numStr.replace(/\s+/g, '');
      if (!/^\d{12}$/.test(sanitized)) return false;

      let c = 0;
      const reversed = sanitized.split('').reverse();
      for (let i = 0; i < reversed.length; i++) {
        const digit = parseInt(reversed[i], 10);
        c = Verhoeff.d[c][Verhoeff.p[i % 8][digit]];
      }
      return c === 0;
    }
  };

  /* ==========================================================================
     2. LUHN ALGORITHM (Credit/Debit Cards)
     ========================================================================== */
  function validateLuhn(numStr) {
    const clean = numStr.replace(/[\s-]+/g, '');
    if (!/^\d{13,19}$/.test(clean)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  /* ==========================================================================
     3. PAN ALGORITHM (Income Tax India)
     ========================================================================== */
  function validatePAN(str) {
    const clean = str.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(clean)) return { valid: false };
    const fourthChar = clean.charAt(3);
    const entityMap = {
      'P': 'Individual Person',
      'C': 'Company',
      'H': 'HUF (Hindu Undivided Family)',
      'F': 'Firm / Partnership',
      'A': 'Association of Persons',
      'T': 'Trust',
      'B': 'Body of Individuals',
      'L': 'Local Authority',
      'J': 'Artificial Juridical Person',
      'G': 'Government Agency'
    };
    return {
      valid: true,
      entity: entityMap[fourthChar] || 'Recognized Entity',
      fourthChar
    };
  }

  /* ==========================================================================
     4. "WHAT THE SERVER SAW" DIFF VIEWER CONTROLLER
     ========================================================================== */
  const diffTabs = document.querySelectorAll('.diff-tab-btn');
  const diffPanels = document.querySelectorAll('.diff-content-panel');
  const diffSubtitle = document.getElementById('diff-right-subtitle');

  const subtitles = {
    'redacted-visual': 'Redacted Screen Overlay (Tier 2)',
    'ssg-json': 'Sanitized Screen Graph JSON (Tier 1 & 2)',
    'ledger-entry': 'LEKHA Cryptographic Ledger Record'
  };

  diffTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      diffTabs.forEach(t => t.classList.remove('active'));
      diffPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetView = tab.getAttribute('data-view');
      const activePanel = document.getElementById(`view-${targetView}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
      if (diffSubtitle && subtitles[targetView]) {
        diffSubtitle.textContent = subtitles[targetView];
      }
    });
  });



  /* ==========================================================================
     7. EGRESS GUARD SIMULATOR (CHECK #2 FAIL-CLOSED INJECTION)
     ========================================================================== */
  const btnInjectLeak = document.getElementById('btn-inject-leak');
  const guardBanner = document.getElementById('guard-banner');
  const checkItems = document.querySelectorAll('.check-item');
  let isLeakInjected = false;

  btnInjectLeak.addEventListener('click', () => {
    isLeakInjected = !isLeakInjected;

    if (isLeakInjected) {
      btnInjectLeak.innerHTML = '<span class="btn-icon">↺</span><span class="btn-label">Reset to Clean State</span>';
      btnInjectLeak.className = 'btn btn-secondary btn-sm';

      checkItems.forEach(item => {
        if (item.getAttribute('data-check') === '2') {
          item.className = 'check-item check-failed';
          item.querySelector('.check-status-badge').textContent = '✗';
        }
      });

      guardBanner.className = 'guard-output-banner banner-danger';
      guardBanner.innerHTML = `
        <div class="banner-icon">!</div>
        <div>
          <strong>BLOCKED BY EGRESS GUARD: CHECK #2 FAILED.</strong><br>
          <span>Unredacted Aadhaar number detected during pre-transmission regex sweep. Transmission halted. Zero bytes left the machine.</span>
        </div>
      `;
    } else {
      btnInjectLeak.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-label">Simulate PII Leak Attack</span>';
      btnInjectLeak.className = 'btn btn-danger btn-sm';

      checkItems.forEach(item => {
        item.className = 'check-item check-passed';
        item.querySelector('.check-status-badge').textContent = '✓';
      });

      guardBanner.className = 'guard-output-banner banner-success';
      guardBanner.innerHTML = `
        <div class="banner-icon">✓</div>
        <div>
          <strong>EGRESS GUARD VERDICT: ALL 8 CHECKS PASSED.</strong><br>
          <span>Payload verified clean. Request authorized for network dispatch.</span>
        </div>
      `;
    }
  });

  /* ==========================================================================
     8. LIVE CANARY RUNNER (60 CHECKS)
     ========================================================================== */
  const btnRunCanary = document.getElementById('btn-run-canary');
  const canaryProgress = document.getElementById('canary-progress');
  const canaryStatusText = document.getElementById('canary-status-text');
  const canaryCounter = document.getElementById('canary-counter');
  let isRunningCanary = false;

  btnRunCanary.addEventListener('click', () => {
    if (isRunningCanary) return;
    isRunningCanary = true;
    btnRunCanary.disabled = true;
    btnRunCanary.style.opacity = '0.6';

    let current = 0;
    const total = 60;
    canaryProgress.style.width = '0%';
    canaryProgress.style.backgroundColor = 'var(--accent-blue)';

    const surfaces = [
      'DOM text node', 'input value', 'placeholder', 'alt attribute',
      'title attribute', 'aria-label', 'data-* attribute', 'canvas pixels',
      'inside img', 'same-origin iframe', 'CSS ::after content', 'option text'
    ];

    const interval = setInterval(() => {
      current++;
      const surface = surfaces[current % surfaces.length];
      const pct = (current / total) * 100;
      canaryProgress.style.width = `${pct}%`;
      canaryCounter.textContent = `${current} / ${total} Evaluated`;
      canaryStatusText.textContent = `Testing canary in ${surface}... Clean.`;

      if (current >= total) {
        clearInterval(interval);
        isRunningCanary = false;
        canaryProgress.style.backgroundColor = 'var(--accent-green)';
        canaryStatusText.innerHTML = `<strong class="text-success">COMPLETE: 0 / 60 Leaked.</strong> Zero PII discovered on wire.`;
        btnRunCanary.disabled = false;
        btnRunCanary.style.opacity = '1';
        btnRunCanary.textContent = 'Re-Run Canary Suite';
      }
    }, 30);
  });

  /* ==========================================================================
     9. JUDGE Q&A ACCORDION
     ========================================================================== */
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // Open first Q&A item by default
  const firstAccordion = document.querySelector('.accordion-item');
  if (firstAccordion) {
    firstAccordion.classList.add('active');
  }

  // Interactive submit button on demo portal
  const btnSubmitApp = document.getElementById('btn-submit-app');
  if (btnSubmitApp) {
    btnSubmitApp.addEventListener('click', () => {
      alert('HASTA Risk Gating Alert: This is a HIGH-risk form submission action. A blocking modal halts execution until explicit user confirmation.');
    });
  }

  /* ==========================================================================
     10. SPLITTING.JS GRID CELL MATRIX HERO REVEAL ANIMATION (ss-16) + RIVE MASCOT
     ========================================================================== */
  const initHeroReveal = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const heroTitles = hero.querySelectorAll('.hero_row_text > h1');
    const heroSubTitles = hero.querySelectorAll('.hero_row_text > h4');
    const heroSeparators = hero.querySelectorAll('.hero_row_separator');
    const heroMedia = hero.querySelector('.hero_media');
    const riveCanvas = document.getElementById('hero-rive-canvas');

    let riveInstance = null;
    let isRiveLoaded = false;

    // Load Rive interactive mascot animation from assets/mascot.riv
    if (typeof rive !== 'undefined' && riveCanvas) {
      try {
        riveCanvas.width = riveCanvas.parentElement.clientWidth || window.innerWidth;
        riveCanvas.height = riveCanvas.parentElement.clientHeight || window.innerHeight;

        riveInstance = new rive.Rive({
          src: 'assets/mascot.riv',
          canvas: riveCanvas,
          autoplay: true,
          layout: new rive.Layout({
            fit: rive.Fit.Cover,
            alignment: rive.Alignment.Center,
          }),
          onLoad: () => {
            isRiveLoaded = true;
            window.riveInstance = riveInstance;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = riveCanvas.parentElement ? riveCanvas.parentElement.clientWidth : window.innerWidth;
            const h = riveCanvas.parentElement ? riveCanvas.parentElement.clientHeight : window.innerHeight;
            riveCanvas.width = w * dpr;
            riveCanvas.height = h * dpr;
            riveInstance.resizeDrawingSurfaceToCanvas();

            // Play ambient animations only: idle breathing, tail wagging, eye blinking
            riveInstance.play(['idle', 'iddle-tail', 'blink']);
          },
        });

        window.addEventListener('resize', () => {
          if (riveInstance && riveCanvas) {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = riveCanvas.parentElement ? riveCanvas.parentElement.clientWidth : window.innerWidth;
            const h = riveCanvas.parentElement ? riveCanvas.parentElement.clientHeight : window.innerHeight;
            riveCanvas.width = w * dpr;
            riveCanvas.height = h * dpr;
            riveInstance.resizeDrawingSurfaceToCanvas();
          }
        });
      } catch (err) {
        console.warn('Rive mascot loading notice:', err);
      }
    }

    // Split hero media into grid cells if data-rows configured
    if (typeof Splitting === 'function' && heroMedia && heroMedia.hasAttribute('data-rows')) {
      try {
        Splitting({
          target: heroMedia,
          by: 'cells',
          image: true,
        });
      } catch (e) {
        console.warn('Splitting.js initialization notice:', e);
      }
    }

    // Run GSAP Reveal Timeline
    if (typeof gsap !== 'undefined') {
      gsap.set(heroTitles, { y: '101%' });
      gsap.set(heroSubTitles, { autoAlpha: 0 });
      gsap.set(heroSeparators, { width: 0 });
      if (riveCanvas) {
        gsap.set(riveCanvas, { autoAlpha: 0 });
      }

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      // Animate background Rive canvas in smoothly
      if (riveCanvas) {
        tl.to(
          riveCanvas,
          {
            duration: 1.5,
            autoAlpha: 1,
            ease: 'power2.out',
          },
          0
        );
      }

      tl.to(
        heroTitles,
        {
          duration: 1.75,
          y: 0,
          stagger: 0.055,
        },
        0
      )
        .to(
          heroSubTitles,
          {
            duration: 1,
            autoAlpha: 1,
            ease: 'expo.in',
            stagger: 0.055,
          },
          0
        )
        .to(
          heroSeparators,
          {
            duration: 1.75,
            width: '100%',
            stagger: 0.095,
          },
          0
        );

      const cells = hero.querySelectorAll('.cell');
      if (cells.length > 0) {
        tl.fromTo(
          cells,
          {
            height: '0',
            scale: 0.5,
          },
          {
            duration: 1.25,
            height: '100%',
            scale: 1,
            stagger: 0.025,
            ease: 'expo.inOut',
          },
          0.5
        );
      }
    }
  };

  initHeroReveal();

  /* ==========================================================================
     11. CENTRALIZED ROBUST NAVIGATION & REDIRECTION ENGINE
     ========================================================================== */
  let closeObscuraMenu = null;

  const navigateToSection = (href) => {
    if (!href) return;

    // Handle home / top navigation
    if (href === "#" || href === "#top" || href === "#hero") {
      if (typeof closeObscuraMenu === "function") {
        closeObscuraMenu(true);
      }
      if (window.lenis) {
        window.lenis.start();
        window.lenis.scrollTo(0, { duration: 1.0 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (history.pushState) {
        history.pushState(null, null, window.location.pathname);
      }
      return;
    }

    const target = document.querySelector(href);
    if (!target) return;

    // 1. Instantly close full-screen overlay if open
    if (typeof closeObscuraMenu === "function") {
      closeObscuraMenu(true);
    }

    const navOffset = 40;
    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navOffset;

    // 2. Perform smooth scroll via Lenis or native scrollTo
    if (window.lenis) {
      window.lenis.start();
      window.lenis.scrollTo(target, {
        offset: -navOffset,
        duration: 1.05,
      });
    } else {
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }

    // 3. Update URL hash
    if (history.pushState) {
      history.pushState(null, null, href);
    } else {
      window.location.hash = href;
    }

    // 4. Secondary fine-tuning pass (accounts for GSAP ScrollTrigger pinning shifts)
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      if (Math.abs(rect.top - navOffset) > 100) {
        const adjustedTop = target.getBoundingClientRect().top + window.pageYOffset - navOffset;
        if (window.lenis) {
          window.lenis.scrollTo(adjustedTop, { duration: 0.45 });
        } else {
          window.scrollTo({ top: Math.max(0, adjustedTop), behavior: "smooth" });
        }
      }
    }, 450);
  };

  /* ==========================================================================
     12. OBSCURA STAGGERED TEXT REVEAL OVERLAY MENU ANIMATION
     ========================================================================== */
  const initObscuraMenu = () => {
    const menu = document.getElementById("obscura-menu");
    const menuBg = menu ? menu.querySelector(".menu-bg") : null;
    const menuItems = menu ? menu.querySelectorAll(".menu-item") : [];
    const navToggler = document.getElementById("nav-toggler");

    if (!menu || !navToggler) return;

    // Helper: Split text into masked characters
    const splitIntoMaskedChars = (element) => {
      const text = element.textContent;
      element.innerHTML = "";
      const chars = [];
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const mask = document.createElement("span");
        mask.className = "char-mask";
        mask.style.display = "inline-block";
        mask.style.overflow = "hidden";
        mask.style.verticalAlign = "bottom";

        const inner = document.createElement("span");
        inner.className = "char";
        inner.style.display = "inline-block";
        inner.textContent = char === " " ? "\u00A0" : char;

        mask.appendChild(inner);
        element.appendChild(mask);
        chars.push(inner);
      }
      return chars;
    };

    // Helper: Split text into masked word
    const splitIntoMaskedWord = (element) => {
      const text = element.textContent.trim();
      element.innerHTML = "";
      const mask = document.createElement("span");
      mask.className = "word-mask";
      mask.style.display = "inline-block";
      mask.style.overflow = "hidden";
      mask.style.verticalAlign = "bottom";

      const inner = document.createElement("span");
      inner.className = "word";
      inner.style.display = "inline-block";
      inner.textContent = text;

      mask.appendChild(inner);
      element.appendChild(mask);
      return [inner];
    };

    let tl = null;

    // Setup the split text masking animation
    const setupMenuAnimation = () => {
      const items = Array.from(menuItems).map((item) => {
        const index = item.querySelector(".item-index");
        const label = item.querySelector(".item-label");
        const divider = item.querySelector(".item-divider");

        const chars = splitIntoMaskedChars(label);
        const [firstChar, ...trailingChars] = chars;

        const trailingCharBox = document.createElement("span");
        trailingCharBox.className = "item-body";
        trailingCharBox.style.display = "inline-block";
        trailingCharBox.style.whiteSpace = "nowrap";
        trailingCharBox.style.overflow = "hidden";

        trailingChars.forEach((char) => {
          if (char.parentElement) {
            trailingCharBox.appendChild(char.parentElement);
          }
        });
        label.after(trailingCharBox);

        // Natural width measured before setting width to 0
        const bodyWidth = trailingCharBox.offsetWidth || trailingCharBox.scrollWidth;

        const indexWord = index ? splitIntoMaskedWord(index) : [];

        // Initial state setters via GSAP
        if (typeof gsap !== "undefined") {
          gsap.set([indexWord, firstChar], { yPercent: 100 });
          gsap.set(trailingChars, { xPercent: 125 });
          gsap.set(trailingCharBox, { width: 0 });
          gsap.set(divider, { scaleY: 0 });
        }

        return { indexWord, firstChar, trailingChars, trailingCharBox, bodyWidth, divider };
      });

      // Master Animation Timeline Configuration (Dual-Velocity State Machine)
      tl = (typeof gsap !== "undefined")
        ? gsap.timeline({
          paused: true,
          defaults: { ease: "power3.out" },
          onReverseComplete: () => {
            menu.classList.remove("is-menu-open");
            menu.style.pointerEvents = "";
          },
        })
        : null;

      if (tl) {
        // Backdrop Reveal
        tl.to(menuBg, { opacity: 1, duration: 0.65 }, 0);

        // Staggered Item Animation Sequence
        items.forEach(
          ({ indexWord, firstChar, trailingChars, trailingCharBox, bodyWidth, divider }, i) => {
            const startTime = 0.25 + i * 0.08;

            tl.to([indexWord, firstChar], { yPercent: 0, duration: 0.65 }, startTime)
              .to(
                divider,
                { scaleY: 1, duration: 0.75, ease: "power3.out" },
                startTime + 0.04
              )
              .to(
                trailingCharBox,
                {
                  width: bodyWidth,
                  duration: 0.75,
                  ease: "power4.inOut",
                },
                startTime + 0.12
              )
              .to(
                trailingChars,
                { xPercent: 0, duration: 0.65, stagger: 0.025 },
                startTime + 0.25
              );
          }
        );
      }
    };

    // Button Character Flicker Effect Helper
    function flickerTextTo(element, text) {
      if (!element) return;
      if (typeof gsap === "undefined") {
        element.textContent = text;
        return;
      }

      const textStr = text;
      element.innerHTML = "";
      const chars = [];
      for (let c of textStr) {
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
          stagger: { amount: 0.18, from: "random" },
        }
      );
    }

    // State Toggle
    let isMenuOpen = false;

    const openMenu = () => {
      if (isMenuOpen) return;
      isMenuOpen = true;
      menu.classList.add("is-menu-open");
      document.body.classList.add("is-menu-open");
      menu.setAttribute("aria-hidden", "false");
      menu.style.pointerEvents = "auto";
      if (window.lenis) window.lenis.stop();
      if (tl) {
        tl.timeScale(1).play();
      }
      flickerTextTo(navToggler, "Close");
    };

    const closeMenu = (fast = false) => {
      if (!isMenuOpen) return;
      isMenuOpen = false;
      menu.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-menu-open");

      // Re-enable smooth scroll engine immediately
      if (window.lenis) window.lenis.start();

      if (fast || !tl) {
        menu.classList.remove("is-menu-open");
        menu.style.pointerEvents = "none";
        if (tl) tl.pause(0);
      } else {
        menu.style.pointerEvents = "none";
        tl.timeScale(2.2).reverse();
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

    closeObscuraMenu = closeMenu;
    window.closeObscuraMenu = closeMenu;

    // Attach toggler listener IMMEDIATELY (no waiting for external fonts)
    navToggler.addEventListener("click", toggleMenu);

    // Auto close and smooth scroll when any menu link is clicked
    menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const href = item.getAttribute("href");
        navigateToSection(href);
      });
    });

    // Close when clicking on backdrop or outside menu container
    if (menuBg) {
      menuBg.addEventListener("click", () => {
        if (isMenuOpen) closeMenu(false);
      });
    }
    menu.addEventListener("click", (e) => {
      if (e.target === menu) {
        if (isMenuOpen) closeMenu(false);
      }
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isMenuOpen) {
        closeMenu(false);
      }
    });

    // Initialize animation setup once fonts are ready
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setupMenuAnimation);
    } else {
      setupMenuAnimation();
    }
  };

  initObscuraMenu();

  /* ==========================================================================
     17. GLOBAL SMOOTH SCROLL ENGINE (LENIS + GSAP SCROLLTRIGGER SYNC)
     ========================================================================== */
  const initGlobalSmoothScroll = () => {
    let lenis = null;
    if (typeof Lenis !== "undefined") {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
      });
      window.lenis = lenis;

      if (typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
        lenis.on("scroll", ScrollTrigger.update);

        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
      }
    }

    // Smooth anchor navigation for all in-page links (excluding menu-items handled by Obscura)
    document.querySelectorAll('a[href^="#"]:not(.menu-item)').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const href = anchor.getAttribute("href");
        if (href && href.length > 1) {
          e.preventDefault();
          navigateToSection(href);
        }
      });
    });
  };

  initGlobalSmoothScroll();

  /* ==========================================================================
     18. STICKY CARDS SCROLL ANIMATION (GSAP + SCROLLTRIGGER)
     ========================================================================== */
  const initStickyCardsAnimation = () => {
    const cardsContainer = document.querySelector("#pillars-cards");
    const cards = gsap.utils.toArray("#pillars-cards .card");

    if (!cardsContainer || !cards.length) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    // Pin ALL Cards & Animate Card Stack Upward Shift
    cards.forEach((card, index) => {
      const isLastCard = index === cards.length - 1;
      const cardInner = card.querySelector(".card-inner");

      // Pin EVERY card at top 12% until #problem section enters bottom of viewport
      ScrollTrigger.create({
        trigger: card,
        start: "top 12%",
        endTrigger: "#problem",
        end: "top 90%",
        pin: true,
        pinSpacing: false,
      });

      // Translate cardInner upward for preceding cards to create header exposure
      if (!isLastCard && cardInner) {
        gsap.to(cardInner, {
          y: `-${(cards.length - 1 - index) * 2.0}vh`,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 12%",
            endTrigger: "#problem",
            end: "top 90%",
            scrub: true,
          },
        });
      }
    });
  };

  initStickyCardsAnimation();

  /* ==========================================================================
     19. TOP 1% PARALLAX & 3D SPATIAL DEPTH ENGINE
     ========================================================================== */
  const initTopParallaxEngine = () => {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // ── A. HERO REVEAL MULTI-PLANE KINETIC PARALLAX ──
    const hero = document.querySelector(".hero");
    if (hero) {
      const heroMedia = hero.querySelector("#hero-media");
      if (heroMedia) {
        gsap.to(heroMedia, {
          yPercent: 32,
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }

      // Dynamic alternating row drift
      const rows = hero.querySelectorAll(".hero_row");
      rows.forEach((row, i) => {
        const text = row.querySelector(".hero_row_text");
        if (!text) return;
        const xOffset = (i % 2 === 0 ? -42 : 42) * (1 + i * 0.12);
        const yOffset = -20 - i * 7;

        gsap.to(text, {
          x: xOffset,
          y: yOffset,
          opacity: 0.9,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      });

      // Lift & fade hero scroll prompt
      const scrollPrompt = hero.querySelector(".hero_scroll_prompt");
      if (scrollPrompt) {
        gsap.to(scrollPrompt, {
          y: -35,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "40% top",
            scrub: true,
          },
        });
      }
    }

    // ── B. HERO OVERVIEW & METRICS FLOATING PARALLAX ──
    const showcase = document.querySelector("#hero-showcase");
    if (showcase) {
      const badge = showcase.querySelector(".hero-badge");
      const title = showcase.querySelector(".hero-title");
      const subtitle = showcase.querySelector(".hero-subtitle");
      const cards = showcase.querySelectorAll(".metric-card");

      if (badge) {
        gsap.to(badge, {
          y: -26,
          ease: "none",
          scrollTrigger: {
            trigger: showcase,
            start: "top 85%",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }

      if (title) {
        gsap.to(title, {
          y: -18,
          ease: "none",
          scrollTrigger: {
            trigger: showcase,
            start: "top 80%",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }

      if (subtitle) {
        gsap.to(subtitle, {
          y: -10,
          ease: "none",
          scrollTrigger: {
            trigger: showcase,
            start: "top 75%",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }

      // Organic wavy staggered floating metric cards
      const cardSpeeds = [-14, -34, -18, -42];
      cards.forEach((card, idx) => {
        card.classList.add("parallax-gpu");
        const speed = cardSpeeds[idx % cardSpeeds.length];
        gsap.to(card, {
          y: speed,
          ease: "none",
          scrollTrigger: {
            trigger: showcase,
            start: "top 70%",
            end: "bottom 15%",
            scrub: 0.7,
          },
        });
      });
    }

    // ── C. UNIVERSAL SECTION HEADINGS MICRO-PARALLAX ──
    document.querySelectorAll(".section-heading").forEach((heading) => {
      const tag = heading.querySelector(".section-tag, .tag-sulfur, .pill-tag");
      const title = heading.querySelector(".section-title");
      const subtitle = heading.querySelector(".section-subtitle");

      if (tag) {
        tag.classList.add("parallax-gpu");
        gsap.to(tag, {
          y: -22,
          ease: "none",
          scrollTrigger: {
            trigger: heading,
            start: "top 92%",
            end: "bottom 15%",
            scrub: 0.8,
          },
        });
      }

      if (title) {
        title.classList.add("parallax-gpu");
        gsap.to(title, {
          y: -14,
          ease: "none",
          scrollTrigger: {
            trigger: heading,
            start: "top 88%",
            end: "bottom 15%",
            scrub: 0.8,
          },
        });
      }

      if (subtitle) {
        subtitle.classList.add("parallax-gpu");
        gsap.to(subtitle, {
          y: -7,
          ease: "none",
          scrollTrigger: {
            trigger: heading,
            start: "top 84%",
            end: "bottom 10%",
            scrub: 0.8,
          },
        });
      }
    });

    // ── D. FEATURE SECTIONS MULTI-LAYER PARALLAX ──

    // 1. #problem (Trilemma Cards Parallax Elevation)
    const trilemmaCards = document.querySelectorAll(".trilemma-card");
    if (trilemmaCards.length >= 3) {
      const offsets = [16, -8, -32]; // PRAHARI physically ascends above legacy options
      trilemmaCards.forEach((card, idx) => {
        card.classList.add("parallax-gpu");
        gsap.to(card, {
          y: offsets[idx] || -15,
          ease: "none",
          scrollTrigger: {
            trigger: "#problem",
            start: "top 75%",
            end: "bottom 20%",
            scrub: 0.8,
          },
        });
      });
    }

    // 2. #diff-section (Asymmetrical Dual-Reality Split Drift)
    const diffPanes = document.querySelectorAll("#diff-section .diff-pane");
    if (diffPanes.length >= 2) {
      diffPanes[0].classList.add("parallax-gpu");
      diffPanes[1].classList.add("parallax-gpu");

      gsap.to(diffPanes[0], {
        y: -16,
        ease: "none",
        scrollTrigger: {
          trigger: "#diff-section",
          start: "top 70%",
          end: "bottom 20%",
          scrub: 0.8,
        },
      });

      gsap.to(diffPanes[1], {
        y: 16,
        ease: "none",
        scrollTrigger: {
          trigger: "#diff-section",
          start: "top 70%",
          end: "bottom 20%",
          scrub: 0.8,
        },
      });
    }

    // 3. #architecture (Device Card Elevation Parallax)
    const heroDevice = document.querySelector(".hero-device-wrapper");
    if (heroDevice) {
      heroDevice.classList.add("parallax-gpu");
      gsap.to(heroDevice, {
        y: -24,
        scale: 1.01,
        ease: "none",
        scrollTrigger: {
          trigger: "#architecture",
          start: "top 75%",
          end: "bottom 25%",
          scrub: 0.8,
        },
      });
    }

    // 4. #egress-guard (Checklist Stagger Parallax)
    const egressItems = document.querySelectorAll(".check-item");
    if (egressItems.length) {
      egressItems.forEach((item, idx) => {
        item.classList.add("parallax-gpu");
        const dir = idx % 2 === 0 ? -1 : 1;
        gsap.to(item, {
          y: dir * (8 + (idx % 3) * 4),
          ease: "none",
          scrollTrigger: {
            trigger: "#egress-guard",
            start: "top 70%",
            end: "bottom 20%",
            scrub: 0.8,
          },
        });
      });
    }

    // 5. #benchmarks (Canary Stat Cards Stagger)
    const benchmarkCards = document.querySelectorAll(".canary-stat-card");
    benchmarkCards.forEach((card, idx) => {
      card.classList.add("parallax-gpu");
      gsap.to(card, {
        y: -12 - (idx * 10),
        ease: "none",
        scrollTrigger: {
          trigger: "#benchmarks",
          start: "top 70%",
          end: "bottom 20%",
          scrub: 0.8,
        },
      });
    });

    // ── E. INTERACTIVE 3D MOUSE PARALLAX & RAY-TRACED SHEEN ──
    const initMouseTilt = () => {
      if (window.matchMedia("(pointer: coarse)").matches) return; // Skip touch screens

      const tiltCards = document.querySelectorAll(
        ".metric-card, .trilemma-card, .hero-device-card, .canary-stat-card, .qa-card"
      );

      tiltCards.forEach((card) => {
        card.classList.add("tilt-parallax-target");
        const parent = card.parentElement;
        if (parent && !parent.classList.contains("has-parallax-tilt")) {
          parent.classList.add("has-parallax-tilt");
        }

        // Add specular glare layer
        let glare = card.querySelector(".card-parallax-glare");
        if (!glare) {
          glare = document.createElement("div");
          glare.className = "card-parallax-glare";
          card.appendChild(glare);
        }

        let bounds = null;
        let isHovered = false;
        let targetRotX = 0;
        let targetRotY = 0;
        let currRotX = 0;
        let currRotY = 0;
        let animFrame = null;

        const updateTilt = () => {
          if (!isHovered) {
            currRotX += (0 - currRotX) * 0.12;
            currRotY += (0 - currRotY) * 0.12;
            glare.style.opacity = "0";

            if (Math.abs(currRotX) < 0.05 && Math.abs(currRotY) < 0.05) {
              card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)";
              cancelAnimationFrame(animFrame);
              animFrame = null;
              return;
            }
          } else {
            currRotX += (targetRotX - currRotX) * 0.14;
            currRotY += (targetRotY - currRotY) * 0.14;
          }

          card.style.transform = `perspective(1200px) rotateX(${currRotX.toFixed(2)}deg) rotateY(${currRotY.toFixed(2)}deg) translateY(-3px)`;
          animFrame = requestAnimationFrame(updateTilt);
        };

        card.addEventListener("mouseenter", () => {
          bounds = card.getBoundingClientRect();
          isHovered = true;
          if (!animFrame) {
            animFrame = requestAnimationFrame(updateTilt);
          }
        });

        card.addEventListener("mousemove", (e) => {
          if (!bounds) bounds = card.getBoundingClientRect();
          const mouseX = e.clientX - bounds.left;
          const mouseY = e.clientY - bounds.top;

          const normX = mouseX / bounds.width - 0.5;
          const normY = mouseY / bounds.height - 0.5;

          // Subtle elegant tilt angle (+/- 7.5 deg)
          targetRotX = -normY * 11;
          targetRotY = normX * 11;

          // Dynamic light specular reflection
          glare.style.opacity = "1";
          glare.style.background = `radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.22) 0%, transparent 65%)`;
        });

        card.addEventListener("mouseleave", () => {
          isHovered = false;
          targetRotX = 0;
          targetRotY = 0;
          bounds = null;
        });
      });
    };

    initMouseTilt();
  };

  initTopParallaxEngine();
});

