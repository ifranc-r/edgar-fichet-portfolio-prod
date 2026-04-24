import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

/* ============================================
   ANIMATION SETTINGS
   ============================================ */

const TOPBAR_DURATION = 0.4;
const TOPBAR_EASING = 'power2.inOut';
const SCROLL_DURATION = 2;
const SCROLL_EASING = 'slow';
const INACTIVITY_DELAY = 4000; // 4 seconds

/* ============================================
   STATE
   ============================================ */

let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
let scrollListener: ((e: Event) => void) | null = null;
let isIntroVisible = false;

/* ============================================
   ANIMATIONS WITH GSAP
   ============================================ */

function showTopbar(el: HTMLElement) {
  gsap.to(el, { duration: TOPBAR_DURATION, ease: TOPBAR_EASING, y: 0, opacity: 1 });
}

function hideTopbar(el: HTMLElement) {
  gsap.to(el, { duration: TOPBAR_DURATION, ease: TOPBAR_EASING, y: -100, opacity: 0 });
}

function scrollToElement(selector: string) {
  const target = document.querySelector(selector) as HTMLElement;
  
  if (!target) {
    return;
  }
  
  gsap.to(window, {
    duration: SCROLL_DURATION,
    ease: SCROLL_EASING,
    scrollTo: { y: target },
  });
}

/* ============================================
   TIMERS
   ============================================ */

function startInactivityTimer(selector: string) {
  clearInactivityTimer();
  inactivityTimeout = setTimeout(() => {
    scrollToElement(selector);
  }, INACTIVITY_DELAY);
}

function clearInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
}

/* ============================================
   SETUP FUNCTIONS
   ============================================ */

function setupTopbarObserver(topbarEl: HTMLElement, introTitleEl: HTMLElement) {
  new IntersectionObserver(
    ([entry]) => entry.isIntersecting ? hideTopbar(topbarEl) : showTopbar(topbarEl),
    { threshold: 0 }
  ).observe(introTitleEl);
}

function setupScrollInactivityDetector(selector: string) {
  scrollListener = () => {
    startInactivityTimer(selector);
  };
}

function attachScrollListener() {
  if (scrollListener) {
    window.addEventListener('scroll', scrollListener);
  }
}

function detachScrollListener() {
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
  }
}

function setupIntroVisibilityObserver(introEl: HTMLElement, selector: string) {
  new IntersectionObserver(
    ([entry]) => {
      isIntroVisible = entry.isIntersecting;
      if (entry.isIntersecting) {
        // Intro is visible - attach scroll listener and start timer
        attachScrollListener();
        startInactivityTimer(selector);
      } else {
        // Intro is not visible - detach scroll listener and stop timer
        detachScrollListener();
        clearInactivityTimer();
      }
    },
    { threshold: 0 }
  ).observe(introEl);
}

function setupIntroClick(introCenterEl: HTMLElement, selector: string) {
  introCenterEl.addEventListener('click', () => {
    clearInactivityTimer();
    scrollToElement(selector);
  });
}

/* ============================================
   PUBLIC API
   ============================================ */

export function initializeIntroAnimations(
  topbarEl: HTMLElement | null,
  introTitleEl: HTMLElement | null,
  introCenterEl: HTMLElement | null,
  introSectionEl: HTMLElement | null,
  filmEl: HTMLElement | null
) {
  if (!topbarEl || !introTitleEl || !introCenterEl || !introSectionEl || !filmEl) return;

  gsap.set(topbarEl, { y: -100, opacity: 0 });
  setupTopbarObserver(topbarEl, introTitleEl);
  setupIntroClick(introCenterEl, '.page.filmography');
  setupScrollInactivityDetector('.page.filmography');
  setupIntroVisibilityObserver(introSectionEl, '.page.filmography');
}

export function cleanupIntroAnimations() {
  clearInactivityTimer();
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    scrollListener = null;
  }
}
