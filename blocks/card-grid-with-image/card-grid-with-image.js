import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getRowCells(row) {
  return [...row.children].filter((child) => child.tagName === 'DIV');
}

function getTitleFromCell(titleCell) {
  if (!titleCell?.textContent?.trim()) return null;

  const heading = titleCell.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) return heading;

  const source = titleCell.querySelector(':scope > div') || titleCell;
  const title = document.createElement('h3');
  title.textContent = source.textContent.trim();
  moveInstrumentation(source, title);
  return title;
}

function getTextFromCell(cell) {
  if (!cell) return '';

  const paragraph = cell.querySelector('p');
  if (paragraph?.textContent?.trim()) return paragraph.textContent.trim();

  return cell.textContent?.trim() || '';
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
  const cells = getRowCells(row);
  const imageCell = cells.find((cell) => cell.querySelector('picture'));
  const linkCell = cells.find((cell) => cell.querySelector('a[href]'));
  const contentCells = cells.filter((cell) => cell !== imageCell && cell !== linkCell);

  const picture = row.querySelector('picture');
  const link = linkCell?.querySelector('a[href]');
  const title = getTitleFromCell(contentCells[0]);
  const ctaText = getTextFromCell(contentCells[1])
    || link?.textContent?.trim()
    || 'Read more';

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
