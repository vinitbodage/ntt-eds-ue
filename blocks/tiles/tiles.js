import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const TEXT_COLOR_CLASSES = ['light', 'dark'];
const TITLE_MAX = 40;
const DESC_MAX = 100;
const LINK_TARGETS = ['_self', '_blank'];
const TITLE_TYPES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const DEFAULT_TITLE_TAG = 'h3';

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

function isImageAltCell(cell, pictureCell) {
  if (!cell || cell === pictureCell) return false;
  const alt = pictureCell?.querySelector('img')?.getAttribute('alt')?.trim();
  const text = cell.textContent.trim();
  return Boolean(alt && text === alt && !cell.querySelector('h1, h2, h3, h4, h5, h6, a'));
}

function isTitleTypeCell(cell) {
  const text = cell?.textContent.trim().toLowerCase();
  return TITLE_TYPES.includes(text) && !cell?.querySelector('picture, a, h1, h2, h3, h4, h5, h6');
}

function getTitleType(cells) {
  const titleTypeCell = cells.find(isTitleTypeCell);
  const titleType = titleTypeCell?.textContent.trim().toLowerCase();
  return TITLE_TYPES.includes(titleType) ? titleType : DEFAULT_TITLE_TAG;
}

function getContentCells(cells, pictureCell, linkCell, linkTargetCell) {
  const imgAlt = pictureCell?.querySelector('img')?.getAttribute('alt')?.trim();

  return cells.filter((cell) => {
    if (cell === pictureCell || cell === linkCell || cell === linkTargetCell) return false;
    if (cell.querySelector('picture') || isLinkTargetCell(cell) || isTitleTypeCell(cell)) return false;
    const text = cell.textContent.trim();
    if (!text) return false;
    if (imgAlt && text === imgAlt && !cell.querySelector('h1, h2, h3, h4, h5, h6')) return false;
    return true;
  });
}

function ensureHeading(titleCell, existingHeading, titleTag = DEFAULT_TITLE_TAG) {
  if (existingHeading) return existingHeading;
  if (!titleCell) return null;

  const heading = document.createElement(titleTag);
  heading.textContent = titleCell.textContent.trim();
  moveInstrumentation(titleCell, heading);
  return heading;
}

function parseTileRow(row) {
  const cells = [...row.children];
  const pictureCell = cells.find((cell) => cell.querySelector('picture'));
  const picture = pictureCell?.querySelector('picture');
  const linkTargetCell = cells.find(isLinkTargetCell);
  const linkTarget = LINK_TARGETS.includes(linkTargetCell?.textContent.trim())
    ? linkTargetCell.textContent.trim()
    : '_self';
  const linkCell = cells.find((cell) => cell.querySelector('a[href]'));
  const linkArea = linkCell || cells.find((cell) => {
    if (cell === pictureCell || cell === linkTargetCell) return false;
    return looksLikeUrl(cell.textContent.trim());
  });

  const existingHeading = row.querySelector('h1, h2, h3, h4, h5, h6');
  const titleTag = getTitleType(cells);
  const contentCells = getContentCells(cells, pictureCell, linkCell, linkTargetCell);

  let titleCell = null;
  let descriptionCell = null;

  if (existingHeading) {
    titleCell = contentCells.find((cell) => cell.contains(existingHeading)) || null;
    descriptionCell = contentCells.find((cell) => cell !== titleCell && !cell.querySelector('a[href]')) || null;
  } else if (contentCells.length) {
    [titleCell] = contentCells;
    descriptionCell = contentCells[1] && !contentCells[1].querySelector('a[href]')
      ? contentCells[1]
      : null;
  }

  const heading = ensureHeading(titleCell, existingHeading, titleTag);

  const linkTextCell = cells.find((cell) => {
    if (cell === pictureCell || cell === linkTargetCell || cell === linkArea) return false;
    if (titleCell && cell === titleCell) return false;
    if (descriptionCell && cell === descriptionCell) return false;
    if (cell.querySelector('picture, a[href]')) return false;
    if (isLinkTargetCell(cell) || isImageAltCell(cell, pictureCell) || isTitleTypeCell(cell)) {
      return false;
    }
    return Boolean(cell.textContent.trim());
  });

  return {
    picture,
    heading,
    descriptionCell,
    linkArea,
    linkTextCell,
    linkTarget,
  };
}

