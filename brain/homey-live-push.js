// =====================================================
// HOMEY LIVE PUSH — Envoie les données en temps réel
// =====================================================
// Déployer sur Homey comme script planifié, ou en boucle.
// Envoie batteries + solaire + réseau vers Netlify toutes les 10s.
// =====================================================

const NETLIFY_URL = 'https://dashboard-marstek.netlify.app/.netlify/functions/energy';
const INTERVAL_MS = 10000; // 10 secondes

const BATTERIES = {
  batterie1: { id: 'b2302309-a297-4732-9f9f-54aed7cb311f', name: 'Batterie_1' },
  batterie2: { id: '0d3db87e-f2e2-42ee-818e-fe1eda72ea31', name: 'Batterie_2' },
  batterie3: { id: 'fe7d4c65-1650-463f-b417-5431fb35bf1d', name: 'Batterie_3' },
  batterie4: { id: 'e96ac099-bbac-4fd5-a9ce-d56e98637eb3', name: 'Batterie_4' }
};

const SHELLY_NAME      = 'Shelly Pro 3EM';
const VAR_SOLAR        = 'Production Solaire';
const VAR_TEMPO_TODAY  = 'marstek_tempo_today';
const VAR_TEMPO_TMRW   = 'marstek_tempo_tomorrow';
const VAR_SCRIPT_VER   = 'marstek_script_version';

function dirFromPower(p) {
  if (p > 30)  return 'CHARGING';
  if (p < -30) return 'DISCHARGING';
  return 'IDLE';
}

async function getVarValue(name) {
  try {
    const vars = await Homey.logic.getVariables();
    const v = Object.values(vars).find(x => x.name === name);
    return v ? v.value : null;
  } catch (e) { return null; }
}

async function collectData() {
  const devices = await Homey.devices.getDevices();

  // ── Batteries ──
  const batteries = [];
  for (const key in BATTERIES) {
    const cfg = BATTERIES[key];
    const dev = Object.values(devices).find(d => d.id === cfg.id);
    if (!dev) {
      batteries.push({ name: cfg.name, online: false, soc: null, powerW: 0, temp: null, direction: 'STALE', blacklisted: false });
      continue;
    }
    const caps = dev.capabilitiesObj || {};
    const power = caps.measure_power_ongrid?.value != null ? Number(caps.measure_power_ongrid.value) : 0;
    const soc   = caps.measure_battery?.value != null ? Number(caps.measure_battery.value) : null;
    const temp  = caps.measure_temperature?.value != null ? Number(caps.measure_temperature.value) : null;
    batteries.push({
      name:      cfg.name,
      online:    dev.available !== false,
      soc:       soc,
      powerW:    power,
      temp:      temp,
      direction: dev.available === false ? 'STALE' : dirFromPower(power),
      blacklisted: false
    });
  }

  // ── Shelly ──
  const shelly = Object.values(devices).find(d => (d.name || '').includes(SHELLY_NAME));
  const gridW  = shelly ? Number(shelly.capabilitiesObj?.measure_power?.value || 0) : 0;
  const shellyOnline = shelly ? shelly.available !== false : false;

  // ── Solaire ──
  const solarKw  = Number(await getVarValue(VAR_SOLAR) || 0);
  const solarW   = Math.round(solarKw * 1000);

  // ── Tempo ──
  const tempoToday = await getVarValue(VAR_TEMPO_TODAY) || 'INCONNU';
  const tempoTmrw  = await getVarValue(VAR_TEMPO_TMRW)  || 'INCONNU';

  // ── Script version ──
  const scriptVersion = await getVarValue(VAR_SCRIPT_VER) || 'inconnu';

  return {
    updatedAt: new Date().toISOString(),
    batteries,
    solar:  { productionW: solarW },
    grid:   { powerW: Math.round(gridW) },
    shelly: { online: shellyOnline, gridPower: gridW },
    tempo:  { today: tempoToday, tomorrow: tempoTmrw },
    events: {},
    scriptVersion
  };
}

async function pushToNetlify(data) {
  try {
    const resp = await fetch(NETLIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    if (!resp.ok) {
      console.log('PUSH erreur HTTP ' + resp.status);
    }
  } catch (e) {
    console.log('PUSH erreur réseau: ' + e.message);
  }
}

// ── Boucle principale ──
async function loop() {
  while (true) {
    try {
      const data = await collectData();
      await pushToNetlify(data);
      console.log(new Date().toLocaleTimeString() + ' | PUSH OK | Bat1=' + (data.batteries[0]?.soc ?? '?') + '% | Grid=' + data.grid.powerW + 'W | Solar=' + data.solar.productionW + 'W');
    } catch (e) {
      console.log('ERREUR LOOP: ' + e.message);
    }
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }
}

loop();
