import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const TEXT_COLOR_CLASSES = ['light', 'dark'];

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

/**
 * loads and decorates the tiles block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    applyTextColorClasses(row, li);

    while (row.firstElementChild) li.append(row.firstElementChild);

    const picture = li.querySelector('picture');
    const heading = li.querySelector('h1, h2, h3, h4, h5, h6');
    const link = li.querySelector('a[href]');
    const description = [...li.querySelectorAll('p')].find((p) => !p.querySelector('a'));

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
    if (link) {
      link.classList.add('tiles-tile-cta');
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
