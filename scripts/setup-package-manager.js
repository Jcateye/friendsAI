#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGE_MANAGERS = ['pnpm', 'bun', 'yarn', 'npm'];
const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
const GLOBAL_CONFIG_PATH = path.join(HOME_DIR, '.claude', 'package-manager.json');
const PROJECT_CONFIG_PATH = path.join(process.cwd(), '.claude', 'package-manager.json');

function isInstalled(pm) {
  try {
    execSync(`${pm} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function detectFromLockFile() {
  const lockFiles = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm',
    'bun.lockb': 'bun'
  };

  for (const [file, pm] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      return pm;
    }
  }
  return null;
}

function detectFromPackageJson() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.packageManager) {
      const match = pkg.packageManager.match(/^(\w+)@/);
      return match ? match[1] : null;
    }
  }
  return null;
}

function readConfig(configPath) {
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.packageManager;
    } catch (e) {
      console.warn(`Warning: Failed to read ${configPath}`);
    }
  }
  return null;
}

function writeConfig(configPath, pm) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify({ packageManager: pm }, null, 2));
}

function detectPackageManager() {
  console.log('\n🔍 Detecting package manager...\n');

  const detectionSteps = [
    {
      name: 'Environment variable',
      detect: () => process.env.CLAUDE_PACKAGE_MANAGER,
      priority: 1
    },
    {
      name: 'Project config',
      detect: () => readConfig(PROJECT_CONFIG_PATH),
      priority: 2
    },
    {
      name: 'package.json',
      detect: () => detectFromPackageJson(),
      priority: 3
    },
    {
      name: 'Lock file',
      detect: () => detectFromLockFile(),
      priority: 4
    },
    {
      name: 'Global config',
      detect: () => readConfig(GLOBAL_CONFIG_PATH),
      priority: 5
    },
    {
      name: 'Fallback',
      detect: () => PACKAGE_MANAGERS.find(pm => isInstalled(pm)),
      priority: 6
    }
  ];

  let selectedPm = null;
  let selectedMethod = null;

  for (const step of detectionSteps) {
    const result = step.detect();
    const status = result ? '✅' : '❌';
    console.log(`${status} ${step.name}: ${result || 'not found'}`);

    if (result && !selectedPm) {
      selectedPm = result;
      selectedMethod = step.name;
    }
  }

  console.log(`\n📦 Selected package manager: ${selectedPm} (via ${selectedMethod})`);

  // Check availability
  const available = PACKAGE_MANAGERS.filter(pm => isInstalled(pm));
  console.log(`\n✨ Available package managers: ${available.join(', ')}`);

  if (!isInstalled(selectedPm)) {
    console.error(`\n❌ Error: ${selectedPm} is not installed!`);
    process.exit(1);
  }

  return selectedPm;
}

function setPackageManager(pm, scope) {
  if (!PACKAGE_MANAGERS.includes(pm)) {
    console.error(`❌ Invalid package manager: ${pm}`);
    console.log(`Valid options: ${PACKAGE_MANAGERS.join(', ')}`);
    process.exit(1);
  }

  if (!isInstalled(pm)) {
    console.error(`❌ ${pm} is not installed!`);
    process.exit(1);
  }

  const configPath = scope === 'global' ? GLOBAL_CONFIG_PATH : PROJECT_CONFIG_PATH;
  writeConfig(configPath, pm);

  console.log(`✅ Set ${scope} package manager to: ${pm}`);
  console.log(`   Config: ${configPath}`);
}

function listPackageManagers() {
  console.log('\n📦 Package Managers:\n');
  PACKAGE_MANAGERS.forEach(pm => {
    const installed = isInstalled(pm) ? '✅ installed' : '❌ not installed';
    console.log(`  ${pm.padEnd(8)} ${installed}`);
  });
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Package Manager Setup

Usage:
  node setup-package-manager.js [options]

Options:
  --detect              Detect current package manager
  --list                List available package managers
  --global <pm>         Set global package manager preference
  --project <pm>        Set project package manager preference
  -h, --help            Show this help message

Examples:
  node setup-package-manager.js --detect
  node setup-package-manager.js --global pnpm
  node setup-package-manager.js --project bun
  node setup-package-manager.js --list
`);
  process.exit(0);
}

if (args.includes('--detect')) {
  detectPackageManager();
} else if (args.includes('--list')) {
  listPackageManagers();
} else if (args.includes('--global')) {
  const pm = args[args.indexOf('--global') + 1];
  setPackageManager(pm, 'global');
} else if (args.includes('--project')) {
  const pm = args[args.indexOf('--project') + 1];
  setPackageManager(pm, 'project');
} else {
  console.error('❌ Invalid arguments. Use --help for usage information.');
  process.exit(1);
}
