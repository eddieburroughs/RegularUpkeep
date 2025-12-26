#!/usr/bin/env node
/**
 * Cross-platform test runner for RegularUpkeep
 * Runs: lint → typecheck → unit tests → e2e (if configured) → security checks
 *
 * Usage:
 *   node scripts/test-all.mjs
 *   npm run test:all
 *   npm run test:ci (with CI=true)
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Configuration
const isCI = process.env.CI === 'true';
const isWindows = process.platform === 'win32';

// Colors (disabled in CI for cleaner logs)
const colors = {
  reset: isCI ? '' : '\x1b[0m',
  red: isCI ? '' : '\x1b[31m',
  green: isCI ? '' : '\x1b[32m',
  yellow: isCI ? '' : '\x1b[33m',
  blue: isCI ? '' : '\x1b[34m',
  cyan: isCI ? '' : '\x1b[36m',
  dim: isCI ? '' : '\x1b[2m',
};

// Test steps configuration
const steps = [
  {
    name: 'lint',
    displayName: 'ESLint',
    command: 'npm',
    args: ['run', 'lint'],
    required: true,
  },
  {
    name: 'typecheck',
    displayName: 'TypeScript',
    command: 'npm',
    args: ['run', 'typecheck'],
    required: true,
  },
  {
    name: 'test:unit',
    displayName: 'Unit Tests',
    command: 'npm',
    args: ['run', 'test:unit'],
    required: true,
  },
  {
    name: 'test:e2e',
    displayName: 'E2E Tests',
    command: 'npm',
    args: ['run', 'test:e2e'],
    required: false, // Optional - may not be configured
  },
  {
    name: 'test:rls',
    displayName: 'RLS Security Tests',
    command: 'npm',
    args: ['run', 'test:rls'],
    required: false, // Optional - requires real Supabase credentials
    envCheck: ['SUPABASE_TEST_URL', 'SUPABASE_TEST_SERVICE_ROLE_KEY'], // Skip if not configured
  },
  {
    name: 'test:security',
    displayName: 'Security Checks',
    command: 'npm',
    args: ['run', 'test:security'],
    required: true,
  },
];

// Results tracking
const results = [];

function log(message) {
  console.log(message);
}

function logStep(stepName, status, duration, error = null) {
  const statusIcon = status === 'PASS' ? `${colors.green}✓${colors.reset}` :
                     status === 'FAIL' ? `${colors.red}✗${colors.reset}` :
                     status === 'SKIP' ? `${colors.yellow}○${colors.reset}` : '?';

  const durationStr = duration ? `${colors.dim}(${(duration / 1000).toFixed(1)}s)${colors.reset}` : '';

  log(`  ${statusIcon} ${stepName} ${durationStr}`);

  if (error && status === 'FAIL') {
    log(`    ${colors.red}→ ${error}${colors.reset}`);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // On Windows, use shell for npm commands
    const spawnOptions = {
      cwd: projectRoot,
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: isWindows,
      env: {
        ...process.env,
        FORCE_COLOR: isCI ? '0' : '1',
      },
    };

    const proc = spawn(command, args, spawnOptions);

    let stdout = '';
    let stderr = '';

    if (options.silent) {
      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    }

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        duration: Date.now() - startTime,
        stdout,
        stderr,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        code: 1,
        duration: Date.now() - startTime,
        error: err.message,
        stdout,
        stderr,
      });
    });
  });
}

async function checkScriptExists(scriptName) {
  try {
    const result = await runCommand('npm', ['run', scriptName, '--', '--help'], { silent: true });
    // npm run will fail with specific message if script doesn't exist
    return !result.stderr?.includes(`Missing script: "${scriptName}"`);
  } catch {
    return false;
  }
}

async function runStep(step) {
  log('');
  log(`${colors.cyan}━━━ ${step.displayName} ━━━${colors.reset}`);

  // Check if required environment variables are set
  if (step.envCheck && step.envCheck.length > 0) {
    const missing = step.envCheck.filter(env => !process.env[env]);
    if (missing.length > 0) {
      log(`  ${colors.yellow}Skipping: Missing ${missing.join(', ')}${colors.reset}`);
      results.push({
        name: step.displayName,
        step: step.name,
        status: 'SKIP',
        duration: 0,
        required: step.required,
        error: `Missing environment variables: ${missing.join(', ')}`,
      });
      return true; // Don't fail on skip
    }
  }

  const result = await runCommand(step.command, step.args);

  const status = result.success ? 'PASS' : 'FAIL';

  results.push({
    name: step.displayName,
    step: step.name,
    status,
    duration: result.duration,
    required: step.required,
    error: result.error || (result.success ? null : `Exit code ${result.code}`),
  });

  return result.success;
}

function printSummary() {
  log('');
  log(`${colors.blue}════════════════════════════════════════${colors.reset}`);
  log(`${colors.blue}  TEST RESULTS SUMMARY${colors.reset}`);
  log(`${colors.blue}════════════════════════════════════════${colors.reset}`);
  log('');

  // Summary table
  const maxNameLen = Math.max(...results.map(r => r.name.length));

  log(`  ${'Step'.padEnd(maxNameLen)}  Status   Duration`);
  log(`  ${'-'.repeat(maxNameLen)}  ------   --------`);

  for (const result of results) {
    const statusColor = result.status === 'PASS' ? colors.green :
                       result.status === 'SKIP' ? colors.yellow : colors.red;
    const status = `${statusColor}${result.status}${colors.reset}`;
    const duration = `${(result.duration / 1000).toFixed(1)}s`;
    log(`  ${result.name.padEnd(maxNameLen)}  ${status.padEnd(16)}   ${duration}`);
  }

  log('');

  // Overall result
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;
  const requiredFailed = results.filter(r => r.status === 'FAIL' && r.required);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  log(`  Total: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  log('');

  if (requiredFailed.length > 0) {
    log(`${colors.red}  ✗ FAILED - ${requiredFailed.length} required step(s) failed:${colors.reset}`);
    for (const r of requiredFailed) {
      log(`    - ${r.name}: ${r.error || 'unknown error'}`);
    }
  } else if (failCount > 0) {
    log(`${colors.yellow}  ⚠ PASSED WITH WARNINGS - ${failCount} optional step(s) failed${colors.reset}`);
  } else {
    log(`${colors.green}  ✓ ALL TESTS PASSED${colors.reset}`);
  }

  log('');
  log(`${colors.blue}════════════════════════════════════════${colors.reset}`);

  return requiredFailed.length === 0;
}

async function main() {
  log('');
  log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.blue}║     RegularUpkeep Test Suite           ║${colors.reset}`);
  log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  log('');
  log(`  ${colors.dim}Environment: ${isCI ? 'CI' : 'Local'}${colors.reset}`);
  log(`  ${colors.dim}Platform: ${process.platform}${colors.reset}`);
  log(`  ${colors.dim}Node: ${process.version}${colors.reset}`);

  let allPassed = true;

  for (const step of steps) {
    const success = await runStep(step);

    if (!success && step.required) {
      allPassed = false;
      // Continue running other steps to show all failures
    }
  }

  const overallSuccess = printSummary();

  process.exit(overallSuccess ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
