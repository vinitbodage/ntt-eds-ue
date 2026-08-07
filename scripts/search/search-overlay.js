import { decorateIcons, loadCSS } from '../aem.js';
import fetchPlaceholders from '../placeholders.js';
import { buildOverlaySearchConfig } from './search-config-merge.js';
import { loadSearchStyles, mountSearch } from './search-ui.js';

let overlayRoot = null;
let activeTrigger = null;
let previousFocus = null;

function getFocusableElements(container) {
  return [...container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function trapFocus(event, panel) {
  const focusable = getFocusableElements(panel);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function closeSearchOverlay() {
  if (!overlayRoot) return;

  overlayRoot.setAttribute('aria-hidden', 'true');
  overlayRoot.hidden = true;
  document.body.classList.remove('search-overlay-open');

  if (activeTrigger) {
    activeTrigger.setAttribute('aria-expanded', 'false');
    activeTrigger = null;
  }

  if (previousFocus?.focus) {
    previousFocus.focus();
    previousFocus = null;
  }
}

async function ensureOverlay() {
  if (overlayRoot) return overlayRoot;

  const base = window.hlx?.codeBasePath || '';
  await loadSearchStyles();
  await loadCSS(`${base}/blocks/search/search-overlay.css`);

  overlayRoot = document.createElement('div');
  overlayRoot.className = 'search-overlay';
  overlayRoot.setAttribute('role', 'dialog');
  overlayRoot.setAttribute('aria-modal', 'true');
  overlayRoot.setAttribute('aria-label', 'Search');
  overlayRoot.setAttribute('aria-hidden', 'true');
  overlayRoot.hidden = true;

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'search-overlay-backdrop';
  backdrop.setAttribute('aria-label', 'Close search');
  backdrop.addEventListener('click', closeSearchOverlay);

  const panel = document.createElement('div');
  panel.className = 'search-overlay-panel';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'search-overlay-close';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.innerHTML = '<span class="icon icon-close"></span>';
  closeBtn.addEventListener('click', closeSearchOverlay);

  const inner = document.createElement('div');
  inner.className = 'search-overlay-inner';

  panel.append(closeBtn, inner);
  overlayRoot.append(backdrop, panel);
  document.body.append(overlayRoot);
  decorateIcons(overlayRoot);

  overlayRoot.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSearchOverlay();
      return;
    }
    trapFocus(event, panel);
  });

  const placeholders = await fetchPlaceholders();
  const config = buildOverlaySearchConfig(placeholders);

  inner.textContent = '';
  await mountSearch(inner, {
    config,
    placeholders,
    mode: 'overlay',
    showResults: false,
  });

  const input = inner.querySelector('.search-input');
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeSearchOverlay();
    }
  });

  return overlayRoot;
}

/**
 * Opens the global search overlay from the navigation search control.
 * @param {HTMLButtonElement} trigger nav search button
 */
export async function openSearchOverlay(trigger) {
  previousFocus = document.activeElement;
  activeTrigger = trigger;

  await ensureOverlay();

  overlayRoot.hidden = false;
  overlayRoot.setAttribute('aria-hidden', 'false');
  document.body.classList.add('search-overlay-open');

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
    const popupId = overlayRoot.querySelector('.search-autosuggest')?.id;
    if (popupId) trigger.setAttribute('aria-controls', popupId);
  }

  const input = overlayRoot.querySelector('.search-input');
  input?.focus();
}

export { closeSearchOverlay };
