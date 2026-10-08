#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const REMOTE = "origin";
const BRANCH = "main";
const UPSTREAM = `${REMOTE}/${BRANCH}`;
const preview = process.argv.includes("--preview");

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", options.quiet ? "ignore" : "pipe"],
  }).trim();
}

function log(message) {
  console.log(`[home freshness guard] ${message}`);
}

function fail(message, fix = []) {
  console.error("\n[home freshness guard] Refusing to serve a stale homepage.");
  console.error(`[home freshness guard] ${message}`);
  if (fix.length > 0) {
    console.error("\nFix:");
    for (const line of fix) console.error(`  ${line}`);
  }
  console.error("\nThis repo intentionally has no stale-local bypass.\n");
  process.exit(1);
}

try {
  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  process.chdir(repoRoot);
} catch {
  fail("This command must be run inside the danstonedev/home repository.");
}

let currentBranch = "";
try {
  currentBranch = git(["branch", "--show-current"]);
} catch {
  fail("Could not determine the current Git branch.");
}

if (currentBranch !== BRANCH && !preview) {
  fail(
    `Current branch is '${currentBranch || "(detached)"}', expected '${BRANCH}'.`,
    [`git switch ${BRANCH}`, "npm start"],
  );
}

let dirty = "";
try {
  dirty = git(["status", "--porcelain"]);
} catch {
  fail("Could not inspect the working tree.");
}

if (dirty && !preview) {
  fail(
    "Working tree has local changes. Commit, stash, or discard them before serving localhost.",
    ["git status --short"],
  );
}

try {
  git(["fetch", "--quiet", REMOTE, BRANCH], { quiet: true });
} catch {
  fail(
    `Could not fetch ${UPSTREAM}; refusing to serve because freshness cannot be verified.`,
    [`git fetch ${REMOTE} ${BRANCH}`, "npm start"],
  );
}

try {
  const unmerged = git(["diff", "--name-only", "--diff-filter=U"]);
  if (unmerged)
    fail(
      "The working tree has unresolved merge conflicts. Resolve them before serving.",
    );
} catch {
  fail("Could not check for unresolved merge conflicts.");
}

// Draft previews may contain intentional edits, but must include the latest
// production source. The ordinary `npm start` guard remains strict.
if (preview) {
  try {
    git(["merge-base", "--is-ancestor", UPSTREAM, "HEAD"]);
  } catch {
    fail(
      `This draft does not include the latest ${UPSTREAM}. Update the branch before previewing.`,
    );
  }
  log(
    `Draft preview on ${currentBranch || "(detached)"} includes ${UPSTREAM} at ${git(["rev-parse", UPSTREAM]).slice(0, 7)}. Local edits are shown; this is not production.`,
  );
  process.exit(0);
}

function refs() {
  const head = git(["rev-parse", "HEAD"]);
  const upstream = git(["rev-parse", UPSTREAM]);
  const base = git(["merge-base", "HEAD", UPSTREAM]);
  return { head, upstream, base };
}

let { head, upstream, base } = refs();

if (head !== upstream && base === head) {
  log(
    `Local ${BRANCH} is behind ${UPSTREAM}; fast-forwarding to ${upstream.slice(0, 7)}.`,
  );
  try {
    git(["merge", "--ff-only", UPSTREAM]);
  } catch {
    fail(`Could not fast-forward local ${BRANCH} to ${UPSTREAM}.`, [
      `git fetch ${REMOTE}`,
      `git switch ${BRANCH}`,
      "git pull --ff-only",
      "npm start",
    ]);
  }
  ({ head, upstream, base } = refs());
}

if (head !== upstream) {
  const direction = base === upstream ? "ahead of" : "diverged from";
  fail(
    `Local HEAD ${head.slice(0, 7)} is ${direction} ${UPSTREAM} ${upstream.slice(0, 7)}.`,
    [
      `git fetch ${REMOTE}`,
      `git switch ${BRANCH}`,
      "git pull --ff-only",
      "npm start",
    ],
  );
}

log(`OK: local ${BRANCH} matches ${UPSTREAM} at ${upstream.slice(0, 7)}.`);
