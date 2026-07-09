const MARGIN_PROPS = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'];

const MARGIN_STYLES = {
  marginTop: 'marginTop',
  marginBottom: 'marginBottom',
  marginLeft: 'marginLeft',
  marginRight: 'marginRight',
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
      heading.style[MARGIN_STYLES[prop]] = `${value}px`;
    }
  });
}

function decorateTitleContainer(container) {
  const heading = container.querySelector(
    ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
  );
  if (!heading) return;

  const margins = {};
  let hasMargins = false;

  MARGIN_PROPS.forEach((prop) => {
    const value = readMarginProp(container, prop);
    if (value !== null) {
      margins[prop] = value;
      hasMargins = true;
    }
  });

  if (!hasMargins) {
    const deliveryMargins = readDeliveryMargins(container, heading);
    if (!deliveryMargins) return;
    applyMargins(heading, deliveryMargins);
    return;
  }

  applyMargins(heading, margins);
}

/**
 * Applies authorable margins to title components.
 * @param {Element} main The main container element
 */
export default function decorateTitles(main) {
  main.querySelectorAll('[data-aue-model="title"]').forEach(decorateTitleContainer);

  main.querySelectorAll('.default-content-wrapper').forEach((wrapper) => {
    if (wrapper.querySelector('[data-aue-model="title"]')) return;
    const heading = wrapper.querySelector(
      ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
    );
    if (!heading) return;
    const deliveryMargins = readDeliveryMargins(wrapper, heading);
    if (deliveryMargins) applyMargins(heading, deliveryMargins);
  });
}
