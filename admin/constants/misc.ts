
export const NOMAD_API_DEFAULT_BASE_URL = 'https://api.projectnomad.us'

/**
 * This fork runs a locally built admin image, which the upstream release flow can't
 * update: the sidecar only retags the official image in compose.yml, so it would report
 * success without changing anything. Keeps that flow off. Apps and content are unaffected.
 */
export const IS_CUSTOM_BUILD = true