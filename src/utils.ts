export const constructSearchUrl = (
  keyword: string,
  selectedUrls: Set<string>,
  engine: "google" | "bing"
): string => {
  const siteQuery = Array.from(selectedUrls)
    .map((url) => {
      const domain = new URL(url).hostname
      return `site:${domain}`
    })
    .join(" OR ")
  const searchQuery = `${keyword} ${siteQuery}`
  return engine === "google"
    ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
    : `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`
}
