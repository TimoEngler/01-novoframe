#!/usr/bin/env node
/*
  Cleanup script to kill common Expo/Metro/Node dev processes and free ports
  Runs automatically via npm prestart
*/
const { execSync } = require('child_process');

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (_) {
    // ignore failures
  }
}

// 1) Kill common processes
const killPatterns = [
  '"npm start"',
  '"expo start"',
  'react-native',
  'node.*metro',
  'metro',
];
killPatterns.forEach((p) => run(`pkill -f ${p}`));

// 2) Free common dev ports (Expo/Metro)
const ports = [8081, 8082, 19000, 19001, 19002];
ports.forEach((port) => run(`lsof -ti tcp:${port} | xargs kill -9`));

// 3) Clear Metro cache (best-effort)
const tmpDir = process.env.TMPDIR || '/tmp';
run(`rm -rf "${tmpDir.replace(/"/g, '')}/metro-*"`);

// 4) Watchman cleanup (if installed)
run('watchman watch-del-all');

// done silently

