import { moveInstrumentation } from '../../scripts/scripts.js';

const MARGIN_PROPS = ['marginTop', 'marginBottom'];

function isAuthoring() {
  const { classList } = document.documentElement;
  return classList.contains('adobe-ue-edit') || classList.contains('adobe-ue-preview');
}

function parseMargin(value) {
  const parsed = Number.parseInt(String(value ?? '0').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isMarginValueCell(element) {
  if (!element?.matches('div')) return false;
  const text = element.textContent.trim();
  return text !== '' && /^\d+$/.test(text);
}

function readMarginProp(container, prop, removeCell) {
  const field = container.querySelector(`[data-aue-prop="${prop}"]`);
  if (!field) return null;
  const value = parseMargin(field.textContent);
  if (removeCell) {
    field.remove();
  } else {
    field.classList.add('title-with-margin-config');
  }
  return value;
}

function readDeliveryMargins(cells) {
  if (cells.length < MARGIN_PROPS.length) return null;

  const margins = {};
  MARGIN_PROPS.forEach((prop, index) => {
    margins[prop] = parseMargin(cells[index].textContent);
    cells[index].remove();
  });
  return margins;
}

function applyMargins(heading, margins) {
  MARGIN_PROPS.forEach((prop) => {
    const value = margins[prop];
    if (value > 0) {
      heading.style[prop] = `${value}px`;
    }
  });
}

function getMarginCells(row, heading) {
  const propCells = MARGIN_PROPS
    .map((prop) => row.querySelector(`[data-aue-prop="${prop}"]`))
    .filter(Boolean);
  if (propCells.length) return { type: 'props', cells: propCells };

  const numericCells = [...row.children].filter(
    (child) => child !== heading && !child.contains(heading) && isMarginValueCell(child),
  );
  if (numericCells.length >= MARGIN_PROPS.length) {
    return { type: 'delivery', cells: numericCells.slice(0, MARGIN_PROPS.length) };
  }

  return null;
}

function readMargins(row, heading, removeCells) {
  const margins = {};
  let found = false;

  MARGIN_PROPS.forEach((prop) => {
    const value = readMarginProp(row, prop, removeCells);
    if (value !== null) {
      margins[prop] = value;
      found = true;
    }
  });
  if (found) return margins;

  const marginCells = getMarginCells(row, heading);
  if (!marginCells) return null;

  if (marginCells.type === 'delivery') {
    return readDeliveryMargins(marginCells.cells);
  }

  marginCells.cells.forEach((cell, index) => {
    margins[MARGIN_PROPS[index]] = parseMargin(cell.textContent);
    if (removeCells) {
      cell.remove();
    } else {
      cell.classList.add('title-with-margin-config');
    }
  });
  return margins;
}

/**
 * loads and decorates the title-with-margin block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  if (!row) return;

  const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return;

  const removeCells = !isAuthoring();
  const margins = readMargins(row, heading, removeCells);
  if (margins) applyMargins(heading, margins);

  const inner = document.createElement('div');
  inner.className = 'title-with-margin-inner';
  moveInstrumentation(row, inner);
  inner.append(heading);
  block.replaceChildren(inner);
}
