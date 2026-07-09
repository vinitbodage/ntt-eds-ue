import { moveInstrumentation } from '../../scripts/scripts.js';

function getDescriptionElement(block, heading, link) {
  const paragraph = [...block.querySelectorAll('p')].find(
    (p) => !p.querySelector('a') && !p.closest('ul'),
  );
  if (paragraph) return paragraph;

  const descriptionRow = [...block.children].find((row) => {
    if (row.tagName !== 'DIV') return false;
    if (row.contains(heading) || row.contains(link)) return false;
    return Boolean(row.textContent?.trim());
  });

  if (!descriptionRow) return null;

  const source = descriptionRow.querySelector(':scope > div') || descriptionRow;
  const description = document.createElement('p');
  description.textContent = source.textContent.trim();
  moveInstrumentation(source, description);
  return description;
}

function getCtaText(block, heading, link, description) {
  const textRow = [...block.children].find((row) => {
    if (row.tagName !== 'DIV') return false;
    if (row.contains(heading) || row.contains(link) || row.contains(description)) return false;
    if (row.querySelector('a[href]')) return false;
    return Boolean(row.textContent?.trim());
  });

  return textRow?.textContent?.trim() || link?.textContent?.trim() || 'Learn more';
}

function wrapElement(element, wrapperClass) {
  const wrapper = document.createElement('div');
  wrapper.className = wrapperClass;
  wrapper.append(element);
  return wrapper;
}

function setCtaText(link, ctaText) {
  let textSpan = link.querySelector('.feature-card-cta-text');
  if (!textSpan) {
    textSpan = document.createElement('span');
    textSpan.className = 'feature-card-cta-text';
    link.prepend(textSpan);
  }
  textSpan.textContent = ctaText;
}

function ensureCtaArrow(link) {
  if (link.querySelector('.feature-card-cta-arrow')) return;

  const arrow = document.createElement('span');
  arrow.className = 'feature-card-cta-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  link.append(arrow);
}

/**
 * loads and decorates the feature card block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.feature-card-content')) return;

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const link = block.querySelector('a[href]');
  const description = getDescriptionElement(block, heading, link);
  const ctaText = getCtaText(block, heading, link, description);

  const content = document.createElement('div');
  content.className = 'feature-card-content';

  if (heading) {
    heading.classList.add('feature-card-heading');
    content.append(wrapElement(heading, 'feature-card-heading-wrapper'));
  }

  if (description) {
    description.classList.add('feature-card-description');
    content.append(wrapElement(description, 'feature-card-description-wrapper'));
  }

  if (link?.href) {
    link.classList.add('feature-card-cta');
    link.textContent = '';
    setCtaText(link, ctaText);
    link.setAttribute(
      'aria-label',
      `${ctaText} — ${heading?.textContent?.trim() || ''}`.trim(),
    );
    ensureCtaArrow(link);
    content.append(wrapElement(link, 'feature-card-cta-wrapper'));
  }

  block.replaceChildren(content);
}
