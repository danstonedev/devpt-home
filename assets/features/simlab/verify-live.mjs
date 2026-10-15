/** Read public production assets; fail if this clean checkout is not deployed. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const source =
  process.env.SIMLAB_SOURCE_DIR ||
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../../simlab");
const pin = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: source,
  encoding: "utf8",
}).trim();
execFileSync("git", ["diff", "--quiet", "HEAD"], { cwd: source });
const read = (url) =>
  execFileSync(
    "curl",
    ["--silent", "--show-error", "--fail", "--max-time", "30", url],
    { maxBuffer: 32 * 1024 * 1024 },
  );
const origin = "https://lab.devpt.app/";
const html = read(origin).toString("utf8");
const path = html.match(/["'](\/assets\/App-[^"']+\.js)["']/)?.[1];
if (!path)
  throw new Error("The live app entry does not identify a native App bundle.");
const url = new URL(path, origin).href;
const bundle = read(url);
if (!bundle.includes(Buffer.from(pin)))
  throw new Error(
    "The live App bundle does not contain source HEAD. Fetch/review the deployed source before capturing.",
  );
const receipt = {
  url,
  sourceRevision: pin,
  sourceRevisionFoundInBundle: true,
  bundleSha256: createHash("sha256").update(bundle).digest("hex"),
  checkedAt: new Date().toISOString(),
};
const output = process.argv[2] || "/tmp/simlab-live-release-proof.json";
writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ output, ...receipt }, null, 2));
