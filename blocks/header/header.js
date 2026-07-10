import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  let navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  if (!navMeta && window.location.pathname.startsWith('/drafts')) {
    navPath = '/drafts/nav';
  }
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
