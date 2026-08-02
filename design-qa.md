# Carcarah brand and hero design QA

- Brand source visual: `C:\carcarah\src\app\carcarah.png`
- Hero source visual: `C:\carcarah\src\app\carcarah_hero.png`
- Desktop implementation: `C:\carcarah\output\carcarah-hero-desktop.png`
- Mobile implementation: `C:\carcarah\output\carcarah-hero-mobile.png`
- Brand focused comparison: `C:\carcarah\output\carcarah-logo-comparison.png`
- Hero focused comparison: `C:\carcarah\output\carcarah-hero-comparison.png`
- Brand source pixels: 1337 × 1177
- Hero source pixels: 1536 × 1024
- Desktop CSS viewport: 1280 × 800; captured pixels: 1265 × 791; device scale factor: 1
- Mobile CSS viewport: 390 × 844; captured pixels: 375 × 811; device scale factor: 1
- State: homepage, dark system color scheme, header and hero visible

## Full-view comparison evidence

The desktop capture shows the hero as a balanced two-column composition: the original heading and supporting copy remain the primary message, while the supplied eagle image occupies the right column at its native 3:2 aspect ratio. The metrics remain visible in the first desktop viewport.

The mobile capture shows the intended responsive stack: copy first, supplied hero image second, metrics third. The image remains fully visible, does not cause horizontal overflow, and does not collide with the sticky header or demo label.

## Focused comparison evidence

The brand comparison confirms that the complete `carcarah.png` artwork is visible in the header without cropping, inversion, or replacement. The favicon, public mark, and brand source are byte-identical (SHA-256 `C252799DCF7C13CFF010538AB6F09F175E2182B2994C6808AA39EC8364FA8702`).

The hero comparison places `carcarah_hero.png` beside the rendered hero region. The eagle silhouette, eye, beak, black field, proportions, and focal position remain intact. The browser serves a 500 × 333 optimized image at approximately 468 × 312 CSS pixels on desktop, so the delivered raster remains at or above its rendered size.

## Required fidelity surfaces

- Fonts and typography: unchanged; Geist family, heading weight, line height, and letter spacing preserve the existing Carcarah hierarchy on both breakpoints.
- Spacing and layout rhythm: desktop uses a balanced copy/image grid with a responsive gap; mobile stacks at 900 px and keeps consistent vertical rhythm before the metrics.
- Colors and visual tokens: the supplied image supplies its own black-and-white treatment; existing background, border, accent, and text tokens remain unchanged.
- Image quality and asset fidelity: both supplied files are imported as real raster assets. The hero keeps its native 3:2 ratio, uses no filter or synthetic recreation, and remains sharp at the rendered size.
- Copy and content: all hero copy, metrics, navigation labels, and dashboard content remain unchanged.

## Comparison history

### Iteration 1 — brand asset

- Earlier finding [P1]: the first brand implementation used a centered square crop, which did not satisfy the requirement to use the exact source image.
- Fix made: imported `src/app/carcarah.png` directly in the header, preserved its aspect ratio, and copied it byte for byte to the favicon and public mark paths.
- Post-fix evidence: the brand comparison, desktop/mobile captures, and matching SHA-256 hashes show the original image is used without content changes.

### Iteration 2 — hero placement

- Initial hero placement produced no actionable P0, P1, or P2 findings.
- Post-implementation evidence: the desktop and mobile captures show the supplied image at the intended hierarchy, without overflow, distortion, or hidden dashboard controls.

## Interaction and runtime checks

- Brand link previously tested from a leak detail page and returned to `/`.
- Hero image completed loading in desktop and mobile states.
- Mobile horizontal overflow check: false.
- Browser console errors: none.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

No P3 polish is required for the requested scope.

final result: passed
