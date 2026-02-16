#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const assetsDir = path.resolve(__dirname, '../packages/web/dist/assets');
const maxKb = Number.parseInt(process.env.WEB_BUNDLE_MAX_KB || '300', 10);

if (!Number.isFinite(maxKb) || maxKb <= 0) {
  console.error('WEB_BUNDLE_MAX_KB must be a positive integer.');
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  console.error(`Assets directory not found: ${assetsDir}`);
  console.error('Run "bun run web:build" before bundle size check.');
  process.exit(1);
}

const jsFiles = fs
  .readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => {
    const filePath = path.join(assetsDir, name);
    const sizeBytes = fs.statSync(filePath).size;
    return { name, sizeBytes, sizeKb: sizeBytes / 1024 };
  })
  .sort((a, b) => b.sizeBytes - a.sizeBytes);

if (jsFiles.length === 0) {
  console.error(`No JS bundle files found in ${assetsDir}`);
  process.exit(1);
}

const violations = jsFiles.filter((file) => file.sizeKb > maxKb);

console.log(`Bundle size guard: max ${maxKb}KB per JS chunk`);
for (const file of jsFiles.slice(0, 8)) {
  console.log(`- ${file.name}: ${file.sizeKb.toFixed(1)}KB`);
}

if (violations.length > 0) {
  console.error('Bundle size guard failed:');
  for (const file of violations) {
    console.error(`- ${file.name} is ${file.sizeKb.toFixed(1)}KB (limit: ${maxKb}KB)`);
  }
  process.exit(1);
}

console.log('Bundle size guard passed.');
