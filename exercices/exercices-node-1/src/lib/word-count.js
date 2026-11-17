import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Compte les mots d'un texte, un texte vide vaut zéro.
export function countWords(text) {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

// Liste les fichiers Markdown d'un dossier, triés par nom.
export async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

async function countFile(directory, name) {
  const content = await readFile(join(directory, name), "utf8");
  return { name, words: countWords(content) };
}

// Lit tous les fichiers en parallèle avec Promise.all.
export async function countWordsInParallel(directory) {
  const names = await listMarkdownFiles(directory);
  return Promise.all(names.map((name) => countFile(directory, name)));
}

// Lit les fichiers l'un après l'autre, pour comparer les temps.
export async function countWordsSequentially(directory) {
  const names = await listMarkdownFiles(directory);
  const results = [];
  for (const name of names) {
    results.push(await countFile(directory, name));
  }
  return results;
}

export function formatResult({ name, words }) {
  return `${name} : ${words} mots`;
}
