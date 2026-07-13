import { moveInstrumentation } from '../../scripts/scripts.js';

function getCtaText(cells, anchor) {
  const labelCell = cells.find((cell) => {
    const text = cell.textContent.trim();
    return text && cell !== cells[0] && !cell.querySelector('a[href]');
  });
  return labelCell?.textContent.trim() || anchor?.textContent.trim() || 'Contact Us';
}

/**
 * loads and decorates the connect cta block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.connect-cta-inner')) return;

  const row = block.children[0];
  if (!row) return;

  const cells = [...row.children];
  const titleText = cells[0]?.textContent.trim() || 'Connect with us';
  const linkCell = cells.find((cell) => cell.querySelector('a[href]'));
  const anchor = linkCell?.querySelector('a[href]');
  const href = anchor?.getAttribute('href') || '';
  const ctaText = getCtaText(cells, anchor);

  const inner = document.createElement('div');
  inner.className = 'connect-cta-inner';

  const content = document.createElement('div');
  content.className = 'connect-cta-content';

  const heading = document.createElement('h2');
  heading.className = 'connect-cta-heading';
  heading.textContent = titleText;
  if (cells[0]) moveInstrumentation(cells[0], heading);
  content.append(heading);

  if (href) {
    const link = document.createElement('a');
    link.className = 'connect-cta-link';
    link.href = href;
    if (anchor) moveInstrumentation(anchor, link);
    link.innerHTML = `<span class="connect-cta-link-text">${ctaText}</span><span class="connect-cta-link-arrow" aria-hidden="true">→</span>`;
    content.append(link);
  }

  inner.append(content);
  moveInstrumentation(block, inner);
  block.replaceChildren(inner);
}
