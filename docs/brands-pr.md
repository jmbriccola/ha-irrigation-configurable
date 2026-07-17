# home-assistant/brands submission

The HACS action validates that the domain exists in the
[home-assistant/brands](https://github.com/home-assistant/brands) repository.
Until the PR below is merged, CI keeps `ignore: brands` in
`.github/workflows/validate.yml` (remove it afterwards).

## Steps

1. Fork `home-assistant/brands`.
2. Create `custom_integrations/irrigation_maestro/` containing the files from
   [`docs/brands/irrigation_maestro/`](brands/irrigation_maestro/):
   - `icon.png` (256×256) and `icon@2x.png` (512×512)
   - `logo.png` / `logo@2x.png` (optional; same artwork here)
3. Open a PR titled `Add irrigation_maestro (custom integration)`.
4. After the merge, delete the `ignore: brands` line from the HACS workflow.

The bundled artwork is a simple generated placeholder (water drop over field
rows, transparent background) — feel free to replace it with real artwork of
the same sizes before submitting.
