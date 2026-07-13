const TITLE_WITH_MARGIN_MODEL = 'title-with-margin';
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

function readDeliveryMargins(container, heading, removeCells) {
  const cells = [...container.children].filter(
    (child) => child !== heading && isMarginValueCell(child),
  );
  if (cells.length < MARGIN_PROPS.length) return null;

  const margins = {};
  MARGIN_PROPS.forEach((prop, index) => {
    margins[prop] = parseMargin(cells[index].textContent);
    if (removeCells) {
      cells[index].remove();
    } else {
      cells[index].classList.add('title-with-margin-config');
    }
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

function readMargins(container, heading, removeCells) {
  const margins = {};
  let hasInstrumentedMargins = false;

  MARGIN_PROPS.forEach((prop) => {
    const value = readMarginProp(container, prop, removeCells);
    if (value !== null) {
      margins[prop] = value;
      hasInstrumentedMargins = true;
    }
  });

  if (!hasInstrumentedMargins) {
    return readDeliveryMargins(container, heading, removeCells);
  }

  return margins;
}

function decorateLegacyTitleWithMargin(container) {
  const heading = container.querySelector(
    ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
  );
  if (!heading) return;

  container.classList.add('title-with-margin');

  const removeCells = !isAuthoring();
  const margins = readMargins(container, heading, removeCells);
  if (margins) applyMargins(heading, margins);
}

function findLegacyContainers(main) {
  const containers = new Set();

  main.querySelectorAll(`[data-aue-model="${TITLE_WITH_MARGIN_MODEL}"]:not(.block)`)
    .forEach((container) => containers.add(container));

  main.querySelectorAll('[data-aue-prop="marginTop"], [data-aue-prop="marginBottom"]')
    .forEach((field) => {
      const container = field.closest(`[data-aue-model="${TITLE_WITH_MARGIN_MODEL}"]`)
        || field.parentElement;
      if (container && !container.classList.contains('title-with-margin')) {
        containers.add(container);
      }
    });

  main.querySelectorAll('.default-content-wrapper').forEach((wrapper) => {
    if (wrapper.closest('.title-with-margin')) return;
    const heading = wrapper.querySelector(
      ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
    );
    if (!heading) return;
    const marginCells = [...wrapper.children].filter(
      (child) => child !== heading && isMarginValueCell(child),
    );
    if (marginCells.length >= MARGIN_PROPS.length) {
      containers.add(wrapper);
    }
  });

  return [...containers];
}

/**
 * Decorates legacy default-content Title with Margin instances.
 * New content should use the title-with-margin block instead.
 * @param {Element} main The main container element
 */
export default function decorateTitlesWithMargin(main) {
  findLegacyContainers(main).forEach(decorateLegacyTitleWithMargin);
}
