/**
 * Reads the hand-curated catalog batches as text, so bare-Node scripts can dedupe and link-check
 * against them without a TypeScript build step.
 */
import { readFileSync, existsSync } from "node:fs";

export const CATALOG_FILES = [
  "src/data/opportunities.ts",
  "src/data/opportunitiesExpanded.ts",
  "src/data/opportunitiesNationwide.ts",
  "src/data/opportunitiesScraped.ts",
];

const root = new URL("../../", import.meta.url);

/** `{ id, title, org, link }` for every record literal in the curated batch files. */
export function catalogRecords() {
  const records = [];
  for (const file of CATALOG_FILES) {
    const url = new URL(file, root);
    if (!existsSync(url)) continue;
    // Each record literal starts at its `id:` field; its other fields follow before the next id.
    const chunks = readFileSync(url, "utf8").split(/\n\s*id:\s*"/).slice(1);
    for (const chunk of chunks) {
      const field = (name) => chunk.match(new RegExp(`\\b${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
      const link = field("link");
      if (link) records.push({ id: chunk.slice(0, chunk.indexOf('"')), title: field("title"), org: field("org"), link });
    }
  }
  return records;
}
