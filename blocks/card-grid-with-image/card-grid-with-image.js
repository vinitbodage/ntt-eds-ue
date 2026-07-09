import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getTitleElement(row) {
  return row.querySelector('h1, h2, h3, h4, h5, h6');
}

function getCtaLink(row) {
  return row.querySelector('a[href]');
}

function getCtaText(row, title, link) {
  const paragraph = [...row.querySelectorAll('p')].find(
    (p) => !p.querySelector('a') && !p.closest('picture'),
  );
  if (paragraph?.textContent?.trim()) return paragraph.textContent.trim();

  const textRow = [...row.children].find((cell) => {
    if (cell.tagName !== 'DIV') return false;
    if (cell.contains(title) || cell.contains(link) || cell.querySelector('picture')) return false;
    return Boolean(cell.textContent?.trim());
  });

  return textRow?.textContent?.trim() || link?.textContent?.trim() || 'Read more';
}

function isSameOriginImage(src) {
  try {
    const url = new URL(src, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function optimizeCardImage(img) {
  if (!isSameOriginImage(img.src)) {
    img.setAttribute('loading', 'lazy');
    return;
  }

  const optimizedPic = createOptimizedPicture(
    img.src,
    img.alt,
    false,
    [{ media: '(min-width: 900px)', width: '750' }, { width: '600' }],
  );
  moveInstrumentation(img, optimizedPic.querySelector('img'));
  img.closest('picture').replaceWith(optimizedPic);
}

function ensureCtaArrow(anchor) {
  if (anchor.querySelector('.card-grid-with-image-cta-arrow')) return;

  const arrow = document.createElement('span');
  arrow.className = 'card-grid-with-image-cta-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  anchor.append(arrow);
}

function setCtaText(link, ctaText) {
  let textSpan = link.querySelector('.card-grid-with-image-cta-text');
  if (!textSpan) {
    textSpan = document.createElement('span');
    textSpan.className = 'card-grid-with-image-cta-text';
    link.prepend(textSpan);
  }
  textSpan.textContent = ctaText;
}

function buildCard(row) {
  const picture = row.querySelector('picture');
  const title = getTitleElement(row);
  const link = getCtaLink(row);
  const ctaText = getCtaText(row, title, link);

  const article = document.createElement('article');
  article.className = 'card-grid-with-image-card';

  const media = document.createElement('div');
  media.className = 'card-grid-with-image-media';
  if (picture) media.append(picture);

  const content = document.createElement('div');
  content.className = 'card-grid-with-image-content';

  if (title) {
    title.classList.add('card-grid-with-image-title');
    content.append(title);
  }

  if (link?.href) {
    link.classList.add('card-grid-with-image-cta');
    link.textContent = '';
    setCtaText(link, ctaText);
    link.setAttribute('aria-label', `${ctaText} — ${title?.textContent?.trim() || ''}`.trim());
    ensureCtaArrow(link);
    content.append(link);
  }

  article.append(media, content);

  if (title?.textContent?.trim()) {
    article.setAttribute('aria-label', title.textContent.trim());
  }

  return article;
}

/**
 * loads and decorates the card grid with image block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.card-grid-with-image-list')) return;

  const ul = document.createElement('ul');
  ul.className = 'card-grid-with-image-list';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'card-grid-with-image-item';
    moveInstrumentation(row, li);
    li.append(buildCard(row));
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach(optimizeCardImage);

  block.replaceChildren(ul);
}
