/**
 * Graham Scan convex hull for 2D points.
 *
 * Each point is [x, y] where x and y are finite numbers.
 * Returns the hull in counter-clockwise order, starting from the point with
 * the smallest lexicographic (y, then x) value. Collinear hull-edge points are
 * dropped, so a perfectly collinear input yields only the two extreme points.
 *
 * Why lexicographic anchor instead of "lowest y, break ties by lowest x"?
 * The two are the same rule; we just make the (y, x) tuple comparison explicit
 * so the anchor is unambiguous and testable.
 */

/**
 * Sign of the cross product of vectors BA and BC.
 *  > 0  => C lies to the left of BA (counter-clockwise turn at B)
 *  < 0  => C lies to the right of BA (clockwise turn)
 *  0    => A, B, C are collinear
 *
 * We deliberately return only the sign, never the magnitude: callers need the
 * orientation, and returning the raw cross product tempts tests into exact
 * float comparisons that break on near-collinear inputs.
 */
export function orientation(a, b, c) {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (cross > 0) return 1;
  if (cross < 0) return -1;
  return 0;
}

/** Raw cross product magnitude, exposed for callers that need it. */
export function crossProduct(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/** True iff a, b, c lie on a single line. */
export function areCollinear(a, b, c) {
  return orientation(a, b, c) === 0;
}

/**
 * Square distance. We never take the square root because callers only compare
 * distances, and avoiding sqrt keeps the result exact for integer inputs.
 */
function squaredDistance(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return dx * dx + dy * dy;
}

/**
 * Computes the convex hull of a set of 2D points using the Graham Scan.
 *
 * @param {Array<[number, number]>} points - Input points.
 * @returns {Array<[number, number]>} Hull vertices in counter-clockwise order.
 */
export function convexHull(points) {
  if (!Array.isArray(points)) {
    throw new TypeError('convexHull expects an array of [x, y] points');
  }
  // Validate eagerly so failures point at the bad input, not at a confusing
  // comparator deep inside the sort.
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Array.isArray(p) || p.length !== 2
        || typeof p[0] !== 'number' || typeof p[1] !== 'number'
        || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      throw new TypeError(`points[${i}] must be [finiteNumber, finiteNumber]`);
    }
  }

  // De-duplicate by value. Two identical points would otherwise make the
  // angular sort tie-break on distance equal, which is fine, but duplicates on
  // the hull edge silently inflate the output — we remove them up front.
  const seen = new Set();
  const unique = [];
  for (const p of points) {
    const key = p[0] + ',' + p[1];
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  const n = unique.length;
  if (n <= 2) return unique.slice();

  // Anchor: smallest y, breaking ties by smallest x. This point is on the hull
  // and every other point lies in the upper half-plane relative to it, which is
  // what makes a single CCW sweep work.
  let anchorIdx = 0;
  for (let i = 1; i < n; i++) {
    const a = unique[anchorIdx];
    const b = unique[i];
    if (b[1] < a[1] || (b[1] === a[1] && b[0] < a[0])) {
      anchorIdx = i;
    }
  }
  const anchor = unique[anchorIdx];

  // Sort by polar angle around the anchor. Ties (same angle) keep the closer
  // point first; the scan then pops the nearer one so only the farthest along
  // each ray survives on the hull.
  const rest = unique.filter((_, i) => i !== anchorIdx);
  rest.sort((p, q) => {
    const o = orientation(anchor, p, q);
    if (o !== 0) return -o; // CCW first
    return squaredDistance(anchor, p) - squaredDistance(anchor, q);
  });

  // Remove intermediate collinear points before scanning. After the sort they
  // form contiguous runs ordered by distance, so a single pass suffices.
  const pruned = [];
  for (let i = 0; i < rest.length; i++) {
    const cur = rest[i];
    const nxt = rest[(i + 1) % rest.length];
    if (pruned.length > 0 && orientation(anchor, pruned[pruned.length - 1], cur) === 0) {
      // same ray as previous; keep only the farthest, which is cur since sort
      // ordered by ascending distance
      pruned[pruned.length - 1] = cur;
      continue;
    }
    pruned.push(cur);
  }

  if (pruned.length < 2) return [anchor, ...pruned];

  // Graham scan with a stack: pop whenever the top two points and the new
  // candidate do not make a left (CCW) turn.
  const stack = [anchor, pruned[0]];
  for (let i = 1; i < pruned.length; i++) {
    let top = stack[stack.length - 1];
    let below = stack[stack.length - 2];
    while (stack.length >= 2 && orientation(below, top, pruned[i]) !== 1) {
      stack.pop();
      top = below;
      below = stack[stack.length - 2];
    }
    stack.push(pruned[i]);
  }

  return stack;
}
