import { defineConfig, type Plugin } from "vite";

const banner = `/*!
 * irrigation-maestro-card
 * Custom Lovelace card for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
`;

/**
 * Prepend the license banner after minification so it survives esbuild.
 */
function bannerPlugin(): Plugin {
  return {
    name: "imc-banner",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = banner + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [bannerPlugin()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "irrigation-maestro-card.js",
    },
    // Emit the bundle directly into the integration's frontend folder.
    outDir: "../custom_components/irrigation_maestro/frontend",
    emptyOutDir: false,
    target: "es2021",
    minify: "esbuild",
    sourcemap: false,
  },
});
