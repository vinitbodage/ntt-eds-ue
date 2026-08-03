/*
 * Custom Tiles Block
 * Responsive grid of custom tiles with image, title, description, and link.
 * Supports Universal Editor and Document Authoring.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const LINK_TARGETS = ['_self', '_blank'];
const TITLE_TYPES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const DEFAULT_TITLE_TAG = 'h3';
const PLACEHOLDER_TEXT = /^(title|description|link label|link text|image alt text|learn more|read more|custom tile|tile|#)$/i;

function isEmptyOrPlaceholder(text) {
  const trimmed = (text || '').trim();
  return !trimmed || PLACEHOLDER_TEXT.test(trimmed);
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

function isConfigCell(cell) {
  return cell?.querySelector('[data-aue-prop="titleType"], [data-aue-prop="linkType"], [data-aue-prop="linkText"], [data-aue-prop="imageAlt"]');
}

function readRowProp(row, prop) {
  const field = row.querySelector(`[data-aue-prop="${prop}"]`);
  return field?.textContent?.trim() || '';
}

function getTitleTypeFromRow(row, cells) {
  const titleType = readRowProp(row, 'titleType').toLowerCase();
  if (TITLE_TYPES.includes(titleType)) return titleType;
  const titleTypeCell = cells.find(isTitleTypeCell);
  const fromCell = titleTypeCell?.textContent.trim().toLowerCase();
  return TITLE_TYPES.includes(fromCell) ? fromCell : DEFAULT_TITLE_TAG;
}

function getContentCells(cells, pictureCell, linkCell, linkTargetCell) {
  const imgAlt = pictureCell?.querySelector('img')?.getAttribute('alt')?.trim();
  return cells.filter((cell) => {
    if (cell === pictureCell || cell === linkCell || cell === linkTargetCell) return false;
    if (cell.querySelector('picture') || isLinkTargetCell(cell) || isTitleTypeCell(cell)) return false;
    if (isConfigCell(cell) || isImageAltCell(cell, pictureCell)) return false;
    const text = cell.textContent.trim();
    if (!text || isEmptyOrPlaceholder(text)) return false;
    if (imgAlt && text === imgAlt && !cell.querySelector('h1, h2, h3, h4, h5, h6')) return false;
    return true;
  });
}

function ensureHeading(titleCell, existingHeading, titleTag = DEFAULT_TITLE_TAG) {
  if (existingHeading) {
    existingHeading.classList.add('custom-tiles-tile-title');
    return existingHeading;
  }
  if (!titleCell || isEmptyOrPlaceholder(titleCell.textContent)) return null;
  const heading = document.createElement(titleTag);
  heading.className = 'custom-tiles-tile-title';
  heading.textContent = titleCell.textContent.trim();
  moveInstrumentation(titleCell, heading);
  return heading;
}

function readLinkFromField(linkField) {
  if (!linkField) return { href: '', source: null, existingAnchor: null };
  const anchor = linkField.querySelector('a[href]');
  if (anchor) {
    return {
      href: anchor.getAttribute('href') || '',
      source: linkField,
      existingAnchor: anchor,
    };
  }
  const text = linkField.textContent.trim();
  if (looksLikeUrl(text)) {
    return { href: text, source: linkField, existingAnchor: null };
  }
  return { href: '', source: linkField, existingAnchor: null };
}

function parseInstrumentedTileRow(row) {
  if (!row.querySelector('[data-aue-prop]')) return null;

  const picture = row.querySelector('picture');
  const title = readRowProp(row, 'title');
  const description = readRowProp(row, 'description');
  const linkText = readRowProp(row, 'linkText');
  const linkType = readRowProp(row, 'linkType');
  const linkTarget = LINK_TARGETS.includes(linkType) ? linkType : '_self';
  const titleTag = getTitleTypeFromRow(row, [...row.children]);
  const titleField = row.querySelector('[data-aue-prop="title"]');
  const descriptionField = row.querySelector('[data-aue-prop="description"]');
  const linkTextField = row.querySelector('[data-aue-prop="linkText"]');
  const linkField = row.querySelector('[data-aue-prop="link"]');

  const existingHeading = row.querySelector('h1, h2, h3, h4, h5, h6');
  let heading = existingHeading;
  if (!heading && !isEmptyOrPlaceholder(title)) {
    heading = document.createElement(titleTag);
    heading.className = 'custom-tiles-tile-title';
    heading.textContent = title;
    if (titleField) moveInstrumentation(titleField, heading);
  } else if (heading) {
    heading.classList.add('custom-tiles-tile-title');
  }

  let descriptionCell = null;
  if (!isEmptyOrPlaceholder(description)) {
    descriptionCell = descriptionField || null;
  }

  const { href, source: linkArea, existingAnchor } = readLinkFromField(linkField);

  return {
    picture,
    heading,
    descriptionCell,
    linkArea,
    linkTextCell: linkTextField,
    linkTarget,
    linkHref: href,
    linkText,
    existingAnchor,
  };
}

function parseTileRow(row) {
  const instrumented = parseInstrumentedTileRow(row);
  if (instrumented) return instrumented;

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
  const titleTag = getTitleTypeFromRow(row, cells);
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
    if (isLinkTargetCell(cell) || isImageAltCell(cell, pictureCell)
      || isTitleTypeCell(cell)) return false;
    return Boolean(cell.textContent.trim()) && !isEmptyOrPlaceholder(cell.textContent);
  });

  return {
    picture,
    heading,
    descriptionCell,
    linkArea,
    linkTextCell,
    linkTarget,
    linkHref: '',
    linkText: '',
    existingAnchor: null,
  };
}

function getDescriptionElement(descriptionCell) {
  if (!descriptionCell) return null;
  const text = descriptionCell.textContent.trim();
  if (isEmptyOrPlaceholder(text)) return null;

  const paragraph = descriptionCell.querySelector('p');
  if (paragraph && !paragraph.querySelector('a')) {
    if (isEmptyOrPlaceholder(paragraph.textContent)) return null;
    moveInstrumentation(descriptionCell, paragraph);
    return paragraph;
  }

  const description = document.createElement('p');
  description.textContent = text;
  moveInstrumentation(descriptionCell, description);
  return description;
}

function buildCtaLink({
  linkArea, linkTextCell, linkTarget, linkHref, linkText, existingAnchor,
}) {
  let href = linkHref || existingAnchor?.getAttribute('href') || '';
  const authoredLabel = linkText || linkTextCell?.textContent.trim() || '';
  const anchorLabel = existingAnchor?.textContent.trim() || '';
  const label = authoredLabel || (anchorLabel && !looksLikeUrl(anchorLabel) ? anchorLabel : '');

  if (!href && linkArea) {
    const areaAnchor = linkArea.querySelector('a[href]');
    href = areaAnchor?.getAttribute('href') || '';
    if (!href) {
      const text = linkArea.textContent.trim();
      if (looksLikeUrl(text)) href = text;
    }
  }

  if (!href) return null;

  let anchor = existingAnchor || linkArea?.querySelector('a[href]');
  if (!anchor) {
    anchor = document.createElement('a');
    anchor.href = href;
    if (linkArea) moveInstrumentation(linkArea, anchor);
    else if (linkTextCell) moveInstrumentation(linkTextCell, anchor);
  } else if (linkArea) {
    moveInstrumentation(linkArea, anchor);
  }

  anchor.href = href;
  if (label) anchor.textContent = label;
  anchor.classList.add('custom-tiles-tile-cta');
  anchor.target = linkTarget;
  if (linkTarget === '_blank') anchor.rel = 'noopener noreferrer';
  return anchor;
}

function isSameOriginImage(src) {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function optimizeTileImage(img) {
  if (!isSameOriginImage(img.src)) {
    img.setAttribute('loading', 'lazy');
    return;
  }
  const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
  moveInstrumentation(img, optimizedPic.querySelector('img'));
  img.closest('picture').replaceWith(optimizedPic);
}

function buildCustomTileInner({
  picture, heading, description, link,
}) {
  const imageWrap = document.createElement('div');
  imageWrap.className = 'custom-tiles-tile-image';
  if (picture) imageWrap.append(picture);

  const body = document.createElement('div');
  body.className = 'custom-tiles-tile-body';
  if (heading) body.append(heading);
  if (description) body.append(description);
  if (link) body.append(link);

  const inner = document.createDocumentFragment();
  inner.append(imageWrap, body);
  return inner;
}

function buildCustomTile(row) {
  const parsed = parseTileRow(row);
  const {
    picture, heading, descriptionCell, linkArea, linkTextCell,
    linkTarget, linkHref, linkText, existingAnchor,
  } = parsed;

  const li = document.createElement('li');
  li.className = 'custom-tiles-tile';
  moveInstrumentation(row, li);

  const description = getDescriptionElement(descriptionCell);
  const link = buildCtaLink({
    linkArea, linkTextCell, linkTarget, linkHref, linkText, existingAnchor,
  });

  li.append(buildCustomTileInner({
    picture, heading, description, link,
  }));
  return li;
}

export default function decorate(block) {
  if (block.querySelector('ul')) return;

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    ul.append(buildCustomTile(row));
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    optimizeTileImage(img);
  });

  block.replaceChildren(ul);
}
