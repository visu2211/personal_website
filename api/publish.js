// POST /api/publish: saves new Training stats from the private upload page (admin.html).
// The browser reads the export and computes the summary itself, so only that small summary arrives here,
// never the raw Hevy CSV or Strava archive. This function checks the password, validates the summary,
// and commits assets/hevy-data.js or assets/strava-data.js to GitHub; Vercel then redeploys the site.
//
// Vercel environment variables (Settings → Environment Variables, Production):
//   ADMIN_PASSWORD  any long passphrase you choose; the upload page asks for it
//   GITHUB_TOKEN    fine-grained token limited to visu2211/personal_website with Contents: Read and write
import { timingSafeEqual, createHash } from 'node:crypto';
import { dataFile } from '../assets/training-stats.js';

const REPO = process.env.GITHUB_REPO || 'visu2211/personal_website';
const BRANCH = 'main';
const FILES = { hevy: 'assets/hevy-data.js', strava: 'assets/strava-data.js' };

const sameSecret = (a, b) => {
  const h = (s) => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(h(a), h(b));
};

const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const num = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const str = (s, max = 200) => typeof s === 'string' && s.length <= max;
function valid(kind, d) {
  if (!d || typeof d !== 'object' || !isDay(d.generated) || typeof d.days !== 'object') return false;
  if (!Object.entries(d.days).every(([k, v]) => isDay(k) && num(v))) return false;
  if (kind === 'hevy') {
    return [d.totalWorkouts, d.thisYear, d.last30, d.totalVolumeLbs].every(num) && Array.isArray(d.recent) && d.recent.length <= 10
      && d.recent.every((w) => str(w.title) && isDay(w.date) && num(w.exercises) && num(w.sets) && num(w.volumeLbs) && (w.minutes === null || num(w.minutes)));
  }
  const tot = (t) => t && [t.runs, t.miles, t.hours, t.elevFt].every(num);
  return d.live === false && tot(d.recent) && tot(d.ytd) && tot(d.all) && Array.isArray(d.runs) && d.runs.length <= 10
    && d.runs.every((r) => str(r.name) && !isNaN(Date.parse(r.date)) && [r.miles, r.movingSec, r.paceSecPerMi, r.elevFt].every(num)
      && /^https:\/\/www\.strava\.com\/activities\/\d+$/.test(r.url));
}

async function gh(path, init = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.message || `GitHub ${r.status}`), { status: r.status });
  return body;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) {
    return res.status(503).json({ error: 'Uploads are not set up yet. Add ADMIN_PASSWORD and GITHUB_TOKEN in Vercel, then redeploy.' });
  }
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!auth || !sameSecret(auth, process.env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return res.status(401).json({ error: 'Wrong password.' });
  }

  const { kind, data, check } = req.body || {};
  if (check) return res.status(200).json({ ok: true }); // password check from the sign-in screen
  if (!FILES[kind]) return res.status(400).json({ error: 'Unknown upload type.' });
  if (JSON.stringify(data || {}).length > 200_000 || !valid(kind, data)) return res.status(400).json({ error: 'That summary does not look right, so nothing was published.' });

  try {
    const path = FILES[kind];
    const current = await gh(`contents/${path}?ref=${BRANCH}`).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    const label = kind === 'hevy' ? 'Hevy' : 'Strava';
    const content = dataFile(kind, data, `Published from the upload page (${label} export)`);
    const commit = await gh(`contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Update ${label} stats from upload page`,
        content: Buffer.from(content).toString('base64'),
        branch: BRANCH,
        ...(current?.sha ? { sha: current.sha } : {}),
      }),
    });
    return res.status(200).json({ ok: true, commit: commit.commit?.html_url });
  } catch (e) {
    return res.status(502).json({ error: `GitHub rejected the update (${e.message}). Check that GITHUB_TOKEN can write to ${REPO}.` });
  }
}
