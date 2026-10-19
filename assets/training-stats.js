// Turns raw exports into the small summaries the Training panels read (window.HEVY / window.STRAVA).
// Shared by the private upload page (admin.html, in the browser) and the command-line scripts (Node),
// so both always produce the same numbers. No DOM or Node APIs in here.

export function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// Handles "6 Oct 2026, 18:02", "Oct 2, 2026, 3:08 PM", and "Oct 17, 2026, 5:38:30 PM" (every browser, not just Chrome).
export function parseDate(s, { utc = false } = {}) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{1,2}) (\w{3})\w* (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i)
       || s.match(/^(\w{3})\w* (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (m) {
    const dayFirst = /^\d/.test(m[1]);
    const day = +(dayFirst ? m[1] : m[2]), mon = MONTHS[(dayFirst ? m[2] : m[1]).toLowerCase()];
    let h = +m[4]; const min = +m[5], sec = +(m[6] || 0), ap = (m[7] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
    return utc ? new Date(Date.UTC(+m[3], mon, day, h, min, sec)) : new Date(+m[3], mon, day, h, min, sec);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 86400000;

/* ---------- Hevy: workouts CSV (Profile → Settings → Export Workouts) ---------- */
export function hevySummary(csvText, now = new Date()) {
  const [head, ...body] = parseCSV(csvText);
  if (!head || !head.includes('exercise_title') || !head.includes('start_time')) throw new Error('This does not look like a Hevy workouts export.');
  const sets = body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
  const kg = !head.includes('weight_lbs') && head.includes('weight_kg');
  const lbs = (r) => { const w = parseFloat(kg ? r.weight_kg : r.weight_lbs) || 0; return kg ? w * 2.20462 : w; };

  const byWorkout = new Map();
  for (const r of sets) {
    const key = r.start_time + '|' + r.title;
    if (!byWorkout.has(key)) byWorkout.set(key, { title: r.title, start: parseDate(r.start_time), end: parseDate(r.end_time), sets: [] });
    byWorkout.get(key).sets.push(r);
  }
  const workouts = [...byWorkout.values()].filter((w) => w.start).sort((a, b) => b.start - a.start);
  if (!workouts.length) throw new Error('No workouts found in this file.');
  const work = (w) => w.sets.filter((s) => s.set_type !== 'warmup');
  const volume = (w) => work(w).reduce((v, s) => v + lbs(s) * (parseInt(s.reps) || 0), 0);

  const days = {};
  for (const w of workouts) if (now - w.start < 140 * DAY) days[dayKey(w.start)] = (days[dayKey(w.start)] || 0) + 1;

  return {
    generated: dayKey(now),
    totalWorkouts: workouts.length,
    since: dayKey(workouts.at(-1).start),
    thisYear: workouts.filter((w) => w.start.getFullYear() === now.getFullYear()).length,
    last30: workouts.filter((w) => now - w.start < 30 * DAY).length,
    totalVolumeLbs: Math.round(workouts.reduce((v, w) => v + volume(w), 0)),
    recent: workouts.slice(0, 5).map((w) => ({
      title: w.title,
      date: dayKey(w.start),
      minutes: w.end && w.end > w.start ? Math.round((w.end - w.start) / 60000) : null,
      exercises: new Set(w.sets.map((s) => s.exercise_title)).size,
      sets: work(w).length,
      volumeLbs: Math.round(volume(w)),
    })),
    days,
  };
}

/* ---------- Strava: activities.csv from the data export (Request Your Archive) ---------- */
export function stravaSummary(csvText, now = new Date()) {
  const [head, ...body] = parseCSV(csvText);
  if (!head || !head.includes('Activity Type') || !head.includes('Activity Date')) throw new Error('This does not look like a Strava activities export.');
  // The export repeats some headers (Distance, Elapsed Time); the later copies hold raw meters and seconds.
  const C = { id: head.indexOf('Activity ID'), date: head.indexOf('Activity Date'), name: head.indexOf('Activity Name'), type: head.indexOf('Activity Type'),
    moving: head.lastIndexOf('Moving Time'), dist: head.lastIndexOf('Distance'), elev: head.lastIndexOf('Elevation Gain') };
  const MI = 1609.344;
  let runs = body
    .filter((r) => /run/i.test(r[C.type]))
    .map((r) => ({ id: r[C.id], name: r[C.name], date: parseDate(r[C.date], { utc: true }),
      meters: parseFloat(r[C.dist]) || 0, movingSec: parseFloat(r[C.moving]) || 0, elevM: parseFloat(r[C.elev]) || 0 }))
    .filter((r) => r.date && r.meters > 0)
    .sort((a, b) => b.date - a.date);
  // drop duplicate uploads: same start within 2 minutes and distance within 5%
  runs = runs.filter((r, i) => !runs.slice(0, i).some((o) => Math.abs(o.date - r.date) < 120000 && Math.abs(o.meters - r.meters) / o.meters < 0.05));

  const totals = (list) => ({
    runs: list.length,
    miles: +(list.reduce((s, r) => s + r.meters, 0) / MI).toFixed(1),
    hours: +(list.reduce((s, r) => s + r.movingSec, 0) / 3600).toFixed(1),
    elevFt: Math.round(list.reduce((s, r) => s + r.elevM, 0) * 3.28084),
  });
  const iso = (d) => d.toISOString().slice(0, 10);
  const days = {};
  for (const r of runs) if (now - r.date < 140 * DAY) days[iso(r.date)] = +(((days[iso(r.date)] || 0) + r.meters / MI).toFixed(2));

  return {
    live: false,
    generated: dayKey(now),
    recent: totals(runs.filter((r) => now - r.date < 28 * DAY)),
    ytd: totals(runs.filter((r) => r.date.getUTCFullYear() === now.getFullYear())),
    all: totals(runs),
    runs: runs.slice(0, 6).map((r) => ({
      name: r.name, date: r.date.toISOString(),
      miles: +(r.meters / MI).toFixed(2), movingSec: Math.round(r.movingSec),
      paceSecPerMi: Math.round(r.movingSec / (r.meters / MI)), elevFt: Math.round(r.elevM * 3.28084),
      url: `https://www.strava.com/activities/${r.id}`,
    })),
    days,
  };
}

// File contents for assets/hevy-data.js / assets/strava-data.js
export function dataFile(kind, data, source) {
  const name = kind === 'hevy' ? 'HEVY' : 'STRAVA';
  return `// ${source} on ${data.generated}.\nwindow.${name} = ${JSON.stringify(data, null, 2)};\n`;
}
