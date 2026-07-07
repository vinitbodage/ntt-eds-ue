import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the stats block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    const divs = [...li.children];
    if (divs[0]) divs[0].className = 'stats-value';
    if (divs[1]) divs[1].className = 'stats-label';
    ul.append(li);
  });
  block.replaceChildren(ul);
}
