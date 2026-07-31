import fetchJson from './fetch-json.js';
import { toSafeSameOriginFetchUrl } from './search-api.js';

const DEFAULT_MOCK_SOURCE = '/drafts/mock-package-tracking.json';
const TRACKING_NUMBER_PATTERN = /^(\d{12}|[A-Za-z]{3}\d{8})$/;

/**
 * Validates a tracking number (12 digits or 3 letters + 8 digits).
 * @param {string} value user input
 * @returns {boolean}
 */
export function isValidTrackingNumber(value) {
  return TRACKING_NUMBER_PATTERN.test(String(value || '').trim());
}

/**
 * Normalizes a tracking number for API requests.
 * @param {string} value user input
 * @returns {string}
 */
export function normalizeTrackingNumber(value) {
  const trimmed = String(value || '').trim();
  if (/^[A-Za-z]{3}\d{8}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * Builds a tracking API URL with the tracking number query param.
 * @param {string} endpoint base API URL
 * @param {string} trackingNumber normalized tracking number
 * @returns {string}
 */
function buildTrackingApiUrl(endpoint, trackingNumber) {
  const safeEndpoint = toSafeSameOriginFetchUrl(endpoint);
  if (!safeEndpoint) return '';

  const url = new URL(safeEndpoint);
  url.searchParams.set('trackingNumber', trackingNumber);
  return url.toString();
}

/**
 * Fetches tracking data from the configured API or mock fallback.
 * @param {string} endpoint optional tracking API URL
 * @param {string} trackingNumber normalized tracking number
 * @returns {Promise<object|null>}
 */
export async function fetchTrackingData(endpoint, trackingNumber) {
  const apiUrl = buildTrackingApiUrl(endpoint, trackingNumber);
  if (apiUrl) {
    const json = await fetchJson(apiUrl);
    if (json) return json;
  }

  const mockUrl = toSafeSameOriginFetchUrl(DEFAULT_MOCK_SOURCE, DEFAULT_MOCK_SOURCE);
  if (!mockUrl) return null;

  return fetchJson(mockUrl);
}

/**
 * Extracts shipment summary from a tracking API response.
 * @param {object} data tracking API response
 * @returns {object|null}
 */
export function extractShipmentSummary(data) {
  const consignment = data?.consignmentSet?.[0];
  if (!consignment) return null;

  const pkg = consignment.packageSet?.[0];
  if (!pkg) {
    return {
      consignmentId: consignment.consignmentId,
      recipientName: consignment.recipientName,
      senderName: consignment.senderName,
    };
  }

  return {
    consignmentId: consignment.consignmentId || pkg.packageNumber,
    packageNumber: pkg.packageNumber,
    productName: pkg.productName,
    statusDescription: pkg.statusDescription,
    recipientName: pkg.recipientName || consignment.recipientName,
    senderName: pkg.senderName || consignment.senderName,
    estimatedDelivery: pkg.dateOfEstimatedDelivery,
    deliveryWindow: pkg.estimatedTimeSpanOfDelivery,
  };
}

/**
 * Formats a tracking event location string.
 * @param {object} event tracking event
 * @returns {string}
 */
function formatEventLocation(event) {
  const parts = [
    event.city,
    event.postalCode,
    event.country || event.countryCode,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Extracts all courier tracking events from a tracking API response.
 * @param {object} data tracking API response
 * @returns {object[]}
 */
export function extractTrackingEvents(data) {
  const events = [];
  (data?.consignmentSet || []).forEach((consignment) => {
    (consignment.packageSet || []).forEach((pkg) => {
      (pkg.eventSet || []).forEach((event, index) => {
        events.push({
          id: `${pkg.packageNumber || consignment.consignmentId}-${index}`,
          displayTime: event.displayTime || event.eventTime || event.date || '',
          status: event.statusDescription || event.description || event.unitType || '',
          location: formatEventLocation(event),
          unitType: event.unitType || '',
          unitId: event.unitId || '',
          packageNumber: pkg.packageNumber,
          productName: pkg.productName,
        });
      });
    });
  });
  return events;
}
