# graham-scan-convex-hull

Computes the convex hull of a set of 2D points using angular sorting and a stack-based scan. Zero dependencies, ESM only.

## Usage

```js
import { convexHull } from 'graham-scan-convex-hull';

const hull = convexHull([
  [0, 0], [4, 0], [2, 2], [0, 4], [4, 4], [1, 1]
]);
// hull: [[0,0], [4,0], [4,4], [0,4]]
```

Each point is `[x, y]` with finite numeric coordinates. The hull is returned in counter-clockwise order, starting from the point with the smallest `y` (ties broken by smallest `x`).

Exports:
- `convexHull(points)` -> `Array<[number, number]>`
- `orientation(a, b, c)` -> `1` (CCW), `-1` (CW), `0` (collinear)
- `areCollinear(a, b, c)` -> `boolean`
- `crossProduct(a, b, c)` -> `number`

## Why

Graham scan is O(n log n) and simple to implement correctly once the anchor and collinear-edge rules are pinned down. This library exists to provide that one careful implementation with no dependency surface — suitable for bundling into tools that only need hull computation and do not want to pull in a full computational-geometry package.

The trade-off: collinear points *on the hull edge* are dropped, so the output is a strict convex hull (vertices only). If you need every boundary point preserved, this is the wrong library — the choice is deliberate and tested.

## Edge cases

- Empty input returns `[]`; one point returns that point; two distinct points return both.
- Duplicate points are deduplicated.
- Fully collinear input collapses to the two extreme points.
- Non-finite coordinates (`NaN`, `Infinity`) and malformed point shapes throw `TypeError`.

## Tests

```sh
node --test
```
