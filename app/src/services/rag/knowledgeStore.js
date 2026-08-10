// ایشو #28: بارگذاری و chunk-کردن پایگاه دانش داخلی برای دستیار RAG.
// فایل‌های src/knowledge/*.md بر اساس عنوان‌های `## ...` به chunk تقسیم می‌شوند.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = process.env.RAG_KNOWLEDGE_DIR
  ? path.resolve(process.env.RAG_KNOWLEDGE_DIR)
  : path.join(__dirname, '../../knowledge');

let cachedChunks = null;

function chunkMarkdown(sourceFile, content) {
  return content
    .split(/\n(?=## )/g)
    .map((section, idx) => {
      const headingMatch = section.match(/^##\s+(.+)/);
      const heading = headingMatch ? headingMatch[1].trim() : path.basename(sourceFile, '.md');
      const text = section.replace(/^##\s+.+\n?/, '').trim();
      if (!text) return null;
      return { id: `${sourceFile}#${idx}`, sourceFile, heading, text };
    })
    .filter(Boolean);
}

/** @returns {{id: string, sourceFile: string, heading: string, text: string}[]} */
export function loadKnowledgeChunks({ forceReload = false } = {}) {
  if (cachedChunks && !forceReload) return cachedChunks;
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    cachedChunks = [];
    return cachedChunks;
  }
  const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
  cachedChunks = files.flatMap((file) =>
    chunkMarkdown(file, fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf8'))
  );
  return cachedChunks;
}

export function knowledgeDir() {
  return KNOWLEDGE_DIR;
}
