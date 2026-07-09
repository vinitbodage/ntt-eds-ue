import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const TOOL_STYLES = ['primary', 'globe', 'search'];

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
  elements.forEach((el) => wrapper.append(el));
  return wrapper;
}

function getLabelFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  const heading = wrapper.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) return heading.textContent.trim();

  const labelParagraph = [...wrapper.querySelectorAll('p')].find((p) => (
    !p.querySelector('a[href]') && !p.querySelector('picture, img')
    && p.textContent.trim()
    && !['_self', '_blank', ...TOOL_STYLES].includes(p.textContent.trim())
  ));
  if (labelParagraph) return labelParagraph.textContent.trim();

  const link = wrapper.querySelector('a[href]');
  if (link?.textContent.trim() && !link.textContent.trim().startsWith('/')
    && !link.textContent.trim().startsWith('http')) {
    return link.textContent.trim();
  }

  return '';
}

function getLinkFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  const anchors = [...wrapper.querySelectorAll('a[href]')];
  const contentLink = anchors.find((a) => !['_self', '_blank'].includes(a.textContent.trim()));
  return contentLink || anchors[0] || null;
}

function getTargetFromChunk(chunk, link) {
  const wrapper = wrapElements(chunk);
  const targetParagraph = [...wrapper.querySelectorAll('p')].find((p) => (
    ['_self', '_blank'].includes(p.textContent.trim())
  ));
  if (targetParagraph) return targetParagraph.textContent.trim();
  if (link?.target === '_blank') return '_blank';
  if (link?.getAttribute('rel')?.includes('external')) return '_blank';
  return '_self';
}

function getIconFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  return wrapper.querySelector('picture img, img:not(picture img)') || null;
}

function applyLinkAttributes(anchor, target) {
  if (target === '_blank') {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.classList.add('nav-external');
  }
}

function buildLink(label, href, target, icon) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.textContent = label;
  applyLinkAttributes(anchor, target);

  if (icon) {
    const iconWrap = document.createElement('span');
    iconWrap.className = 'nav-link-icon';
    const optimized = createOptimizedPicture(icon.src, icon.alt || '', false, [{ width: '48' }]);
    moveInstrumentation(icon, optimized.querySelector('img'));
    iconWrap.append(optimized);
    anchor.prepend(iconWrap);
  }

  return anchor;
}

function parseMegaColumns(megaChunks) {
  return megaChunks.map((columnChunk) => {
    const wrapper = wrapElements(columnChunk);
    const title = getLabelFromChunk(columnChunk);
    const links = [];

    wrapper.querySelectorAll('a[href]').forEach((link) => {
      links.push({
        label: link.textContent.trim(),
        href: link.href,
        target: getTargetFromChunk([link.parentElement], link),
        icon: link.parentElement?.querySelector('img') || null,
      });
    });

    return { title, links };
  }).filter((col) => col.title || col.links.length);
}

function parseNavItemFromChunk(chunk) {
  const wrapper = wrapElements(chunk);
  const nestedHr = wrapper.querySelector('hr');

  if (nestedHr) {
    const megaChunks = splitByHr(wrapper).slice(1);
    const parentChunk = splitByHr(wrapper)[0] || chunk;
    const parentLink = getLinkFromChunk(parentChunk);
    const label = getLabelFromChunk(parentChunk) || parentLink?.textContent.trim() || '';

    return {
      label,
      href: parentLink?.href || '#',
      target: getTargetFromChunk(parentChunk, parentLink),
      icon: getIconFromChunk(parentChunk),
      megaColumns: parseMegaColumns(megaChunks),
      sourceRow: null,
    };
  }

  const link = getLinkFromChunk(chunk);
  const label = getLabelFromChunk(chunk) || link?.textContent.trim() || '';

  return {
    label,
    href: link?.href || '#',
    target: getTargetFromChunk(chunk, link),
    icon: getIconFromChunk(chunk),
    megaColumns: [],
    sourceRow: null,
  };
}

function parseLegacyNavItem(li) {
  const topLink = li.querySelector(':scope > a[href], :scope > p > a[href], :scope > p strong > a[href]');
  const labelParagraph = [...li.querySelectorAll(':scope > p')].find((p) => !p.querySelector('a[href]'));
  const label = labelParagraph?.textContent.trim()
    || topLink?.textContent.trim() || '';

  return {
    label,
    href: topLink?.href || '#',
    target: topLink?.target === '_blank' ? '_blank' : '_self',
    icon: li.querySelector(':scope picture img, :scope > img'),
    sourceRow: li,
  };
}

function parseNavItems(root) {
  const legacyList = root.querySelector(':scope > ul, :scope ul');
  if (legacyList) {
    return [...legacyList.querySelectorAll(':scope > li')].map(parseLegacyNavItem);
  }

  const hrCell = root.querySelector('hr') ? root : null;
  if (hrCell) {
    return splitByHr(hrCell).map((chunk) => parseNavItemFromChunk(chunk));
  }

  return [];
}

function getToolStyleFromChunk(chunk, link) {
  const wrapper = wrapElements(chunk);
  const styleParagraph = [...wrapper.querySelectorAll('p')].find((p) => (
    TOOL_STYLES.includes(p.textContent.trim())
  ));
  if (styleParagraph) return styleParagraph.textContent.trim();
  if (link?.classList.contains('primary') || link?.closest('strong')) return 'primary';
  return '';
}

