// One-time Strava connection for the Running panel. Run it yourself:  node scripts/connect-strava.mjs
//
// 1. Asks for your Strava app's Client ID and Client Secret (the secret is typed hidden).
// 2. Opens Strava's Authorize page; Strava sends you back to a tiny server on this computer.
// 3. Trades the one-time code for a long-lasting refresh token.
// 4. Saves STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_REFRESH_TOKEN to your Vercel project
//    (production) with the Vercel CLI. Nothing is printed, written to disk, or committed.
//
// Before running: create an app at https://www.strava.com/settings/api with
// "Authorization Callback Domain" set to  localhost
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import readline from 'node:readline';

const PORT = 8723;
const REDIRECT = `http://localhost:${PORT}/callback`;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write(''); };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });
}

function vercel(args, input) {
  const r = spawnSync('npx', ['--yes', 'vercel', ...args], { input, stdio: [input == null ? 'inherit' : 'pipe', 'inherit', 'inherit'] });
  return r.status === 0;
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref();
}

function waitForCode(state) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== '/callback') { res.writeHead(404).end(); return; }
      const page = (msg) => `<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;background:#0d1512;color:#ebe5d5;display:grid;place-items:center;height:100vh"><p>${msg}</p>`;
      if (u.searchParams.get('state') !== state || u.searchParams.get('error')) {
        res.writeHead(400, { 'Content-Type': 'text/html' }).end(page('Strava access was not granted. You can close this tab and run the script again.'));
        server.close(); reject(new Error('Authorization was denied or did not match.')); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(page('Strava is connected. You can close this tab and go back to the terminal.'));
      server.close(); resolve({ code: u.searchParams.get('code'), scope: u.searchParams.get('scope') || '' });
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1');
    setTimeout(() => { server.close(); reject(new Error('Timed out after 5 minutes waiting for Strava.')); }, 5 * 60 * 1000).unref();
  });
}

async function main() {
  console.log('\nConnect Strava to vishalkanala.com\n');
  if (!existsSync('.vercel/project.json')) {
    console.log('First, link this folder to your Vercel project (pick the existing "personal_website" project):\n');
    if (!vercel(['link'])) throw new Error('Vercel link did not finish.');
  }

  const clientId = await ask('Strava Client ID: ');
  const clientSecret = await ask('Strava Client Secret (hidden): ', { hidden: true });
  if (!/^\d+$/.test(clientId) || !clientSecret) throw new Error('The Client ID should be a number, and the secret cannot be empty.');

  const state = Math.random().toString(36).slice(2);
  const auth = new URL('https://www.strava.com/oauth/authorize');
  auth.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: REDIRECT, scope: 'read,activity:read', approval_prompt: 'force', state });
  console.log('\nOpening Strava in your browser. Click "Authorize".');
  console.log(`If it doesn't open, visit:\n${auth}\n`);
  openBrowser(auth.toString());

  const { code, scope } = await waitForCode(state);
  if (!scope.includes('activity:read')) throw new Error('Please leave "View data about your activities" checked on the Strava page, then run again.');

  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }),
  });
  const tok = await r.json();
  if (!r.ok || !tok.refresh_token) throw new Error(`Strava did not return a token (${r.status}). Check the Client ID and Secret.`);
  console.log(`Authorized as ${tok.athlete?.firstname ?? 'you'} on Strava.\n\nSaving to Vercel (production)…`);

  for (const [name, value] of [['STRAVA_CLIENT_ID', clientId], ['STRAVA_CLIENT_SECRET', clientSecret], ['STRAVA_REFRESH_TOKEN', tok.refresh_token]]) {
    vercel(['env', 'rm', name, 'production', '--yes'], '');          // replace an old value if one exists
    if (!vercel(['env', 'add', name, 'production'], value + '\n')) throw new Error(`Could not save ${name} to Vercel.`);
  }

  console.log('\nSaved. The site needs one redeploy to pick these up.');
  const again = (await ask('Redeploy production now? (y/n) ')).toLowerCase();
  if (again.startsWith('y')) vercel(['--prod']);
  else console.log('Redeploy later from the Vercel dashboard (Deployments › ⋯ › Redeploy) or push to GitHub.');
  console.log('\nDone. Check https://vishalkanala.com/beyond.html#running\n');
}

main().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
