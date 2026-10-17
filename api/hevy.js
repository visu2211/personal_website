// GET /api/hevy: live lifting stats from Hevy's official API (api.hevyapp.com/v1).
// Only works with a Hevy Pro API key in HEVY_API_KEY. Without one the page falls back to
// assets/hevy-data.js, built from the free CSV export by scripts/hevy-stats.mjs.
// Same output shape as that file. Cached at Vercel's CDN for an hour.
const API = 'https://api.hevyapp.com/v1';
// Keep in sync with FEATURED in scripts/hevy-stats.mjs.
const FEATURED = ['Squat (Barbell)', 'Incline Bench Press (Smith Machine)', 'Lat Pulldown (Cable)', 'Shoulder Press (Dumbbell)'];
const get = async (path) => {
  const r = await fetch(API + path, { headers: { 'api-key': process.env.HEVY_API_KEY, accept: 'application/json' } });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
};
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default async function handler(req, res) {
  if (!process.env.HEVY_API_KEY) return res.status(503).json({ error: 'Hevy API key not set.' });
  try {
    const { workout_count } = await get('/workouts/count');
    const workouts = [];
    for (let page = 1; page <= 10; page++) { // newest 100 workouts covers the 20-week heatmap
      const r = await get(`/workouts?page=${page}&pageSize=10`);
      workouts.push(...r.workouts);
      if (page >= r.page_count) break;
    }
    const lbs = (kg) => (kg || 0) * 2.20462;
    const work = (w) => w.exercises.flatMap((e) => e.sets.filter((s) => s.type !== 'warmup').map((s) => ({ ...s, ex: e.title })));
    const volume = (w) => work(w).reduce((v, s) => v + lbs(s.weight_kg) * (s.reps || 0), 0);
    const now = new Date();

    const best = new Map(), freq = new Map();
    for (const w of workouts) for (const s of work(w)) {
      const wt = lbs(s.weight_kg), reps = s.reps || 0;
      if (!wt || !reps || reps > 12) continue;
      const e1rm = wt * (1 + reps / 30);
      freq.set(s.ex, (freq.get(s.ex) || 0) + 1);
      if (!best.has(s.ex) || e1rm > best.get(s.ex).e1rm) best.set(s.ex, { exercise: s.ex, weight: Math.round(wt), reps, e1rm: Math.round(e1rm), date: dayKey(new Date(w.start_time)) });
    }
    const days = {};
    for (const w of workouts) {
      const d = new Date(w.start_time);
      if (now - d < 140 * 86400000) days[dayKey(d)] = (days[dayKey(d)] || 0) + 1;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600');
    return res.status(200).json({
      live: true,
      generated: dayKey(now),
      totalWorkouts: workout_count,
      thisYear: workouts.filter((w) => new Date(w.start_time).getFullYear() === now.getFullYear()).length,
      last30: workouts.filter((w) => now - new Date(w.start_time) < 30 * 86400000).length,
      topLifts: (FEATURED.some((n) => best.has(n)) ? FEATURED.filter((n) => best.has(n)) : [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)).slice(0, 4).map((n) => best.get(n)),
      recent: workouts.slice(0, 5).map((w) => ({
        title: w.title,
        date: dayKey(new Date(w.start_time)),
        minutes: Math.round((new Date(w.end_time) - new Date(w.start_time)) / 60000),
        exercises: w.exercises.length,
        sets: work(w).length,
        volumeLbs: Math.round(volume(w)),
      })),
      days,
    });
  } catch {
    return res.status(502).json({ error: 'Could not reach Hevy right now.' });
  }
}
