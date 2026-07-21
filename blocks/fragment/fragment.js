/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * @returns {boolean} True when running on the local AEM dev server
 */
export function isLocalDev() {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Normalize a fragment path from metadata or author input.
 * @param {string} value Fragment path or URL
 * @returns {string} Normalized path
 */
export function normalizeFragmentPath(value) {
  return new URL(value, window.location).pathname.replace(/(\.plain)?\.html$/, '');
}

/**
 * Check whether a fragment page exists.
 * @param {string} path Fragment path without extension
 * @returns {Promise<boolean>}
 */
export async function fragmentExists(path) {
  try {
    const resp = await fetch(`${path}.plain.html`, { method: 'HEAD' });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Resolve a header/footer fragment path from page metadata or URL hierarchy.
 * @param {string|undefined} metaValue Page metadata value
 * @param {string} fragmentName Fragment basename (e.g. nav, footer)
 * @returns {Promise<string>}
 */
export async function resolveFragmentPath(metaValue, fragmentName) {
  if (metaValue) {
    return normalizeFragmentPath(metaValue);
  }

  const { pathname } = window.location;
  const localPath = `/drafts/${fragmentName}`;
  const candidates = [];

  if (pathname.startsWith('/drafts') || isLocalDev()) {
    candidates.push(localPath);
  }

  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length; i >= 0; i -= 1) {
    const prefix = i ? `/${segments.slice(0, i).join('/')}` : '';
    candidates.push(`${prefix}/${fragmentName}`);
  }

  const uniqueCandidates = [...new Set(candidates)];
  const checks = await Promise.all(uniqueCandidates.map(async (path) => (
    (await fragmentExists(path)) ? path : null
  )));

  const resolved = checks.find(Boolean);
  if (resolved) return resolved;
  return isLocalDev() ? localPath : `/${fragmentName}`;
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.closest('.section').classList.add(...fragmentSection.classList);
      block.closest('.fragment').replaceWith(...fragment.childNodes);
    }
  }
}
