/**
 * Batch URL processor utility.
 *
 * Extracts the batch URL processing logic into a testable function
 * that processes all URLs without stopping on individual failures.
 */

export interface BatchUrlResult {
  url: string
  success: boolean
  title?: string
  error?: string
}

export type UrlProcessor = (url: string) => Promise<{ title?: string }>

/**
 * Process an array of URLs using the provided processor function.
 * Never stops on individual failures — all URLs are processed.
 *
 * @param urls - Array of URLs to process
 * @param processor - Async function that processes a single URL
 * @returns Array of results for ALL input URLs
 */
export async function processBatchUrls(
  urls: string[],
  processor: UrlProcessor
): Promise<BatchUrlResult[]> {
  const results: BatchUrlResult[] = []

  for (const url of urls) {
    try {
      const result = await processor(url)
      results.push({
        url,
        success: true,
        title: result.title
      })
    } catch (err) {
      results.push({
        url,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return results
}
