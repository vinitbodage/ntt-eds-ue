import { moveInstrumentation } from '../../scripts/scripts.js';

function getCellByProp(block, prop) {
  const field = block.querySelector(`[data-aue-prop="${prop}"]`);
  return field?.closest('.footer-top > div > div') || field?.parentElement;
}

/**
 * loads and decorates the footer top block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.footer-top-inner')) return;

  const row = block.children[0];
  if (!row) return;

  const cells = [...row.children];
  const textCell = getCellByProp(block, 'text') || cells[0];
  const ctaTextCell = getCellByProp(block, 'ctaText')
    || cells.find((cell) => cell !== textCell && !cell.querySelector('a[href]'));
  const ctaLinkCell = getCellByProp(block, 'ctaLink')
    || cells.find((cell) => cell.querySelector('a[href]'));

  const headingText = textCell?.textContent.trim() || 'Connect with us';
  const anchor = ctaLinkCell?.querySelector('a[href]');
  const href = anchor?.getAttribute('href') || '';
  const ctaText = ctaTextCell?.textContent.trim()
    || anchor?.textContent.trim()
    || 'Contact Us';

  const inner = document.createElement('div');
  inner.className = 'footer-top-inner';

  const content = document.createElement('div');
  content.className = 'footer-top-content';

  const heading = document.createElement('h2');
  heading.className = 'footer-top-heading';
  heading.textContent = headingText;
  if (textCell) moveInstrumentation(textCell, heading);
  content.append(heading);

  if (href) {
    const link = document.createElement('a');
    link.className = 'footer-top-link';
    link.href = href;
    if (anchor) moveInstrumentation(anchor, link);
    link.innerHTML = `<span class="footer-top-link-text">${ctaText}</span><span class="footer-top-link-arrow" aria-hidden="true">→</span>`;
    content.append(link);
  }

  inner.append(content);
  moveInstrumentation(block, inner);
  block.replaceChildren(inner);
}
