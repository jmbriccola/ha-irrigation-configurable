import type { Plugin } from "vite";

const banner = `/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
`;

/** Prepend the license banner after minification so it survives esbuild. */
export function bannerPlugin(): Plugin {
  return {
    name: "imc-banner",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") chunk.code = banner + chunk.code;
      }
    },
  };
}
