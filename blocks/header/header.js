import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Resolve navigation fragment path from page metadata or URL hierarchy.
 * @param {string} navMeta Optional nav metadata value
 * @returns {Promise<string>} Navigation fragment path
 */
async function resolveNavPath(navMeta) {
  if (navMeta) {
    return new URL(navMeta, window.location).pathname.replace(/(\.plain)?\.html$/, '');
  }

  const { pathname } = window.location;
  if (pathname.startsWith('/drafts')) {
    return '/drafts/nav';
  }

  const segments = pathname.split('/').filter(Boolean);
  const candidates = [];

  for (let i = segments.length; i >= 0; i -= 1) {
    const prefix = i ? `/${segments.slice(0, i).join('/')}` : '';
    candidates.push(`${prefix}/nav`);
  }

  const checks = await Promise.all(candidates.map(async (path) => {
    try {
      const resp = await fetch(`${path}.plain.html`, { method: 'HEAD' });
      return resp.ok ? path : null;
    } catch (e) {
      return null;
    }
  }));

  return checks.find(Boolean) || '/nav';
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = await resolveNavPath(navMeta);
  const fragment = await loadFragment(navPath);

  block.textContent = '';

  if (!fragment) {
    return;
  }

  const decoratedNav = fragment.querySelector('nav#nav, .navigation.block nav, .navigation nav');

  if (decoratedNav) {
    const navWrapper = document.createElement('div');
    navWrapper.className = 'nav-wrapper';
    navWrapper.append(decoratedNav);
    block.append(navWrapper);
    return;
  }

  // Legacy fragment format: three divs (brand, sections, tools)
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