function parseTools(root) {
  const items = [];
  const buttonLink = root.querySelector('a.button, a.primary, .button-container a, p a[href]');

  if (root.querySelector('hr')) {
    splitByHr(root).forEach((chunk) => {
      const link = getLinkFromChunk(chunk);
      const label = getLabelFromChunk(chunk) || link?.textContent.trim() || '';
      const style = getToolStyleFromChunk(chunk, link);

      if (!link && style === 'search') {
        items.push({
          label: label || 'Search',
          href: '#',
          target: '_self',
          icon: null,
          style: 'search',
        });
        return;
      }

      if (!link) return;

      items.push({
        label,
        href: link.href,
        target: getTargetFromChunk(chunk, link),
        icon: getIconFromChunk(chunk),
        style,
      });
    });
    return items;
  }

  if (buttonLink) {
    items.push({
      label: buttonLink.textContent.trim(),
      href: buttonLink.href,
      target: buttonLink.target === '_blank' ? '_blank' : '_self',
      icon: root.querySelector('img'),
      style: buttonLink.classList.contains('primary') ? 'primary' : '',
    });
  }

  return items;
}

function parseBlock(block) {
  const rows = [...block.children];
  let logo = null;
  let logoLink = null;
  let navItemsRoot = null;
  let toolsRoot = null;

  rows.forEach((row, index) => {
    const cell = row.querySelector(':scope > div') || row;
    const hasNav = cell.querySelector('ul, hr');
    const hasTool = cell.querySelector('a.button, a.primary, strong a[href], .button-container');

    if (!navItemsRoot && hasNav) {
      navItemsRoot = cell;
      return;
    }

    if (!toolsRoot && (hasTool || (index === rows.length - 1 && cell.querySelector('a[href]')))) {
      toolsRoot = cell;
      return;
    }

    if (!navItemsRoot && !toolsRoot && cell.querySelector('a[href], picture, img')) {
      if (!logoLink) logoLink = cell.querySelector('a[href]');
      if (!logo) logo = cell.querySelector('picture img, img');
    }
  });

  return {
    logo,
    logoLink,
    navItems: navItemsRoot ? parseNavItems(navItemsRoot) : [],
    tools: toolsRoot ? parseTools(toolsRoot) : [],
  };
}

function buildNavItem(item) {
  const li = document.createElement('li');
  const link = buildLink(item.label, item.href, item.target, item.icon);
  li.append(link);
  if (item.sourceRow) moveInstrumentation(item.sourceRow, li);
  return li;
}

function buildTool(tool) {
  if (tool.style === 'search') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-tool nav-tool-search';
    button.setAttribute('aria-label', tool.label || 'Search');
    const icon = document.createElement('span');
    icon.className = 'icon icon-search';
    button.append(icon);
    decorateIcons(button);
    return button;
  }

  if (tool.style === 'globe') {
    const link = document.createElement('a');
    link.href = tool.href || '#';
    link.className = 'nav-tool nav-tool-globe';
    link.setAttribute('aria-label', tool.label || 'Select region');
    applyLinkAttributes(link, tool.target);
    const icon = document.createElement('span');
    icon.className = 'icon icon-globe';
    link.append(icon);
    if (tool.label) {
      const label = document.createElement('span');
      label.className = 'nav-tool-label';
      label.textContent = tool.label;
      link.append(label);
    }
    decorateIcons(link);
    return link;
  }

  const link = buildLink(tool.label, tool.href, tool.target, tool.icon);
  if (tool.style === 'primary') {
    link.classList.add('button', 'primary');
    const wrapper = document.createElement('p');
    wrapper.className = 'button-container';
    wrapper.append(link);
    return wrapper;
  }
  link.classList.add('nav-tool');
  return link;
}

/**
 * loads and decorates the navigation block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const {
    logo, logoLink, navItems, tools,
  } = parseBlock(block);

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'navigation';

  const bar = document.createElement('div');
  bar.className = 'nav-bar';

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (logo || logoLink) {
    const brandAnchor = document.createElement('a');
    brandAnchor.href = logoLink?.href || '/';
    brandAnchor.title = logoLink?.title || 'Home';
    if (logo) {
      const img = logo.tagName === 'IMG' ? logo : logo.querySelector('img');
      if (img) {
        if (img.src.includes('.svg')) {
          const logoImg = document.createElement('img');
          logoImg.src = img.src;
          logoImg.alt = img.alt || 'NTT DATA';
          moveInstrumentation(img, logoImg);
          brandAnchor.append(logoImg);
        } else {
          const pic = createOptimizedPicture(img.src, img.alt || 'NTT DATA', false, [{ width: '280' }]);
          moveInstrumentation(img, pic.querySelector('img'));
          brandAnchor.append(pic);
        }
      }
    } else {
      brandAnchor.textContent = logoLink?.textContent.trim() || 'NTT DATA';
    }
    brand.append(brandAnchor);
  }
  bar.append(brand);

  const sections = document.createElement('div');
  sections.className = 'nav-sections';
  const list = document.createElement('ul');
  navItems.forEach((item) => {
    list.append(buildNavItem(item));
  });
  sections.append(list);
  bar.append(sections);

  const toolsEl = document.createElement('div');
  toolsEl.className = 'nav-tools';
  tools.forEach((tool) => {
    toolsEl.append(buildTool(tool));
  });
  bar.append(toolsEl);

  nav.append(bar);

  moveInstrumentation(block, nav);
  block.replaceChildren(nav);
}
