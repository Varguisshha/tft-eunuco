import { execFileSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
import { verifyHistory } from './verify-public-safe.mjs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const branch = 'release/p11k-public-safe';
const expected = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(expected ?? '') || git('rev-parse', 'HEAD') !== expected)
  throw Error('Exact reviewed commit required');
if (
  git('branch', '--show-current') !== branch ||
  git('status', '--porcelain', '--untracked-files=no')
)
  throw Error('Clean public-safe release branch required');
if (
  git('remote', 'get-url', '--push', 'origin') !== 'https://github.com/Varguisshha/tft-eunuco.git'
)
  throw Error('Unexpected publication repository');
console.log(JSON.stringify(verifyHistory(expected)));
execFileSync(
  'git',
  [
    '-c',
    'push.followTags=false',
    'push',
    '--no-follow-tags',
    'origin',
    `HEAD:refs/heads/${branch}`,
  ],
  { stdio: 'inherit' },
);
const published = git('ls-remote', '--heads', 'origin', branch).split(/\s+/)[0];
if (published !== expected) throw Error('Published commit mismatch');
console.log(JSON.stringify({ published, branch, remoteVerified: true }));
