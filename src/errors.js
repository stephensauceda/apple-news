export class AppleNewsApiError extends Error {
  /**
   * @param {string} message
   * @param {Object} details
   * @param {number} details.status
   * @param {string} details.method
   * @param {string} details.url
   * @param {unknown[]} [details.apiErrors]
   * @param {unknown} [details.responseBody]
   */
  constructor(message, details) {
    super(message)
    this.name = new.target.name
    this.status = details.status
    this.method = details.method
    this.url = details.url
    this.apiErrors = details.apiErrors
    this.responseBody = details.responseBody
  }
}

export class AppleNewsValidationError extends AppleNewsApiError {}
export class AppleNewsAuthError extends AppleNewsApiError {}
export class AppleNewsNotFoundError extends AppleNewsApiError {}
export class AppleNewsConflictError extends AppleNewsApiError {}
export class AppleNewsRateLimitError extends AppleNewsApiError {}
export class AppleNewsServiceError extends AppleNewsApiError {}

/**
 * @param {number} status
 * @returns {typeof AppleNewsApiError}
 */
export function getAppleNewsApiErrorClass(status) {
  if (status === 400) {
    return AppleNewsValidationError
  }

  if (status === 401 || status === 403) {
    return AppleNewsAuthError
  }

  if (status === 404) {
    return AppleNewsNotFoundError
  }

  if (status === 409) {
    return AppleNewsConflictError
  }

  if (status === 429) {
    return AppleNewsRateLimitError
  }

  if (status >= 500 && status < 600) {
    return AppleNewsServiceError
  }

  return AppleNewsApiError
}