import { moveInstrumentation } from '../../scripts/scripts.js';

const DEFAULT_LOGO_SRC = `${window.hlx.codeBasePath}/icons/nttdata-logo.svg`;
const DEFAULT_LOGO_TITLE = 'NTT DATA Home';

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

function readLinkFromElement(element) {
  if (!element) return null;

  const anchor = element.querySelector('a[href]') || (element.matches?.('a[href]') ? element : null);
  if (anchor) return anchor;

  const text = getText(element);
  if (/^(https?:\/\/|\/|#)/.test(text)) {
    return { href: text, source: element, isPlainUrl: true };
  }

  return null;
}

function getHrefFromLink(link) {
  if (!link) return '';
  if (link.isPlainUrl) return link.href;
  return link.getAttribute('href') || link.href || '';
}

function getLinkSource(link, fallback) {
  if (!link) return fallback || null;
  if (link.isPlainUrl) return link.source;
  return link;
}

function getRowCell(row) {
  return row.querySelector(':scope > div') || row;
}

function isLogoFieldRow(row) {
  return Boolean(row.querySelector('[data-aue-prop="logo"], [data-aue-prop="logoLink"], [data-aue-prop="logoTitle"]'));
}

function isLegacyLogoRow(row) {
  return Boolean(row.querySelector('img, picture')) && !row.querySelector('[data-aue-prop="title"], [data-aue-prop="link"]');
}

function parseLogo(block, rows) {
  const logoField = getField(block, 'logo');
  const logoLinkField = getField(block, 'logoLink');
  const logoTitleField = getField(block, 'logoTitle');

  if (logoField || logoLinkField || logoTitleField) {
    const img = logoField?.querySelector('picture img, img')
      || block.querySelector('[data-aue-prop="logo"] picture img, [data-aue-prop="logo"] img');
    const linkEl = readLinkFromElement(logoLinkField);
    const href = getHrefFromLink(linkEl);
    return {
      href: href || '/',
      title: getText(logoTitleField) || linkEl?.getAttribute?.('title') || DEFAULT_LOGO_TITLE,
      img,
      linkSource: getLinkSource(linkEl, logoLinkField),
      logoContent: null,
    };
  }

  const logoRow = rows.find(isLegacyLogoRow);
  if (logoRow) {
    const cell = getRowCell(logoRow);
    const img = cell.querySelector('picture img, img');
    const linkEl = cell.querySelector('a[href]');
    return {
      href: linkEl?.getAttribute('href') || '/',
      title: linkEl?.getAttribute('title') || DEFAULT_LOGO_TITLE,
      img,
      linkSource: linkEl,
      logoContent: cell.querySelector('picture, img')?.closest('p, div') || cell.firstElementChild,
    };
  }

  return {
    href: '/',
    title: DEFAULT_LOGO_TITLE,
    img: null,
    linkSource: null,
    logoContent: null,
  };
}

function looksLikeUrl(text) {
  return /^(https?:\/\/|\/|#)/.test(text) || /\.html(\?|$)/i.test(text);
}

function getNavTitleFromRow(row) {
  const title = readRowProp(row, 'title');
  if (title) return title;

  const heading = row.querySelector('h2, h3, h4, h5, h6, p > strong, strong');
  if (heading?.textContent.trim()) return heading.textContent.trim();

  const cell = getRowCell(row);
  const labelParagraph = [...cell.querySelectorAll('p')].find((paragraph) => {
    const text = getText(paragraph);
    return text && !paragraph.querySelector('a[href]') && !looksLikeUrl(text);
  });
  return getText(labelParagraph);
}

function parseInstrumentedNavRow(row) {
  const linkField = row.querySelector('[data-aue-prop="link"]');
  if (!linkField || isLogoFieldRow(row)) return null;

  const link = readLinkFromElement(linkField);
  const href = getHrefFromLink(link);
  const title = getNavTitleFromRow(row);
  if (!title && !href) return null;

  const linkText = getText(link);
  const displayTitle = title || (linkText && !looksLikeUrl(linkText) ? linkText : '');

  return {
    title: displayTitle,
    href,
    source: getLinkSource(link, linkField),
    subLinksList: row.querySelector('ul'),
  };
}

function parseLegacyNavRow(row) {
  if (isLogoFieldRow(row) || isLegacyLogoRow(row)) return null;

  const cell = getRowCell(row);
  const paragraphs = [...cell.querySelectorAll('p')];
  const linkParagraph = paragraphs.find((paragraph) => (
    paragraph.querySelector('a[href]') || looksLikeUrl(getText(paragraph))
  ));
  const link = linkParagraph ? readLinkFromElement(linkParagraph) : readLinkFromElement(cell);
  const href = getHrefFromLink(link);
  const title = getNavTitleFromRow(row);
  if (!title && !href) return null;

  const linkText = getText(link);
  const displayTitle = title || (linkText && !looksLikeUrl(linkText) ? linkText : '');

  return {
    title: displayTitle,
    href,
    source: getLinkSource(link, linkParagraph || cell),
    subLinksList: row.querySelector('ul'),
  };
}

function collectNavColumns(block, rows) {
  const containerItems = [...block.querySelectorAll('[data-aue-prop="navColumns"]')];
  if (containerItems.length) {
    const fromContainers = containerItems.map((container) => {
      const row = container.closest(':scope > div') || container;
      return parseInstrumentedNavRow(container)
        || parseInstrumentedNavRow(row)
        || parseLegacyNavRow(row);
    }).filter(Boolean);
    if (fromContainers.length) return fromContainers;
  }

  const items = [];
  rows.forEach((row) => {
    const instrumented = parseInstrumentedNavRow(row);
    if (instrumented) {
      items.push(instrumented);
      return;
    }
    const legacy = parseLegacyNavRow(row);
    if (legacy) items.push(legacy);
  });
  return items;
}

function buildLogo(logoData) {
  const logoWrap = document.createElement('div');
  logoWrap.className = 'footer-site-logo';

  if (logoData.logoContent) {
    logoData.logoContent.classList.add('footer-site-logo-content');
    logoWrap.append(logoData.logoContent);
    const anchor = logoData.logoContent.querySelector('a[href]');
    if (anchor && logoData.linkSource) moveInstrumentation(logoData.linkSource, anchor);
    return logoWrap;
  }

  const anchor = document.createElement('a');
  anchor.href = logoData.href;
  anchor.title = logoData.title;

  const img = logoData.img ? logoData.img.cloneNode(true) : document.createElement('img');
  if (!logoData.img) {
    img.src = DEFAULT_LOGO_SRC;
    img.alt = 'NTT DATA Group Corporation';
  }

  const picture = document.createElement('picture');
  picture.append(img);
  anchor.append(picture);

  if (logoData.linkSource) moveInstrumentation(logoData.linkSource, anchor);
  else if (logoData.img) moveInstrumentation(logoData.img, img);

  const content = document.createElement('p');
  content.className = 'footer-site-logo-content';
  content.append(anchor);
  logoWrap.append(content);

  return logoWrap;
}

function buildNavItem(item) {
  const li = document.createElement('li');
  li.className = 'footer-site-nav-item';

  if (item.href) {
    const title = document.createElement('a');
    title.className = 'footer-site-nav-title';
    title.href = item.href;
    title.textContent = item.title || item.href;
    if (item.source) moveInstrumentation(item.source, title);
    li.append(title);
  } else if (item.title) {
    const title = document.createElement('span');
    title.className = 'footer-site-nav-title';
    title.textContent = item.title;
    if (item.source) moveInstrumentation(item.source, title);
    li.append(title);
  }

  if (item.subLinksList) {
    item.subLinksList.classList.add('footer-site-nav-links');
    li.append(item.subLinksList);
  }

  return li;
}

/**
 * loads and decorates the footer site block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.footer-site-inner')) return;

  const rows = getRows(block);
  const logoData = parseLogo(block, rows);
  const navColumns = collectNavColumns(block, rows);

  const inner = document.createElement('div');
  inner.className = 'footer-site-inner';

  const upper = document.createElement('div');
  upper.className = 'footer-site-upper';

  const nav = document.createElement('nav');
  nav.className = 'footer-site-nav';
  nav.setAttribute('aria-label', 'Footer');

  const navList = document.createElement('ul');
  navList.className = 'footer-site-nav-list';
  navColumns.forEach((item) => navList.append(buildNavItem(item)));

  if (navList.children.length) nav.append(navList);

  upper.append(buildLogo(logoData), nav);
  inner.append(upper);
  moveInstrumentation(block, inner);
  block.replaceChildren(inner);
}
