import { getMetadata } from '../../scripts/aem.js';
import { loadFragment, resolveFragmentPath } from '../fragment/fragment.js';

/**
 * Resolve footer fragment path from page metadata or URL hierarchy.
 * @param {string} footerMeta Optional footer metadata value
 * @returns {Promise<string>} Footer fragment path
 */
async function resolveFooterPath(footerMeta) {
  if (footerMeta) {
    return new URL(footerMeta, window.location).pathname.replace(/(\.plain)?\.html$/, '');
  }

  const { pathname } = window.location;
  if (pathname.startsWith('/drafts')) {
    return '/drafts/footer';
  }

  const segments = pathname.split('/').filter(Boolean);
  const candidates = [];

  for (let i = segments.length; i >= 0; i -= 1) {
    const prefix = i ? `/${segments.slice(0, i).join('/')}` : '';
    candidates.push(`${prefix}/footer`);
  }

  candidates.push('/drafts/footer');

  const checks = await Promise.all(candidates.map(async (path) => {
    try {
      const resp = await fetch(`${path}.plain.html`, { method: 'HEAD' });
      return resp.ok ? path : null;
    } catch (e) {
      return null;
    }
  }));

  return checks.find(Boolean) || '/footer';
}

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