function getDescriptionElement(descriptionCell) {
  if (!descriptionCell) return null;

  const paragraph = descriptionCell.querySelector('p');
  if (paragraph && !paragraph.querySelector('a')) {
    moveInstrumentation(descriptionCell, paragraph);
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
  const authoredLabel = linkTextCell?.textContent.trim() || '';
  const label = authoredLabel || existingAnchor?.textContent.trim() || '';

  if (!href && linkArea) {
    const text = linkArea.textContent.trim();
    if (looksLikeUrl(text)) href = text;
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
  anchor.classList.add('tiles-tile-cta');
  anchor.target = linkTarget;
  if (linkTarget === '_blank') {
    anchor.rel = 'noopener noreferrer';
  }

  return anchor;
}

function addCtaExternalLinkIcon(link) {
  if (link.querySelector('.tiles-tile-cta-icon')) return;
  const icon = document.createElement('span');
  icon.className = 'icon icon-external_link tiles-tile-cta-icon';
  icon.setAttribute('aria-hidden', 'true');
  link.append(icon);
}

function isSameOriginImage(src) {
  try {
    const url = new URL(src, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function optimizeTileImage(img, isSpotlight) {
  if (!isSameOriginImage(img.src)) {
    img.setAttribute('loading', 'lazy');
    if (isSpotlight) img.classList.add('image-hover-zoom');
    return;
  }

  const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
  const optimizedImg = optimizedPic.querySelector('img');
  if (isSpotlight) optimizedImg.classList.add('image-hover-zoom');
  moveInstrumentation(img, optimizedImg);
  img.closest('picture').replaceWith(optimizedPic);
}

function applyTextColorClasses(source, target) {
  TEXT_COLOR_CLASSES.forEach((cls) => {
    if (source.classList.contains(cls)) {
      target.classList.add(cls);
      source.classList.remove(cls);
    }
  });
  if (!TEXT_COLOR_CLASSES.some((cls) => target.classList.contains(cls))) {
    target.classList.add('light');
  }
}

function buildTileInner({
  picture, heading, description, link,
}) {
  const inner = document.createElement('div');
  inner.className = 'tiles-tile-inner';

  const media = document.createElement('div');
  media.className = 'tiles-tile-media';
  if (picture) media.append(picture);
  inner.append(media);

  const content = document.createElement('div');
  content.className = 'tiles-tile-content';

  if (heading) content.append(heading);
  if (description) content.append(description);
  if (link) content.append(link);

  inner.append(content);
  return inner;
}

function buildTile(row, { includeDescription, isSpotlight }) {
  const {
    picture,
    heading,
    descriptionCell,
    linkArea,
    linkTextCell,
    linkTarget,
  } = parseTileRow(row);

  const li = document.createElement('li');
  moveInstrumentation(row, li);
  if (!isSpotlight) applyTextColorClasses(row, li);

  if (heading && isSpotlight) {
    heading.textContent = truncate(heading.textContent, TITLE_MAX);
  }

  const description = includeDescription ? getDescriptionElement(descriptionCell) : null;
  if (description && isSpotlight) {
    description.textContent = truncate(description.textContent, DESC_MAX);
  }

  const link = buildCtaLink({ linkArea, linkTextCell, linkTarget });
  if (link && isSpotlight) addCtaExternalLinkIcon(link);

  li.append(buildTileInner({
    picture, heading, description, link,
  }));
  return li;
}

/**
 * loads and decorates the tiles block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.tiles-tile-inner')) return;

  const isSpotlight = block.classList.contains('layout-spotlight');
  const isCompact = block.classList.contains('layout-compact');

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    ul.append(buildTile(row, { includeDescription: !isCompact, isSpotlight }));
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    optimizeTileImage(img, isSpotlight);
  });

  block.replaceChildren(ul);
  if (isSpotlight) decorateIcons(block);
}
