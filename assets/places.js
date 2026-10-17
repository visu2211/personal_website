// ─────────────────────────────────────────────────────────────────────────────
// SCRAPBOOK DATA: edit this file to add trips and photos.
//
// 1. Drop photos into the /scrapbook folder (JPG/PNG/WebP, ideally < 500 KB each).
// 2. Add an entry below (or add to an existing one's `photos` list):
//      {
//        name: 'Yosemite National Park',      // shown on the card and the map
//        region: 'California',                 // state or country
//        lat: 37.8651, lng: -119.5383,         // right-click a spot in Google Maps to copy these
//        date: '2026-07',                      // YYYY-MM, used for ordering and the route line
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
];
