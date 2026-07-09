import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const TITLE_MAX = 15;
const DESC_MAX = 40;
const LINK_TARGETS = ['_self', '_blank'];

function truncate(text, max) {
  const trimmed = (text || '').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

function isLinkTargetCell(cell) {
  const text = cell?.textContent.trim();
  return LINK_TARGETS.includes(text) && !cell?.querySelector('picture, h1, h2, h3, h4, h5, h6, a');
}

function looksLikeUrl(text) {
  return /^(https?:\/\/|\/|#)/.test(text) || /\.html(\?|$)/i.test(text);
}

function isLinkCell(cell) {
  if (!cell) return false;
  if (cell.querySelector('a[href]')) return true;
  return looksLikeUrl(cell.textContent.trim());
}

function hasDescriptionContent(cell) {
  if (!cell) return false;
  if (cell.querySelector('p:not(:has(a))')) return true;
  return Boolean(cell.textContent.trim());
}

function parseCardRow(row) {
  const cells = [...row.children];
  const linkTargetCell = cells.find(isLinkTargetCell);
  const linkTarget = LINK_TARGETS.includes(linkTargetCell?.textContent.trim())
    ? linkTargetCell.textContent.trim()
    : '_self';

  const picture = cells.find((cell) => cell.querySelector('picture'))?.querySelector('picture');
  const headingCell = cells.find((cell) => cell.querySelector('h1, h2, h3, h4, h5, h6'));
  const heading = headingCell?.querySelector('h1, h2, h3, h4, h5, h6');
  const headingIdx = cells.indexOf(headingCell);
  const tailIdx = linkTargetCell ? cells.indexOf(linkTargetCell) : cells.length;

  const fieldCells = cells.slice(headingIdx + 1, tailIdx);
  const linkIdx = fieldCells.findIndex(isLinkCell);

  let descriptionCell = null;
  if (linkIdx > 0 && hasDescriptionContent(fieldCells[0])) {
    descriptionCell = fieldCells[0];
  }

  const linkArea = linkIdx >= 0 ? fieldCells[linkIdx] : null;
  const linkTextCell = (linkIdx > 1
    ? fieldCells.slice(1, linkIdx).find((cell) => cell.textContent.trim())
    : null) || (linkIdx >= 0 ? fieldCells[linkIdx + 1] : fieldCells[1]);

  return {
    picture,
    heading,
    descriptionCell,
    linkArea,
    linkTextCell: linkTextCell?.textContent.trim() ? linkTextCell : null,
    linkTarget,
  };
}

function getDescriptionElement(descriptionCell) {
  if (!descriptionCell) return null;

  const paragraph = descriptionCell.querySelector('p');
  if (paragraph && !paragraph.querySelector('a')) {
    return paragraph;
  }

  const description = document.createElement('p');
  description.textContent = descriptionCell.textContent.trim();
  moveInstrumentation(descriptionCell, description);
  return description;
}

function buildCtaLink({ linkArea, linkTextCell, linkTarget }) {
  const existingAnchor = linkArea?.querySelector('a[href]');
  let href = existingAnchor?.getAttribute('href') || '';
  let label = existingAnchor?.textContent.trim() || '';

  if (!href && linkArea) {
    const text = linkArea.textContent.trim();
    if (looksLikeUrl(text)) href = text;
  }

  if (!label && linkTextCell) {
    label = linkTextCell.textContent.trim();
  }

  if (!href) return null;

  let anchor = existingAnchor;
  if (!anchor) {
    anchor = document.createElement('a');
    anchor.href = href;
    if (linkArea) moveInstrumentation(linkArea, anchor);
    else if (linkTextCell) moveInstrumentation(linkTextCell, anchor);
  } else if (linkArea) {
    moveInstrumentation(linkArea, anchor);
  }

  if (label) anchor.textContent = label;
  anchor.classList.add('spotlight-card-cta');
  anchor.target = linkTarget;
  if (linkTarget === '_blank') {
    anchor.rel = 'noopener noreferrer';
  }

  return anchor;
}

function addCtaArrow(link) {
  if (link.querySelector('.spotlight-card-cta-icon')) return;
  const icon = document.createElement('span');
  icon.className = 'spotlight-card-cta-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" focusable="false" aria-hidden="true"><path fill="currentColor" d="M8.7 3.3a1 1 0 0 0 0 1.4L10.59 6.5H3.5a1 1 0 0 0 0 2h7.09l-1.89 1.8a1 1 0 1 0 1.38 1.44l3.5-3.33a1 1 0 0 0 .04-1.38l-3.5-3.33a1 1 0 0 0-1.42.04Z"/></svg>';
  link.append(icon);
}

/**
 * loads and decorates the spotlight block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const {
      picture,
      heading,
      descriptionCell,
      linkArea,
      linkTextCell,
      linkTarget,
    } = parseCardRow(row);

    const li = document.createElement('li');
    moveInstrumentation(row, li);

    if (heading) heading.textContent = truncate(heading.textContent, TITLE_MAX);

    const description = getDescriptionElement(descriptionCell);
    if (description) description.textContent = truncate(description.textContent, DESC_MAX);

    const link = buildCtaLink({ linkArea, linkTextCell, linkTarget });
    if (link) addCtaArrow(link);

    const inner = document.createElement('div');
    inner.className = 'spotlight-card-inner';

    const media = document.createElement('div');
    media.className = 'spotlight-card-media';
    if (picture) media.append(picture);
    inner.append(media);

    const content = document.createElement('div');
    content.className = 'spotlight-card-content';

    if (heading) content.append(heading);
    if (description) content.append(description);
    if (link) content.append(link);

    inner.append(content);
    li.append(inner);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    optimizedImg.classList.add('image-hover-zoom');
    moveInstrumentation(img, optimizedImg);
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
