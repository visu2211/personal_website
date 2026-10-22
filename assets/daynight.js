// Real-time day and night on a globe.gl globe: the half of Earth facing the sun shows daytime imagery,
// the other half city lights, with a soft terminator (sunset line) between them. Updates every minute.
// Usage: dayNight(world, { day: 'assets/globe/earth-day.jpg' })  (call after the globe is created)
window.dayNight = function dayNight(world, { day, nightGain = 1.0, dayGain = 1.0 } = {}) {
  const uniforms = { dayMap: { value: null }, sunDir: { value: null }, nightGain: { value: nightGain }, dayGain: { value: dayGain } };

  // where the sun is overhead right now: latitude from the season, longitude from UTC time
  function subsolarPoint(date = new Date()) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const dayOfYear = (date - start) / 86400000;
    const g = (2 * Math.PI / 365.25) * (dayOfYear - 1);
    // declination and equation of time (minutes), standard Fourier approximation
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
      + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    let lng = -(utcMin + eot - 720) / 4;                       // 4 minutes of time per degree
    lng = ((lng + 540) % 360) - 180;
    return { lat: decl * 180 / Math.PI, lng };
  }

  function updateSun() {
    const s = subsolarPoint();
    const p = world.getCoords(s.lat, s.lng, 0);
    const len = Math.hypot(p.x, p.y, p.z);
    const v = uniforms.sunDir.value;
    if (v) v.set(p.x / len, p.y / len, p.z / len);
  }

  function install() {
    const mat = world.globeMaterial();
    if (!mat.map || !mat.map.image) return setTimeout(install, 200);   // wait for the night texture
    const Vec3 = world.camera().position.constructor;
    uniforms.sunDir.value = new Vec3(1, 0, 0);
    updateSun();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = new mat.map.constructor(img);           // same Texture class as the globe's own map
      tex.colorSpace = mat.map.colorSpace; tex.anisotropy = mat.map.anisotropy;
      tex.wrapS = mat.map.wrapS; tex.wrapT = mat.map.wrapT; tex.needsUpdate = true;
      uniforms.dayMap.value = tex;

      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vWorldNormalDN;')
          .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWorldNormalDN = normalize(mat3(modelMatrix) * objectNormal);');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D dayMap;\nuniform vec3 sunDir;\nuniform float nightGain;\nuniform float dayGain;\nvarying vec3 vWorldNormalDN;')
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            float sunDot = dot(normalize(vWorldNormalDN), normalize(sunDir));
            float dayAmt = smoothstep(-0.08, 0.16, sunDot);                 // soft terminator
            vec3 dayCol = texture2D(dayMap, vMapUv).rgb * dayGain * (0.55 + 0.45 * clamp(sunDot * 1.6, 0.0, 1.0));
            vec3 nightCol = texture2D(map, vMapUv).rgb * nightGain;
            vec3 dusk = vec3(1.0, 0.45, 0.2) * 0.12 * (1.0 - abs(dayAmt * 2.0 - 1.0));   // warm glow along the sunset line
            gl_FragColor = vec4(mix(nightCol, dayCol, dayAmt) + dusk, 1.0);`);
      };
      mat.needsUpdate = true;
    };
    img.src = day;
    setInterval(updateSun, 60000);
  }
  install();
  return { subsolarPoint };
};
