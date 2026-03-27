#!/usr/bin/env node

/**
 * Synchronizes version across package.json, tauri.conf.json, and Cargo.toml.
 *
 * Usage:
 *   node scripts/bump-version.mjs patch    # 0.1.0 → 0.1.1
 *   node scripts/bump-version.mjs minor    # 0.1.0 → 0.2.0
 *   node scripts/bump-version.mjs major    # 0.1.0 → 1.0.0
 *   node scripts/bump-version.mjs 0.2.0    # explicit version
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const FILES = {
  package: resolve(root, "package.json"),
  tauri: resolve(root, "src-tauri/tauri.conf.json"),
  cargo: resolve(root, "src-tauri/Cargo.toml"),
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+$/.test(type)) return type;
      console.error(`Invalid version or bump type: ${type}`);
      process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────────────

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node bump-version.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

const pkg = readJson(FILES.package);
const currentVersion = pkg.version;
const newVersion = bumpVersion(currentVersion, arg);

console.log(`Bumping version: ${currentVersion} → ${newVersion}`);

// 1. package.json
pkg.version = newVersion;
writeJson(FILES.package, pkg);
console.log(`  ✓ package.json`);

// 2. tauri.conf.json
const tauri = readJson(FILES.tauri);
tauri.version = newVersion;
writeJson(FILES.tauri, tauri);
console.log(`  ✓ tauri.conf.json`);

// 3. Cargo.toml
let cargo = readFileSync(FILES.cargo, "utf-8");
cargo = cargo.replace(
  /^version\s*=\s*"[^"]+"/m,
  `version = "${newVersion}"`,
);
writeFileSync(FILES.cargo, cargo);
console.log(`  ✓ Cargo.toml`);

console.log(`\nNext steps:`);
console.log(`  git add -A && git commit -m "chore: release v${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin main --tags`);
