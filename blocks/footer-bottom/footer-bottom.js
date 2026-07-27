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

function wrapElements(elements) {
  const wrapper = document.createElement('div');
  elements.forEach((element) => wrapper.append(element));
  return wrapper;
}

function getLabelFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  const labelParagraph = [...wrapper.querySelectorAll('p')].find((paragraph) => {
    const text = paragraph.textContent.trim();
    return text
      && !paragraph.querySelector('a[href]')
      && !SOCIAL_PLATFORMS.includes(text.toLowerCase())
      && !LINK_TARGETS.includes(text);
  });
  return labelParagraph?.textContent.trim() || '';
}

function getLinkFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  const anchors = [...wrapper.querySelectorAll('a[href]')];
  const contentLink = anchors.find((anchor) => {
    const text = anchor.textContent.trim();
    return text && !text.startsWith('http') && !text.startsWith('/');
  });
  return contentLink
    || anchors.find((anchor) => !LINK_TARGETS.includes(anchor.textContent.trim()))
    || anchors[0]
    || null;
}

function getTargetFromChunk(chunk, link) {
  const wrapper = wrapElements(chunk);
  const targetParagraph = [...wrapper.querySelectorAll('p')].find((paragraph) => (
    LINK_TARGETS.includes(paragraph.textContent.trim())
  ));
  if (targetParagraph) return targetParagraph.textContent.trim();
  if (link?.target === '_blank') return '_blank';
  return '_self';
}

function getPlatformFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  const platformParagraph = [...wrapper.querySelectorAll('p')].find((paragraph) => (
    SOCIAL_PLATFORMS.includes(paragraph.textContent.trim().toLowerCase())
  ));
  return platformParagraph?.textContent.trim().toLowerCase() || '';
}

function getRowCell(row) {
  return row.querySelector(':scope > div') || row;
}

function parseLegalItems(cell) {
  if (!cell) return [];

  if (cell.querySelector('hr')) {
    return splitByHr(cell).map((chunk) => {
      const link = getLinkFromChunk(chunk);
      return {
        label: getLabelFromChunk(chunk) || getText(link),
        href: link?.getAttribute('href') || link?.href || '',
        target: getTargetFromChunk(chunk, link),
        source: link || wrapElements(chunk),
      };
    }).filter((item) => item.href);
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

  return [];
}

function parseSocialItems(cell) {
  if (!cell?.querySelector('hr')) return [];

  return splitByHr(cell).map((chunk) => {
    const link = getLinkFromChunk(chunk);
    const platform = getPlatformFromChunk(chunk);
    return {
      platform,
      href: link?.getAttribute('href') || link?.href || '',
      ariaLabel: getLabelFromChunk(chunk) || platform,
      source: link || wrapElements(chunk),
    };
  }).filter((item) => item.href && item.platform);
}

function isCopyrightRow(row) {
  const cell = getRowCell(row);
  const text = cell.textContent.trim();
  return /copyright/i.test(text) && cell.querySelectorAll('a[href]').length === 0;
}

function isLegalRow(row) {
  const cell = getRowCell(row);
  if (cell.querySelector('hr')) {
    const chunks = splitByHr(cell);
    return chunks.some((chunk) => getLinkFromChunk(chunk) && !getPlatformFromChunk(chunk));
  }
  return cell.querySelectorAll('a[href]').length >= 3 && !getPlatformFromChunk([cell]);
}

function isSocialRow(row) {
  const cell = getRowCell(row);
  if (!cell.querySelector('hr')) return false;
  return splitByHr(cell).some((chunk) => SOCIAL_PLATFORMS.includes(getPlatformFromChunk(chunk)));
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

function findLegalCell(block, rows) {
  const legalField = getField(block, 'legalLinks');
  if (legalField) {
    return legalField.closest('.footer-bottom > div > div') || legalField.parentElement;
  }

  const legalRow = rows.find(isLegalRow);
  return legalRow ? getRowCell(legalRow) : null;
}

function findSocialCell(block, rows) {
  const socialField = getField(block, 'socialLinks');
  if (socialField) {
    return socialField.closest('.footer-bottom > div > div') || socialField.parentElement;
  }

  const socialRow = rows.find(isSocialRow);
  return socialRow ? getRowCell(socialRow) : null;
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
  const legalLinks = parseLegalItems(findLegalCell(block, rows));
  const socialLinks = parseSocialItems(findSocialCell(block, rows));

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
