// Pour aller plus loin : lecture parallèle contre lecture séquentielle.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { countWordsInParallel, countWordsSequentially } from "./lib/word-count.js";

const FILE_COUNT = 100;
const directory = await mkdtemp(join(tmpdir(), "notes-"));

try {
  await Promise.all(
    Array.from({ length: FILE_COUNT }, (_, index) =>
      writeFile(join(directory, `note-${index}.md`), "lorem ipsum dolor ".repeat(500)),
    ),
  );

  console.time("Promise.all");
  await countWordsInParallel(directory);
  console.timeEnd("Promise.all");

  console.time("boucle séquentielle");
  await countWordsSequentially(directory);
  console.timeEnd("boucle séquentielle");
} finally {
  await rm(directory, { recursive: true, force: true });
}
