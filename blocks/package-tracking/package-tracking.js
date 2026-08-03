import {
  extractShipmentSummary,
  extractTrackingEvents,
  fetchTrackingData,
  isValidTrackingNumber,
  normalizeTrackingNumber,
} from '../../scripts/api/package-tracking-api.js';
import readPackageTrackingConfig from './package-tracking-config.js';

function appendSummaryItem(list, label, value) {
  if (!value) return;

  const dt = document.createElement('dt');
  dt.textContent = label;

  const dd = document.createElement('dd');
  dd.textContent = value;

  list.append(dt, dd);
}

function renderSummary(summary) {
  const section = document.createElement('section');
  section.className = 'package-tracking-summary';
  section.setAttribute('aria-label', 'Shipment summary');

  const list = document.createElement('dl');
  list.className = 'package-tracking-summary-list';

  appendSummaryItem(list, 'Tracking number', summary.consignmentId || summary.packageNumber);
  appendSummaryItem(list, 'Product', summary.productName);
  appendSummaryItem(list, 'Status', summary.statusDescription);
  appendSummaryItem(list, 'From', summary.senderName);
  appendSummaryItem(list, 'To', summary.recipientName);
  appendSummaryItem(list, 'Estimated delivery', summary.estimatedDelivery);

  if (summary.deliveryWindow?.startTime && summary.deliveryWindow?.endTime) {
    appendSummaryItem(
      list,
      'Delivery window',
      `${summary.deliveryWindow.startTime} – ${summary.deliveryWindow.endTime}`,
    );
  }

  section.append(list);
  return section;
}

function renderEvent(event, isFirst) {
  const li = document.createElement('li');
  li.className = 'package-tracking-event';

  const marker = document.createElement('span');
  marker.className = 'package-tracking-event-marker';
  marker.setAttribute('aria-hidden', 'true');
  if (isFirst) marker.classList.add('is-current');

  const content = document.createElement('div');
  content.className = 'package-tracking-event-content';

  if (event.displayTime) {
    const time = document.createElement('p');
    time.className = 'package-tracking-event-time';
    time.textContent = event.displayTime;
    content.append(time);
  }

  if (event.status) {
    const status = document.createElement('p');
    status.className = 'package-tracking-event-status';
    status.textContent = event.status;
    content.append(status);
  }

  if (event.location) {
    const location = document.createElement('p');
    location.className = 'package-tracking-event-location';
    location.textContent = event.location;
    content.append(location);
  }

  if (event.unitType || event.unitId) {
    const meta = document.createElement('p');
    meta.className = 'package-tracking-event-meta';
    meta.textContent = [event.unitType, event.unitId].filter(Boolean).join(' · ');
    content.append(meta);
  }

  li.append(marker, content);
  return li;
}

function renderEvents(events, labels) {
  const section = document.createElement('section');
  section.className = 'package-tracking-events';

  const heading = document.createElement('h3');
  heading.className = 'package-tracking-events-title';
  heading.textContent = labels.eventsTitle || 'Tracking history';
  section.append(heading);

  const list = document.createElement('ol');
  list.className = 'package-tracking-events-list';

  events.forEach((event, index) => {
    list.append(renderEvent(event, index === 0));
  });

  section.append(list);
  return section;
}

function setFieldError(input, errorEl, message) {
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}

function createTrackingForm(config, labels, onTrack) {
  const form = document.createElement('form');
  form.className = 'package-tracking-form';
  form.noValidate = true;

  const field = document.createElement('div');
  field.className = 'package-tracking-field';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'package-tracking-input';
  input.name = 'trackingNumber';
  input.autocomplete = 'off';
  input.inputMode = 'text';
  input.maxLength = 12;
  input.placeholder = config.inputPlaceholder;
  input.setAttribute('aria-label', config.inputPlaceholder);

  const error = document.createElement('p');
  error.className = 'package-tracking-error';
  error.id = `package-tracking-error-${Math.random().toString(36).slice(2, 9)}`;
  error.hidden = true;
  error.setAttribute('role', 'alert');
  input.setAttribute('aria-describedby', error.id);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'button primary package-tracking-submit';
  button.textContent = config.buttonLabel;

  field.append(input, error);
  form.append(field, button);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const trackingNumber = normalizeTrackingNumber(input.value);

    if (!isValidTrackingNumber(trackingNumber)) {
      setFieldError(input, error, labels.invalidTrackingNumber
        || 'Enter a 12-digit number or a waybill starting with 3 letters followed by 8 digits.');
      return;
    }

    setFieldError(input, error, '');
    button.disabled = true;
    await onTrack(trackingNumber);
    button.disabled = false;
  });

  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      setFieldError(input, error, '');
    }
  });

  return { form, input, error };
}

/**
 * loads and decorates the package tracking block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readPackageTrackingConfig(block);
  const labels = {
    invalidTrackingNumber: 'Enter a 12-digit number or a waybill starting with 3 letters followed by 8 digits.',
    eventsTitle: 'Tracking history',
    noEvents: 'No tracking events found for this number.',
    loading: 'Fetching tracking information...',
    error: 'Unable to retrieve tracking information. Please try again.',
  };

  block.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'package-tracking-inner';

  const heading = document.createElement('h2');
  heading.className = 'package-tracking-heading';
  heading.textContent = config.heading;
  wrapper.append(heading);

  const results = document.createElement('div');
  results.className = 'package-tracking-results';
  results.hidden = true;

  const renderResults = async (trackingNumber) => {
    results.hidden = false;
    results.innerHTML = '';
    results.dataset.loading = 'true';

    const loading = document.createElement('p');
    loading.className = 'package-tracking-status';
    loading.textContent = labels.loading;
    results.append(loading);

    const data = await fetchTrackingData(config.trackingApiEndpoint, trackingNumber);
    delete results.dataset.loading;

    if (!data) {
      const errorMessage = document.createElement('p');
      errorMessage.className = 'package-tracking-status package-tracking-status-error';
      errorMessage.textContent = labels.error;
      results.replaceChildren(errorMessage);
      return;
    }

    const summary = extractShipmentSummary(data);
    const events = extractTrackingEvents(data);
    const fragment = document.createDocumentFragment();

    if (summary) fragment.append(renderSummary(summary));

    if (events.length) {
      fragment.append(renderEvents(events, labels));
    } else {
      const empty = document.createElement('p');
      empty.className = 'package-tracking-status';
      empty.textContent = labels.noEvents;
      fragment.append(empty);
    }

    results.replaceChildren(fragment);
  };

  const { form } = createTrackingForm(config, labels, renderResults);
  wrapper.append(form, results);
  block.append(wrapper);
}
