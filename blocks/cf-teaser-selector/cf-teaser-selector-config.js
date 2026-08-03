/**
 * AEM Content Fragment GraphQL configuration for the CF Teaser Selector block.
 * Update these values to match your AEM Cloud Service environment.
 */
const DEFAULTS = {
  aemAuthorUrl: 'https://author-p87305-e741707.adobeaemcloud.com',
  aemPublishUrl: 'https://publish-p87305-e741707.adobeaemcloud.com',
  persistedGraphQlQuery: '/graphql/execute.json/ntt-eds/teaserByPath',
  graphQlResultKey: 'teaserCfModelByPath',
  mockApiEndpoint: '/drafts/mock-teaser-cf.json',
};

/**
 * Returns AEM host and GraphQL settings for CF teaser fetches.
 * @returns {object} configuration
 */
export default function getCfTeaserConfig() {
  return { ...DEFAULTS };
}
