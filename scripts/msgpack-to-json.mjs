/**
 * Converts a .msgpack file to .json for debugging/inspection.
 * Usage: node scripts/msgpack-to-json.mjs <path-to-file.msgpack>
 * Output: Creates <path-to-file.json>
 */

import { readFile, writeFile } from "node:fs/promises";
import { Packr } from "msgpackr";

// Configure msgpackr to preserve Maps (same as state.ts)
const packr = new Packr({
  moreTypes: true,
  mapsAsObjects: false,
});

const inputPath = process.argv[2];

if (!inputPath || !inputPath.endsWith(".msgpack")) {
  console.error("Error: Input file with .msgpack extension is required");
  process.exit(1);
}

try {
  const content = await readFile(inputPath);
  const data = packr.unpack(content);

  const outputPath = inputPath.replace(".msgpack", ".json");

  // Custom replacer to handle Maps in JSON output
  function mapReplacer(_key, value) {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  }

  await writeFile(outputPath, JSON.stringify(data, mapReplacer, 2));

  console.log(`Converted: ${inputPath} -> ${outputPath}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
