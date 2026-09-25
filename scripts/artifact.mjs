// Turns the single-file build into a body fragment suitable for publishing as a
// claude.ai artifact (the host supplies the doctype/html/head/body skeleton).
import { readFileSync, writeFileSync } from 'node:fs';
let html = readFileSync('dist-single/index.html', 'utf8');
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head[^>]*>/gi, '')
  .replace(/<\/?body[^>]*>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
writeFileSync('dist-single/artifact.html', html.trim() + '\n');
console.log('wrote dist-single/artifact.html', html.length, 'bytes');
