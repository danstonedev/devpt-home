/** Local capture only: preserve Host so real same-origin API guards remain active. */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nativeConfig from "../../../../simlab/apps/mission-shell/vite.config.ts";
const source = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../simlab",
);
if (
  process.env.SIMLAB_SOURCE_DIR &&
  resolve(process.env.SIMLAB_SOURCE_DIR) !== source
) {
  throw new Error(
    "This preview configuration imports the sibling simlab checkout; SIMLAB_SOURCE_DIR must resolve to it.",
  );
}
const backend = new URL(
  process.env.SIMLAB_LOCAL_API || "http://127.0.0.1:5183",
);
if (
  backend.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(backend.hostname) ||
  backend.pathname !== "/" ||
  backend.username ||
  backend.password ||
  backend.search ||
  backend.hash
)
  throw new Error(
    "Capture API must be an official loopback synthetic backend.",
  );
export default async (environment) => {
  const config = await nativeConfig(environment);
  return {
    ...config,
    root: resolve(source, "apps/mission-shell"),
    preview: {
      ...config.preview,
      proxy: {
        "/api": {
          target: backend.origin,
          changeOrigin: false,
        },
      },
    },
  };
};
