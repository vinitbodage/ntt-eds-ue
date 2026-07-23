import { getMetadata } from '../../scripts/aem.js';
import { loadFragment, resolveFragmentPath } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = await resolveFragmentPath(footerMeta, 'footer');
  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  if (!fragment) {
    return;
  }

  const footer = document.createElement('div');
  footer.className = 'footer';
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  block.append(footer);
}
