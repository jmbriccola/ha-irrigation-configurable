import { defineConfig } from "vite";
import { bannerPlugin } from "./vite.banner";

export default defineConfig({
  plugins: [bannerPlugin()],
  build: {
    lib: {
      entry: "src/panel/index.ts",
      formats: ["es"],
      fileName: () => "irrigation-maestro-panel.js",
    },
    outDir: "../custom_components/irrigation_maestro/frontend",
    emptyOutDir: false,
    target: "es2021",
    minify: "esbuild",
    sourcemap: false,
  },
});
