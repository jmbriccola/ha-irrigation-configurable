# Irrigation Maestro Card

Custom Lovelace card for the Irrigation Maestro integration. Lit 3 +
TypeScript, bundled with Vite into a single self-contained ES module.

The entity/service contract the card implements is documented in
[`docs/design/card-contract.md`](../docs/design/card-contract.md).

## Development

```bash
cd card
npm ci            # install pinned dependencies
npm run build     # bundle to ../custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js
npm run dev       # same build, in watch mode
npm run typecheck # tsc --noEmit (strict)
```

`npm run build` writes the production bundle directly into the
integration's `frontend/` folder — that generated file is committed so
the integration ships it as-is. There is no dev server: point a Home
Assistant instance at the built file (register it as a Lovelace
resource or let the integration serve it) and rebuild with `npm run
dev` while iterating.

## Source layout

| File | Purpose |
|---|---|
| `src/index.ts` | entry point, `window.customCards` registration |
| `src/card.ts` | main `irrigation-maestro-card` element |
| `src/editor.ts` | `irrigation-maestro-card-editor` visual editor |
| `src/zone-row.ts` | one zone: state, progress, controls, cycle details |
| `src/curve-sparkline.ts` | read-only SVG sparkline of a cycle curve |
| `src/global-controls.ts` | run all / stop all / evaluate / global pause |
| `src/discovery.ts` | attribute-based entity discovery (`maestro_role`) |
| `src/format.ts` | Intl formatting, run progress, trigger descriptions |
| `src/localize/` | `en` + `it` dictionaries and lookup helpers |
| `src/types.ts` | contract types and defensive parsing helpers |
