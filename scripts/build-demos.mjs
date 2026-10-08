import { build } from "esbuild";
import { copyFile } from "node:fs/promises";

// Azure serves the checked-in bundle; this command regenerates it from source.
await build({
  entryPoints: ["demos/joint-preview.mjs"],
  outfile: "demos/joint-preview.bundle.js",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  legalComments: "linked",
  sourcemap: false,
});
await copyFile("node_modules/three/LICENSE", "demos/THREE-LICENSE.txt");
console.log("Built the lazy-loaded joint preview.");
