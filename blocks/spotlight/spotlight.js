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

function getLinkTarget(row) {
  const cell = [...row.children].find((child) => {
    const text = child.textContent.trim();
    return LINK_TARGETS.includes(text);
  });
  const target = cell?.textContent.trim();
  return LINK_TARGETS.includes(target) ? target : '_self';
}

function removeLinkTargetCell(container) {
  [...container.children].forEach((child) => {
    const text = child.textContent.trim();
    if (LINK_TARGETS.includes(text) && !child.querySelector('a, picture, h1, h2, h3, h4, h5, h6, p')) {
      child.remove();
    }
  });
}

/**
 * loads and decorates the spotlight block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const linkTarget = getLinkTarget(row);
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    while (row.firstElementChild) li.append(row.firstElementChild);
    removeLinkTargetCell(li);

    const picture = li.querySelector('picture');
    const heading = li.querySelector('h1, h2, h3, h4, h5, h6');
    const link = li.querySelector('a[href]');
    const description = [...li.querySelectorAll('p')].find((p) => !p.querySelector('a'));

    if (heading) heading.textContent = truncate(heading.textContent, TITLE_MAX);
    if (description) description.textContent = truncate(description.textContent, DESC_MAX);

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
    if (link) {
      link.classList.add('spotlight-card-cta');
      link.target = linkTarget;
      if (linkTarget === '_blank') {
        link.rel = 'noopener noreferrer';
      }
      content.append(link);
    }

    inner.append(content);
    li.replaceChildren(inner);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
