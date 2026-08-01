/** Google Maps review link helpers (mirrors backend `build_gbp_review_url`). */

export function buildGbpReviewUrl(placeId: string | null | undefined): string | null {
  const normalized = placeId?.trim();
  if (!normalized) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(normalized)}`;
}

/** Extract a place id from a Google Maps / share URL pasted by the user. */
export function parsePlaceIdFromMapsUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  if (/^ChIJ[\w-]+$/i.test(value)) return value;

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const placeIdParam =
      url.searchParams.get("placeid") ??
      url.searchParams.get("query_place_id") ??
      url.searchParams.get("cid");
    if (placeIdParam) return placeIdParam;

    const placeIdMatch = url.pathname.match(/place\/[^/]+\/(@[^/]+\/)?(data=.*)?/i);
    if (placeIdMatch) {
      const dataMatch = url.href.match(/!1s(ChIJ[\w-]+)/i);
      if (dataMatch?.[1]) return dataMatch[1];
    }

    const chijInUrl = url.href.match(/(ChIJ[\w-]+)/i);
    if (chijInUrl?.[1]) return chijInUrl[1];
  } catch {
    // Not a URL — fall through.
  }

  if (value.includes("placeid=")) {
    const match = value.match(/placeid=([^&\s]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
}
