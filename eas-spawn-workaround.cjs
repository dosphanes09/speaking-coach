const childProcess = require('node:child_process');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');

const originalSpawn = childProcess.spawn;
const projectRoot = process.env.EAS_PROJECT_ROOT || process.cwd();

function makeChild({ stdout = '', stderr = '', code = 0 } = {}) {
  const child = new EventEmitter();
  child.pid = process.pid;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.kill = () => true;

  process.nextTick(() => {
    if (stdout) child.stdout.write(stdout);
    if (stderr) child.stderr.write(stderr);
    child.stdout.end();
    child.stderr.end();
    child.emit('exit', code, null);
    child.emit('close', code, null);
  });

  return child;
}

function readExpoConfig() {
  const appJsonPath = path.join(projectRoot, 'app.json');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const exp = { ...appJson.expo };

  if (!exp.sdkVersion && typeof packageJson.dependencies?.expo === 'string') {
    const major = packageJson.dependencies.expo.match(/\d+/)?.[0];
    if (major) exp.sdkVersion = `${major}.0.0`;
  }

  return JSON.stringify(exp);
}

childProcess.spawn = function patchedSpawn(command, args = [], options = {}) {
  const commandText = String(command).toLowerCase();
  const argText = Array.isArray(args) ? args.join(' ') : '';

  if (commandText.endsWith('git') || commandText.endsWith('git.exe') || commandText === 'git') {
    if (argText.includes('rev-parse --show-toplevel')) {
      return makeChild({ stdout: `${projectRoot}\n` });
    }
    if (argText.includes('rev-parse --git-dir')) {
      return makeChild({ stdout: `${path.join(projectRoot, '.git')}\n` });
    }
    if (argText.includes('rev-parse HEAD')) {
      return makeChild({ stdout: '0353a4f000000000000000000000000000000000\n' });
    }
    if (argText.includes('rev-parse --abbrev-ref HEAD')) {
      return makeChild({ stdout: 'main\n' });
    }
    if (argText.includes('status')) {
      return makeChild({ stdout: '' });
    }
    return makeChild({ stdout: '' });
  }

  if (
    (commandText.includes('expo') && argText.startsWith('config --json')) ||
    (commandText.endsWith('node') && argText.includes('node_modules\\expo\\bin\\cli config --json')) ||
    (commandText.endsWith('node.exe') && argText.includes('node_modules\\expo\\bin\\cli config --json'))
  ) {
    return makeChild({ stdout: readExpoConfig() });
  }

  process.stderr.write(`[eas-spawn-workaround] passthrough command=${commandText} args=${argText}\n`);
  return originalSpawn.call(this, command, args, options);
};
