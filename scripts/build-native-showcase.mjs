import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(
  process.env.SIMLAB_SOURCE_DIR || resolve(root, "../simlab-native-source"),
);
const shell = resolve(source, "apps/mission-shell");
const pinned = "61a664ca5706c19cddb8842fbfec1f0118121917";
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: source,
  encoding: "utf8",
}).trim();
if (head !== pinned)
  throw new Error(
    `Expected simLAB ${pinned}, found ${head}. Audit a new revision before rebuilding.`,
  );
const sourceState = execFileSync(
  "git",
  ["status", "--porcelain", "--untracked-files=no"],
  { cwd: source, encoding: "utf8" },
).trim();
if (sourceState) throw new Error("Native showcase source must be clean.");
// Vite clears only this explicitly checked, generated output directory.
const output = resolve(root, "showcase");
if (dirname(output) !== root || relative(root, output) !== "showcase")
  throw new Error("Invalid showcase output path.");
await import(
  pathToFileURL(resolve(shell, "scripts/ensure-submodule-svelte-kit.mjs"))
);
const { sharedPoseEngine } = await import(
  pathToFileURL(resolve(shell, "scripts/sharedPoseEngine.ts"))
);
const { aquaticRuntimeAssets } = await import(
  pathToFileURL(resolve(shell, "scripts/aquaticRuntimeAssets.ts"))
);
const aquatic = aquaticRuntimeAssets(source);
const originalAquaticLoad = aquatic.load;
aquatic.load = function (id) {
  const code = originalAquaticLoad.call(this, id);
  return typeof code === "string"
    ? code.replace('"/aquatic-assets/', '"/showcase/aquatic-assets/')
    : code;
};
const aliases = {
  "@simlab": resolve(shell, "src"),
  "@vspx/scenario-engine/scenario": resolve(
    source,
    "scenario-engine/src/scenario.ts",
  ),
  "@vspx/scenario-engine": resolve(source, "scenario-engine/src/index.ts"),
  "@vspx/simvitals/aquatic": resolve(
    source,
    "apps/simvitals/src/lib/native/index.ts",
  ),
  "@vspx/simvitals-physiology": resolve(
    source,
    "apps/simvitals/src/lib/aquatic/aquaticPhysiology.ts",
  ),
  "@vspx/ddx/sampler": resolve(source, "packages/ddx/src/movement/sampler.ts"),
  "@vspx/ddx/joints": resolve(source, "packages/ddx/src/joints/index.ts"),
  "@vspx/ddx/props": resolve(source, "packages/ddx/src/props/layer/index.ts"),
  "@vspx/design-tokens": resolve(source, "packages/design-tokens"),
  "@vspx/body-chart/reviewer": resolve(shell, "src/lib/painMapReviewer.ts"),
  "@vspx/body-chart/lib": resolve(source, "apps/painmap/src/lib"),
  $lib: resolve(source, "apps/painmap/src/lib"),
  "$app/paths": resolve(shell, "src/lib/sveltekit-shims/app-paths.ts"),
  "$app/environment": resolve(
    shell,
    "src/lib/sveltekit-shims/app-environment.ts",
  ),
  "@openai/agents/realtime": resolve(
    source,
    "packages/voice-core/node_modules/@openai/agents/dist/realtime/index.mjs",
  ),
  three: resolve(root, "node_modules/three"),
  "three-mesh-bvh": resolve(root, "node_modules/three-mesh-bvh"),
  "lz-string": resolve(root, "node_modules/lz-string"),
  zod: resolve(root, "node_modules/zod"),
};
for (const name of [
  "ddx",
  "vitals",
  "neuro",
  "voice-core",
  "clinical-contracts",
  "mission-engine",
  "clinical-state",
  "curriculum",
  "ai-providers",
  "missions",
])
  aliases[`@vspx/${name}`] = resolve(source, `packages/${name}/src/index.ts`);
const painAssets = resolve(source, "apps/painmap/static/runtime-assets");
const nativeAssetHosting = {
  name: "devpt:native-asset-hosting",
  transform(code, id) {
    if (
      id.replaceAll("\\", "/").endsWith("/anatomy/runtimeAssets.generated.ts")
    )
      return {
        code: code.replaceAll("/runtime-assets/", "/showcase/runtime-assets/"),
        map: null,
      };
  },
  generateBundle() {
    const files = (dir) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
        item.isDirectory()
          ? files(resolve(dir, item.name))
          : [resolve(dir, item.name)],
      );
    for (const file of files(painAssets))
      this.emitFile({
        type: "asset",
        fileName:
          "runtime-assets/" + relative(painAssets, file).replaceAll("\\", "/"),
        source: readFileSync(file),
      });
  },
};
await build({
  configFile: false,
  logLevel: "warn",
  root: resolve(root, "showcase-src"),
  base: "/showcase/",
  publicDir: false,
  plugins: [sharedPoseEngine(source), aquatic, nativeAssetHosting, svelte()],
  resolve: { alias: aliases, dedupe: ["svelte", "three"] },
  define: { "import.meta.env.VITE_BUILD_SHA": JSON.stringify(head) },
  build: {
    outDir: output,
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
await copyFile(
  resolve(root, "assets/simlab-logo.png"),
  resolve(root, "simlab-logo.png"),
);
const submodules = execFileSync("git", ["submodule", "status", "--recursive"], {
  cwd: source,
  encoding: "utf8",
}).trim();
await writeFile(
  resolve(output, "source.json"),
  JSON.stringify(
    {
      repository: "danstonedev/simlab",
      commit: head,
      submodules,
      components:
        "Native Svelte components and renderer modules; homepage wrapper only.",
    },
    null,
    2,
  ) + "\n",
);
await mkdir(resolve(output, "credits"), { recursive: true });
for (const [name, file] of [
  ["joint-anatomy.md", "src/lib/lab/joints/assets/ATTRIBUTION.md"],
  ["james-morgan.json", "src/lib/ddx/assets/james-morgan.meta.json"],
  ["outpatient-room.json", "src/lib/ddx/assets/clinical-room.meta.json"],
  ["inpatient-room.json", "src/lib/ddx/assets/inpatient-room.meta.json"],
  ["performance-room.json", "src/lib/ddx/assets/performance-gym.meta.json"],
])
  await copyFile(resolve(shell, file), resolve(output, "credits", name));
await copyFile(
  resolve(root, "node_modules/three/LICENSE"),
  resolve(output, "credits/THREE-LICENSE.txt"),
);
await copyFile(
  resolve(root, "node_modules/svelte/LICENSE.md"),
  resolve(output, "credits/SVELTE-LICENSE.md"),
);
console.log(`Native simLAB showcase built from ${head}.`);
