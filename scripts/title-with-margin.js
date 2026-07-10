const TITLE_WITH_MARGIN_MODEL = 'title-with-margin';
const MARGIN_PROPS = ['marginTop', 'marginBottom'];

const MARGIN_VARS = {
  marginTop: '--title-margin-top',
  marginBottom: '--title-margin-bottom',
};

function parseMargin(value) {
  const parsed = Number.parseInt(String(value ?? '0').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isMarginValueCell(element) {
  if (!element?.matches('div')) return false;
  const text = element.textContent.trim();
  return text !== '' && /^\d+$/.test(text);
}

function readMarginProp(container, prop) {
  const field = container.querySelector(`[data-aue-prop="${prop}"]`);
  if (!field) return null;
  const value = parseMargin(field.textContent);
  field.remove();
  return value;
}

function readDeliveryMargins(container, heading) {
  const cells = [...container.children].filter(
    (child) => child !== heading && isMarginValueCell(child),
  );
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
      heading.style.setProperty(MARGIN_VARS[prop], `${value}px`);
    }
  });
}

function decorateTitleWithMarginContainer(container) {
  const heading = container.querySelector(
    ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
  );
  if (!heading) return;

  container.classList.add('title-with-margin');

  const margins = {};
  let hasInstrumentedMargins = false;

  MARGIN_PROPS.forEach((prop) => {
    const value = readMarginProp(container, prop);
    if (value !== null) {
      margins[prop] = value;
      hasInstrumentedMargins = true;
    }
  });

  if (!hasInstrumentedMargins) {
    const deliveryMargins = readDeliveryMargins(container, heading);
    if (!deliveryMargins) return;
    applyMargins(heading, deliveryMargins);
    return;
  }

  applyMargins(heading, margins);
}

/**
 * Applies authorable margins to Title with Margin components only.
 * @param {Element} main The main container element
 */
export default function decorateTitlesWithMargin(main) {
  main.querySelectorAll(`[data-aue-model="${TITLE_WITH_MARGIN_MODEL}"]`)
    .forEach(decorateTitleWithMarginContainer);
}
