#!/usr/bin/env node
/* Verify all user stories have correct format */
const { readdirSync, readFileSync, statSync, existsSync } = require('fs');
const { join, extname } = require('path');

const userStoriesDir = join(process.cwd(), 'docs', 'user-stories');

let hasErrors = false;

function error(msg) {
  console.error(`  ${msg}`);
  hasErrors = true;
}

function success(msg) {
  console.log(`  ${msg}`);
}

function validateDirectory(dir, prefix = '') {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      console.log(`${prefix}${entry}/`);
      validateDirectory(entryPath, prefix + '  ');
      continue;
    }

    if (extname(entry) !== '.json') {
      error(`${prefix}${entry} - not a .json file`);
      continue;
    }

    try {
      const content = readFileSync(entryPath, 'utf-8');
      const json = JSON.parse(content);
      if (!Array.isArray(json) || json.length === 0) {
        error(`${prefix}${entry} - invalid schema`);
        continue;
      }
      let passing = 0;
      for (const feature of json) {
        if (!feature || typeof feature.description !== 'string' || !Array.isArray(feature.steps)) {
          error(`${prefix}${entry} - invalid schema`);
          break;
        }
        if (feature.passes === true) {
          passing += 1;
        }
      }
      success(`${prefix}${entry} (${passing}/${json.length} passing)`);
    } catch (e) {
      if (e instanceof SyntaxError) {
        error(`${prefix}${entry} - invalid JSON: ${e.message}`);
      } else {
        error(`${prefix}${entry} - ${String(e)}`);
      }
    }
  }
}

console.log('\nVerifying user stories...\n');

if (!existsSync(userStoriesDir)) {
  console.log('No docs/user-stories directory found\n');
  process.exit(0);
}

validateDirectory(userStoriesDir);

console.log();

if (hasErrors) {
  console.log('Verification failed\n');
  process.exit(1);
} else {
  console.log('All user stories valid\n');
  process.exit(0);
}
