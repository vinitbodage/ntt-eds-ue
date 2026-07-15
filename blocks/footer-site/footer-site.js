import { moveInstrumentation } from '../../scripts/scripts.js';

function isLogoRow(row) {
  return Boolean(row.querySelector('img, picture'));
}

function isCopyrightRow(row) {
  return /copyright/i.test(row.textContent);
}

function isLegalRow(row) {
  const links = row.querySelectorAll('a[href]');
  return links.length >= 3 && !row.querySelector('h2, h3, h4, h5, h6, ul');
}

function buildNavColumn(row) {
  const li = document.createElement('li');
  li.className = 'footer-site-nav-item';
  moveInstrumentation(row, li);

  const heading = row.querySelector('h2, h3, h4, h5, h6, p > strong, strong');
  const headingLink = heading?.querySelector('a[href]') || row.querySelector('a[href]');

  if (headingLink) {
    const title = document.createElement('a');
    title.className = 'footer-site-nav-title';
    title.href = headingLink.getAttribute('href');
    title.textContent = heading?.textContent.trim() || headingLink.textContent.trim();
    moveInstrumentation(headingLink, title);
    li.append(title);
  } else if (heading) {
    const title = document.createElement('span');
    title.className = 'footer-site-nav-title';
    title.textContent = heading.textContent.trim();
    moveInstrumentation(heading, title);
    li.append(title);
  }

  const list = row.querySelector('ul');
  if (list) {
    list.classList.add('footer-site-nav-links');
    li.append(list);
  }

  return li;
}

/**
 * loads and decorates the footer site block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.footer-site-inner')) return;

  const rows = [...block.children];
  const inner = document.createElement('div');
  inner.className = 'footer-site-inner';

  const upper = document.createElement('div');
  upper.className = 'footer-site-upper';

  const logo = document.createElement('div');
  logo.className = 'footer-site-logo';

  const nav = document.createElement('nav');
  nav.className = 'footer-site-nav';
  nav.setAttribute('aria-label', 'Footer');

  const navList = document.createElement('ul');
  navList.className = 'footer-site-nav-list';

  const lower = document.createElement('div');
  lower.className = 'footer-site-lower';

  const legal = document.createElement('nav');
  legal.className = 'footer-site-legal';
  legal.setAttribute('aria-label', 'Legal');

  const copyright = document.createElement('p');
  copyright.className = 'footer-site-copyright';

  rows.forEach((row) => {
    if (isLogoRow(row)) {
      const logoContent = row.querySelector('picture, img')?.closest('p, div') || row.firstElementChild;
      if (logoContent) {
        logoContent.classList.add('footer-site-logo-content');
        logo.append(logoContent);
        moveInstrumentation(row, logoContent);
      }
      return;
    }

    if (isCopyrightRow(row)) {
      copyright.textContent = row.textContent.trim();
      moveInstrumentation(row, copyright);
      return;
    }

    if (isLegalRow(row)) {
      const legalList = document.createElement('ul');
      legalList.className = 'footer-site-legal-list';
      row.querySelectorAll('a[href]').forEach((anchor) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = anchor.getAttribute('href');
        link.textContent = anchor.textContent.trim();
        moveInstrumentation(anchor, link);
        item.append(link);
        legalList.append(item);
      });
      legal.append(legalList);
      return;
    }

    navList.append(buildNavColumn(row));
  });

  if (navList.children.length) nav.append(navList);
  upper.append(logo, nav);
  lower.append(legal, copyright);
  inner.append(upper, lower);
  block.replaceChildren(inner);
}
