import { decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const SOCIAL_PLATFORMS = ['x', 'instagram', 'linkedin', 'youtube'];
const LINK_TARGETS = ['_self', '_blank'];
const DEFAULT_COPYRIGHT = 'Copyright © NTT DATA Group Corporation';

function getRows(block) {
  return [...block.children].filter((child) => child.tagName === 'DIV');
}

function getField(block, prop) {
  return block.querySelector(`[data-aue-prop="${prop}"]`);
}

function getText(element) {
  return element?.textContent?.trim() || '';
}

function readRowProp(row, prop) {
  const field = row.querySelector(`[data-aue-prop="${prop}"]`);
  return getText(field);
}

function looksLikeUrl(text) {
  return /^(https?:\/\/|\/|#)/.test(text) || /\.html(\?|$)/i.test(text);
}

function splitByHr(root) {
  const chunks = [];
  let buffer = [];

  [...root.childNodes].forEach((node) => {
    if (node.nodeName === 'HR') {
      if (buffer.length) {
        chunks.push(buffer);
        buffer = [];
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      buffer.push(node);
    }
  });

  if (buffer.length) chunks.push(buffer);
  return chunks;
}

// Chunks hold live DOM nodes that are later used as instrumentation sources,
// so they must never be re-parented while being inspected.
function queryChunk(chunk, selector) {
  return chunk.flatMap((element) => [
    ...(element.matches?.(selector) ? [element] : []),
    ...element.querySelectorAll(selector),
  ]);
}

function getHrefFromLink(link) {
  if (!link) return '';
  if (link.isPlainUrl) return link.href;
  return link.getAttribute('href') || link.href || '';
}

function getLinkSource(link, chunk) {
  if (!link) return chunk[0] || null;
  if (link.isPlainUrl) return link.source;
  return link;
}

function readLinkFromElement(element) {
  if (!element) return null;

  const anchor = element.querySelector('a[href]') || (element.matches?.('a[href]') ? element : null);
  if (anchor) return anchor;

  const text = getText(element);
  if (looksLikeUrl(text)) {
    return { href: text, source: element, isPlainUrl: true };
  }

  return null;
}

function getLabelFromChunk(chunk) {
  const labelParagraph = queryChunk(chunk, 'p').find((paragraph) => {
    const text = paragraph.textContent.trim();
    return text
      && !paragraph.querySelector('a[href]')
      && !looksLikeUrl(text)
      && !SOCIAL_PLATFORMS.includes(text.toLowerCase())
      && !LINK_TARGETS.includes(text);
  });
  return labelParagraph?.textContent.trim() || '';
}

function getLinkFromChunk(chunk) {
  const anchors = queryChunk(chunk, 'a[href]');
  const contentLink = anchors.find((anchor) => {
    const text = anchor.textContent.trim();
    return text && !text.startsWith('http') && !text.startsWith('/');
  });
  const anchor = contentLink
    || anchors.find((a) => !LINK_TARGETS.includes(a.textContent.trim()))
    || anchors[0]
    || null;
  if (anchor) return anchor;

  const urlParagraph = queryChunk(chunk, 'p').find((paragraph) => (
    !paragraph.querySelector('a[href]') && looksLikeUrl(paragraph.textContent.trim())
  ));
  if (urlParagraph) {
    return {
      href: urlParagraph.textContent.trim(),
      source: urlParagraph,
      isPlainUrl: true,
    };
  }

  return null;
}

function getTargetFromChunk(chunk, link) {
  const targetParagraph = queryChunk(chunk, 'p').find((paragraph) => (
    LINK_TARGETS.includes(paragraph.textContent.trim())
  ));
  if (targetParagraph) return targetParagraph.textContent.trim();
  if (link?.target === '_blank') return '_blank';
  return '_self';
}

function getPlatformFromChunk(chunk) {
  const platformParagraph = queryChunk(chunk, 'p').find((paragraph) => (
    SOCIAL_PLATFORMS.includes(paragraph.textContent.trim().toLowerCase())
  ));
  return platformParagraph?.textContent.trim().toLowerCase() || '';
}

function getRowCell(row) {
  return row.querySelector(':scope > div') || row;
}

function getElementChildren(cell) {
  return [...cell.childNodes].filter((node) => node.nodeType === Node.ELEMENT_NODE);
}

function parseInstrumentedLegalRow(row) {
  const linkField = row.querySelector('[data-aue-prop="link"]');
  if (!linkField || row.querySelector('[data-aue-prop="platform"], [data-aue-prop="profileUrl"]')) {
    return null;
  }

  const link = readLinkFromElement(linkField);
  const href = getHrefFromLink(link);
  if (!href) return null;

  const target = readRowProp(row, 'target');
  return {
    label: readRowProp(row, 'label'),
    href,
    target: LINK_TARGETS.includes(target) ? target : '_self',
    source: getLinkSource(link, [linkField]),
  };
}

function parseInstrumentedSocialRow(row) {
  const profileField = row.querySelector('[data-aue-prop="profileUrl"]');
  if (!profileField) return null;

  const platform = readRowProp(row, 'platform').toLowerCase();
  if (!SOCIAL_PLATFORMS.includes(platform)) return null;

  const link = readLinkFromElement(profileField);
  const href = getHrefFromLink(link);
  if (!href) return null;

  return {
    platform,
    href,
    ariaLabel: readRowProp(row, 'ariaLabel') || platform,
    source: getLinkSource(link, [profileField]),
  };
}

function parseLegalChunk(chunk) {
  const link = getLinkFromChunk(chunk);
  const href = getHrefFromLink(link);
  if (!href) return null;

  return {
    label: getLabelFromChunk(chunk) || getText(link),
    href,
    target: getTargetFromChunk(chunk, link),
    source: getLinkSource(link, chunk),
  };
}

function parseSocialChunk(chunk) {
  const link = getLinkFromChunk(chunk);
  const platform = getPlatformFromChunk(chunk);
  const href = getHrefFromLink(link);
  if (!href || !platform) return null;

  return {
    platform,
    href,
    ariaLabel: getLabelFromChunk(chunk) || platform,
    source: getLinkSource(link, chunk),
  };
}

function parseLegalItems(cell) {
  if (!cell) return [];

  const row = cell.closest('.footer-bottom > div');
  const instrumented = parseInstrumentedLegalRow(row || cell);
  if (instrumented) return [instrumented];

  if (cell.querySelector('hr')) {
    return splitByHr(cell).map(parseLegalChunk).filter(Boolean);
  }

  const paragraph = cell.querySelector('p');
  if (paragraph?.querySelectorAll('a[href]').length >= 3) {
    return [...paragraph.querySelectorAll('a[href]')].map((anchor) => ({
      label: anchor.textContent.trim(),
      href: anchor.getAttribute('href') || anchor.href,
      target: anchor.target === '_blank' ? '_blank' : '_self',
      source: anchor,
    }));
  }

  const chunk = getElementChildren(cell);
  const item = parseLegalChunk(chunk);
  return item ? [item] : [];
}

function parseSocialItems(cell) {
  if (!cell) return [];

  const row = cell.closest('.footer-bottom > div');
  const instrumented = parseInstrumentedSocialRow(row || cell);
  if (instrumented) return [instrumented];

  if (cell.querySelector('hr')) {
    return splitByHr(cell).map(parseSocialChunk).filter(Boolean);
  }

  const chunk = getElementChildren(cell);
  const item = parseSocialChunk(chunk);
  return item ? [item] : [];
}

function dedupeItems(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeLegalItems(items) {
  return dedupeItems(items, (item) => (
    item?.href ? `${item.label || ''}|${item.href}` : ''
  ));
}

function dedupeSocialItems(items) {
  return dedupeItems(items, (item) => item?.platform || '');
}

function isCopyrightRow(row) {
  const cell = getRowCell(row);
  const text = cell.textContent.trim();
  return /copyright/i.test(text) && cell.querySelectorAll('a[href]').length === 0
    && !cell.querySelector('[data-aue-prop="link"], [data-aue-prop="profileUrl"]');
}

function isSocialCell(cell) {
  if (!cell) return false;
  if (cell.querySelector('[data-aue-prop="platform"], [data-aue-prop="profileUrl"]')) return true;

  if (cell.querySelector('hr')) {
    return splitByHr(cell).some((chunk) => getPlatformFromChunk(chunk));
  }

  return Boolean(getPlatformFromChunk(getElementChildren(cell)));
}

function isLegalCell(cell) {
  if (!cell || isSocialCell(cell)) return false;
  if (cell.querySelector('[data-aue-prop="label"], [data-aue-prop="link"]')) return true;

  if (cell.querySelector('hr')) {
    return splitByHr(cell).some((chunk) => getLinkFromChunk(chunk) && !getPlatformFromChunk(chunk));
  }

  return cell.querySelectorAll('a[href]').length >= 1
    || Boolean(readLinkFromElement(cell));
}

function collectLegalLinks(rows) {
  const items = [];
  rows.forEach((row) => {
    if (isCopyrightRow(row)) return;
    const cell = getRowCell(row);
    if (!isLegalCell(cell)) return;
    items.push(...parseLegalItems(cell));
  });
  return dedupeLegalItems(items);
}

function collectSocialLinks(rows) {
  const items = [];
  rows.forEach((row) => {
    if (isCopyrightRow(row)) return;
    const cell = getRowCell(row);
    if (!isSocialCell(cell)) return;
    items.push(...parseSocialItems(cell));
  });
  return dedupeSocialItems(items);
}

function findCopyright(block, rows) {
  const copyrightField = getField(block, 'copyright');
  if (copyrightField) {
    return {
      text: getText(copyrightField),
      source: copyrightField.closest('.footer-bottom > div > div') || copyrightField,
    };
  }

  const copyrightRow = rows.find(isCopyrightRow);
  if (copyrightRow) {
    const cell = getRowCell(copyrightRow);
    return {
      text: cell.textContent.trim(),
      source: cell,
    };
  }

  return { text: DEFAULT_COPYRIGHT, source: null };
}

function applyLinkAttributes(anchor, target) {
  if (target === '_blank') {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
}

function buildLegalLink(item) {
  const listItem = document.createElement('li');
  const link = document.createElement('a');
  link.href = item.href;
  link.textContent = item.label || item.href;
  applyLinkAttributes(link, item.target);
  if (item.source) moveInstrumentation(item.source, link);
  listItem.append(link);
  return listItem;
}

function buildSocialLink(item) {
  const listItem = document.createElement('li');
  const link = document.createElement('a');
  link.href = item.href;
  link.setAttribute('aria-label', item.ariaLabel || item.platform);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  const icon = document.createElement('span');
  icon.className = `icon icon-${item.platform}`;
  icon.setAttribute('aria-hidden', 'true');
  link.append(icon);
  decorateIcons(link);

  if (item.source) moveInstrumentation(item.source, link);
  listItem.append(link);
  return listItem;
}

/**
 * loads and decorates the footer bottom block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.footer-bottom-inner')) return;

  const rows = getRows(block);
  if (!rows.length) return;

  const copyright = findCopyright(block, rows);
  const legalLinks = collectLegalLinks(rows);
  const socialLinks = collectSocialLinks(rows);

  const inner = document.createElement('div');
  inner.className = 'footer-bottom-inner';

  if (legalLinks.length) {
    const legalNav = document.createElement('nav');
    legalNav.className = 'footer-bottom-legal';
    legalNav.setAttribute('aria-label', 'Legal');

    const legalList = document.createElement('ul');
    legalList.className = 'footer-bottom-legal-list';
    legalLinks.forEach((item) => legalList.append(buildLegalLink(item)));

    legalNav.append(legalList);
    inner.append(legalNav);
  }

  const meta = document.createElement('div');
  meta.className = 'footer-bottom-meta';

  if (socialLinks.length) {
    const socialNav = document.createElement('nav');
    socialNav.className = 'footer-bottom-social';
    socialNav.setAttribute('aria-label', 'Social media');

    const socialList = document.createElement('ul');
    socialList.className = 'footer-bottom-social-list';
    socialLinks.forEach((item) => socialList.append(buildSocialLink(item)));

    socialNav.append(socialList);
    meta.append(socialNav);
  }

  const copyrightEl = document.createElement('p');
  copyrightEl.className = 'footer-bottom-copyright';
  copyrightEl.textContent = copyright.text;
  if (copyright.source) moveInstrumentation(copyright.source, copyrightEl);
  meta.append(copyrightEl);

  inner.append(meta);
  moveInstrumentation(block, inner);
  block.replaceChildren(inner);
}
