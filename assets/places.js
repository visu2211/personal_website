// ─────────────────────────────────────────────────────────────────────────────
// SCRAPBOOK DATA: edit this file to add trips and photos.
//
// 1. Drop photos into the /scrapbook folder (JPG/PNG/WebP, ideally < 500 KB each).
// 2. Add an entry below (or add to an existing one's `photos` list):
//      {
//        name: 'Yosemite National Park',      // shown on the card and the map
//        region: 'California',                 // state or country
//        lat: 37.8651, lng: -119.5383,         // right-click a spot in Google Maps to copy these
//        date: '2026-07',                      // YYYY-MM, optional: dated places are ordered by date; undated ones follow in list order
//        tag: 'Road trip',                     // short label
//        kind: 'visited',                      // home | school | work | visited (sets the pin color on the globe)
//        note: 'Half Dome at sunrise.',        // a line or two
//        photos: ['scrapbook/yosemite-1.jpg', 'scrapbook/yosemite-2.jpg'],
//      },
// 3. Redeploy. Places are sorted by date automatically.
// ─────────────────────────────────────────────────────────────────────────────
window.PLACES = [
  {
    name: 'Princeton', region: 'New Jersey', lat: 40.3573, lng: -74.6672, date: '',  // no date = shown first as home
    kind: 'home', tag: 'Hometown', note: 'Where it all started.', photos: [],
  },
  {
    name: 'New Brunswick', region: 'New Jersey', lat: 40.5008, lng: -74.4474, date: '2023-09',
    kind: 'school', tag: 'Rutgers', note: 'Four years of classes, recitations, and late nights at the library.', photos: [],
  },
  {
    name: 'McLean', region: 'Virginia', lat: 38.9339, lng: -77.1773, date: '2025-06',
    kind: 'work', tag: 'Internship', note: 'My first summer at Capital One.', photos: [],
  },
  {
    name: 'New York City', region: 'New York', lat: 40.7128, lng: -74.006, date: '2026-06',
    kind: 'work', tag: 'Internship', note: 'Capital One, round two. Summer in the city.', photos: [],
  },
  {
    name: 'San Francisco', region: 'California', lat: 37.7749, lng: -122.4194, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'San Diego', region: 'California', lat: 32.7157, lng: -117.1611, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'College Park', region: 'Maryland', lat: 38.9807, lng: -76.9369, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Boston', region: 'Massachusetts', lat: 42.3601, lng: -71.0589, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Philadelphia', region: 'Pennsylvania', lat: 39.9526, lng: -75.1652, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Dublin', region: 'Ireland', lat: 53.3498, lng: -6.2603, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Galway', region: 'Ireland', lat: 53.2707, lng: -9.0568, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Madrid', region: 'Spain', lat: 40.4168, lng: -3.7038, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Toledo', region: 'Spain', lat: 39.8628, lng: -4.0273, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Rome', region: 'Italy', lat: 41.9028, lng: 12.4964, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Bern', region: 'Switzerland', lat: 46.948, lng: 7.4474, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Zurich', region: 'Switzerland', lat: 47.3769, lng: 8.5417, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Interlaken', region: 'Switzerland', lat: 46.6863, lng: 7.8632, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
  {
    name: 'Jungfrau', region: 'Switzerland', lat: 46.5475, lng: 7.9853, date: '',
    kind: 'visited', tag: 'Trip', note: '', photos: [],
  },
];
