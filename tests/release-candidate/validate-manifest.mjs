#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateReleaseCandidateManifest } from "./manifest.mjs";

const file = process.argv[2];
if (!file) {
  process.stderr.write("Uso: node tests/release-candidate/validate-manifest.mjs <manifest.json>\n");
  process.exit(2);
}

try {
  const manifest = JSON.parse(await readFile(file, "utf8"));
  const errors = validateReleaseCandidateManifest(manifest);
  if (errors.length) {
    process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write("RC manifest OK\n");
} catch (error) {
  process.stderr.write(`No se pudo validar el manifiesto: ${error instanceof Error ? error.message : "error desconocido"}\n`);
  process.exit(1);
}
