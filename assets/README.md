# Aegean Fleet assets

Map entities are rendered through the `ASSET_CATALOG` configuration in `index.html`.

The current prototype uses CSS and emoji fallbacks. To replace them later, add transparent PNG or WebP files to this folder and set the relevant `url` value in `ASSET_CATALOG`.

Suggested files:

- `ship-mv-ege.webp` — transparent square canvas, ideally 128×128 px
- `port.webp` — transparent square canvas, ideally 64×64 px

Example:

```js
ship: {
  url: 'assets/ship-mv-ege.webp',
  fallbackHtml: '⛴',
  className: 'ship-icon',
  size: [34, 34],
  anchor: [17, 17]
}
```

Keep the subject centered with transparent padding. The simulation position and route logic are separate from the visual asset, so sprites can be swapped without changing gameplay code.

Current top-down ferry sprites:

- `coastal-ferry-60-topdown.png` — 60-seat ferry, red, bow points right.
- `aegean-swift-80-topdown.png` — 80-seat fast ferry, yellow, bow points right.

Both use a centered 256×256 transparent canvas. The renderer rotates the right-facing source image continuously from the route bearing.