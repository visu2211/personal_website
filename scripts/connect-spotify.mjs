// One-time Spotify connection for the Listening section. Run it yourself:  node scripts/connect-spotify.mjs
//
// Before running: create an app at https://developer.spotify.com/dashboard
//   - Redirect URI:  http://127.0.0.1:8724/callback   (exactly this)
//   - API: Web API
// The script asks for the app's Client ID and Secret (secret typed hidden), opens Spotify's Agree page,
// trades the one-time code for a refresh token, and saves all three to Vercel (production).
// Nothing is printed, written to disk, or committed.
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import readline from 'node:readline';

const PORT = 8724;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'user-read-currently-playing user-read-recently-played user-top-read';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
  });
}

// read a line without echoing it: nothing is shown while typing or pasting, only a count at the end
function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = '';
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
    const done = () => { stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); stdout.write(`(${value.length} characters)\n`); resolve(value.trim()); };
    const onData = (chunk) => {
      chunk = chunk.replace(/\x1b\[20[01]~/g, '');              // bracketed-paste markers
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done();
        if (ch === '\u0003') { stdout.write('\n'); process.exit(130); }   // Ctrl+C
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else if (ch >= ' ') value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const vercel = (args, input) => spawnSync('npx', ['--yes', 'vercel', ...args], { input, stdio: [input == null ? 'inherit' : 'pipe', 'inherit', 'inherit'] }).status === 0;
const openBrowser = (url) => spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();

function waitForCode(state) {
  return new Promise((resolve, reject) => {
    const page = (msg) => `<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;background:#0d1512;color:#ebe5d5;display:grid;place-items:center;height:100vh"><p>${msg}</p>`;
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== '/callback') { res.writeHead(404).end(); return; }
      if (u.searchParams.get('state') !== state || !u.searchParams.get('code')) {
        res.writeHead(400, { 'Content-Type': 'text/html' }).end(page('Spotify access was not granted. Close this tab and run the script again.'));
        server.close(); reject(new Error('Authorization was denied or did not match.')); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(page('Spotify is connected. Close this tab and go back to the terminal.'));
      server.close(); resolve(u.searchParams.get('code'));
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1');
    setTimeout(() => { server.close(); reject(new Error('Timed out after 5 minutes waiting for Spotify.')); }, 300000).unref();
  });
}

async function main() {
  console.log('\nConnect Spotify to vishalkanala.com\n');
  if (!existsSync('.vercel/project.json') && !existsSync('.vercel/repo.json') && !vercel(['link'])) throw new Error('Vercel link did not finish.');
  const id = await ask('Spotify Client ID: ');
  const secret = await askHidden('Spotify Client Secret (hidden, paste once then press Enter): ');
  if (!/^[0-9a-f]{32}$/i.test(id)) throw new Error(`The Client ID should be 32 letters and numbers (got ${id.length}). Copy it again from the app's Settings page.`);
  if (!/^[0-9a-f]{32}$/i.test(secret)) throw new Error(`The Client Secret should be 32 letters and numbers (got ${secret.length}), so it may have been pasted twice. Copy it again and paste it once.`);

  const state = Math.random().toString(36).slice(2);
  const auth = new URL('https://accounts.spotify.com/authorize');
  auth.search = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: REDIRECT, scope: SCOPES, state, show_dialog: 'true' });
  console.log('\nOpening Spotify in your browser. Click "Agree".');
  console.log(`If it doesn't open, visit:\n${auth}\n`);
  openBrowser(auth.toString());
  const code = await waitForCode(state);

  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
  });
  const tok = await r.json();
  if (!r.ok || !tok.refresh_token) {
    // Spotify's own reason, e.g. invalid_client (wrong ID or secret) or invalid_grant (redirect URI mismatch, or the code expired)
    const why = [tok.error, tok.error_description].filter(Boolean).join(': ') || 'no details';
    const hint = tok.error === 'invalid_client' ? 'The Client ID or Secret is wrong. Copy both again from the app\'s Settings page.'
      : tok.error === 'invalid_grant' ? `The Redirect URI in the app's Settings must be exactly ${REDIRECT} (then click Save), and run the script again right away.`
      : 'Check the Client ID, Secret, and Redirect URI.';
    throw new Error(`Spotify did not return a token (${r.status}, ${why}).\n${hint}`);
  }
  console.log('Authorized. Saving to Vercel (production)…');

  for (const [name, value] of [['SPOTIFY_CLIENT_ID', id], ['SPOTIFY_CLIENT_SECRET', secret], ['SPOTIFY_REFRESH_TOKEN', tok.refresh_token]]) {
    vercel(['env', 'rm', name, 'production', '--yes'], '');
    if (!vercel(['env', 'add', name, 'production'], value + '\n')) throw new Error(`Could not save ${name} to Vercel.`);
  }
  const again = (await ask('\nSaved. Redeploy production now so the site picks it up? (y/n) ')).toLowerCase();
  if (again.startsWith('y')) vercel(['--prod', '--yes']);
  console.log('\nDone. Check https://vishalkanala.com/beyond.html#music\n');
}

main().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
