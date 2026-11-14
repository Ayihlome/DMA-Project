// How fresh a suppliers prices are.
// Thresholds suit weekly price lists: a week is fine, a month is old.

export const FRESHNESS_DAYS = { fresh: 7, stale: 30 };

// Status -> the semantic tone the v2 screens colour by (keep real colours in the theme).
export const FRESHNESS_TONE = {
  fresh: "good",
  stale: "warn",
  old: "bad",
  unknown: "muted",
};

export function freshness(isoDate, now = new Date()) {
  if (!isoDate) return { status: "unknown", days: null, label: "no date yet" };
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) {
    return { status: "unknown", days: null, label: "no date yet" };
  }

  const days = Math.max(0, Math.floor((now - then) / 86_400_000));
  const status =
    days <= FRESHNESS_DAYS.fresh
      ? "fresh"
      : days <= FRESHNESS_DAYS.stale
        ? "stale"
        : "old";

  return { status, days, label: updatedLabel(days) };
}

function updatedLabel(days) {
  if (days === 0) return "updated today";
  if (days === 1) return "updated yesterday";
  if (days < 7) return `updated ${days} days ago`;
  if (days < 14) return "updated 1 week ago";
  if (days < 30) return `updated ${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "updated 1 month ago";
  return `updated ${Math.floor(days / 30)} months ago`;
}
