#!/usr/bin/env node
// Usage: node merge_questions.js existing.js new.js > merged.js

const fs = require('fs');

function parseQuestions(text) {
  const results = [];
  const regex = /\{theme:"(\w+)",q:"([^"]+)",c:\["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\],a:(\d),e:"([^"]+)"\}/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    results.push({
      theme: m[1], q: m[2],
      c: [m[3], m[4], m[5], m[6]],
      a: parseInt(m[7]), e: m[8]
    });
  }
  return results;
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/[^\w]/g, '');
}

const existingText = fs.readFileSync(process.argv[2], 'utf8');
const newText = fs.readFileSync(process.argv[3], 'utf8');

const existing = parseQuestions(existingText);
const newQs = parseQuestions(newText);

process.stderr.write('Existing entries: ' + existing.length + '\n');
process.stderr.write('New (PDFs): ' + newQs.length + '\n');

const seen = new Set();
const merged = [];

for (const q of existing) {
  const key = normalize(q.q);
  if (!seen.has(key)) {
    seen.add(key);
    merged.push(q);
  }
}

process.stderr.write('Existing unique: ' + merged.length + '\n');

let added = 0;
for (const q of newQs) {
  const key = normalize(q.q);
  if (!seen.has(key)) {
    seen.add(key);
    merged.push(q);
    added++;
  }
}

process.stderr.write('Added from PDFs: ' + added + '\n');
process.stderr.write('Total: ' + merged.length + '\n');

const lines = merged.map(q => {
  const choices = q.c.map(c => '"' + c + '"').join(',');
  return '{theme:"' + q.theme + '",q:"' + q.q + '",c:[' + choices + '],a:' + q.a + ',e:"' + q.e + '"}';
});

const output = '// PrépaCivique 2026 — Question Bank\n'
  + '// ' + merged.length + ' questions across 5 official themes\n'
  + '// valeurs, institutions, droits, histoire, societe\n\n'
  + 'const ALL_QUESTIONS = [\n'
  + lines.join(',\n')
  + '\n];\n\nexport default ALL_QUESTIONS;\n';

process.stdout.write(output);
