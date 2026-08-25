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


// ── CLIMATISATION (splits pilotés en infrarouge) ──
// La liaison est à sens unique : l'émetteur IR envoie l'ordre, l'unité ne répond jamais.
// Ce qu'on remonte ici est donc la DERNIÈRE COMMANDE connue de Homey, pas un état mesuré.
// Pour que le dashboard puisse le dire honnêtement, on pousse aussi :
//   - lastCommandAt : quand la commande est partie (capabilitiesObj[...].lastUpdated) ;
//   - roomTemp      : la température de la pièce, si un vrai capteur existe dans la zone ;
//   - powerW        : la puissance mesurée, si l'unité est derrière une prise mesurée.
// Laisser CLIM_DEVICES vide pour l'auto-détection, ou lister les IDs exacts pour figer
// la sélection (ex. si l'auto-détection attrape un appareil qui n'est pas une clim) :
//   const CLIM_DEVICES = { salon: { id: 'xxxx-...', name: 'Clim Salon' } };
const CLIM_DEVICES   = {};
const CLIM_NAME_RE   = /clim|climatisation|split|airco|daikin|mitsubishi/i;
const CLIM_CLASSES   = ['thermostat', 'airconditioning'];
const CLIM_MODE_CAPS = ['thermostat_mode', 'ac_mode', 'operating_mode', 'mode'];
const CLIM_FAN_CAPS  = ['fan_speed', 'ac_fan_speed', 'fan_mode', 'fan_rate'];

const SHELLY_NAME      = 'Shelly Pro 3EM';
const VAR_SOLAR        = 'Production Solaire';
const VAR_TEMPO_TODAY  = 'marstek_tempo_today';
const VAR_TEMPO_TMRW   = 'marstek_tempo_tomorrow';
const VAR_SCRIPT_VER   = 'marstek_script_version';

// ── Helpers climatisation ──
function capVal(caps, name) {
  const c = caps ? caps[name] : null;
  return c && c.value !== undefined && c.value !== null ? c.value : null;
}

function capUpdated(caps, name) {
  const c = caps ? caps[name] : null;
  return c && c.lastUpdated ? c.lastUpdated : null;
}

function firstCapValue(caps, names) {
  for (const n of names) {
    const v = capVal(caps, n);
    if (v !== null) return v;
  }
  return null;
}

function isClimDevice(dev, explicitIds) {
  if (explicitIds.length) return explicitIds.includes(dev.id);
  if (CLIM_CLASSES.includes(dev.class)) return true;
  return CLIM_NAME_RE.test(dev.name || '');
}

// Température réelle de la pièce : d'abord le capteur de l'appareil lui-même
// (les émetteurs IR en embarquent souvent un), sinon n'importe quel capteur de
// température de la même zone. C'est la seule mesure fiable côté clim.
function findRoomTemp(dev, devices) {
  const own = capVal(dev.capabilitiesObj, 'measure_temperature');
  if (own !== null) return { value: Number(own), source: dev.name };
  if (!dev.zone) return null;
  const sensor = Object.values(devices).find(d =>
    d.id !== dev.id &&
    d.zone === dev.zone &&
    capVal(d.capabilitiesObj, 'measure_temperature') !== null
  );
  if (!sensor) return null;
  return { value: Number(capVal(sensor.capabilitiesObj, 'measure_temperature')), source: sensor.name };
}

// Date de la dernière commande = le plus récent des lastUpdated des capacités pilotables.
function lastCommandAt(caps) {
  const stamps = ['onoff', 'target_temperature']
    .concat(CLIM_MODE_CAPS)
    .concat(CLIM_FAN_CAPS)
    .map(n => capUpdated(caps, n))
    .filter(Boolean)
    .map(s => new Date(s).getTime())
    .filter(t => isFinite(t));
  if (!stamps.length) return null;
  return new Date(Math.max.apply(null, stamps)).toISOString();
}

function collectClim(devices) {
  const explicitIds = Object.values(CLIM_DEVICES).map(c => c.id);
  const units = [];

  for (const dev of Object.values(devices)) {
    if (!isClimDevice(dev, explicitIds)) continue;
    const caps  = dev.capabilitiesObj || {};
    const room  = findRoomTemp(dev, devices);
    const powW  = capVal(caps, 'measure_power');
    const onoff = capVal(caps, 'onoff');
    const cfg   = Object.values(CLIM_DEVICES).find(c => c.id === dev.id);

    units.push({
      id:             dev.id,
      name:           cfg ? cfg.name : dev.name,
      zone:           dev.zoneName || '',
      online:         dev.available !== false,
      power:          onoff === null ? null : Boolean(onoff),
      mode:           firstCapValue(caps, CLIM_MODE_CAPS),
      target:         capVal(caps, 'target_temperature'),
      roomTemp:       room ? room.value : null,
      roomTempSource: room ? room.source : null,
      fan:            firstCapValue(caps, CLIM_FAN_CAPS),
      // Sans mesure de puissance propre, l'unité est en aveugle : IR = aucun retour d'état.
      openLoop:       powW === null,
      powerW:         powW === null ? null : Number(powW),
      lastCommandAt:  lastCommandAt(caps)
    });
  }

  units.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr'));
  return units;
}

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

  // ── Climatisation (splits IR) ──
  const climatisation = collectClim(devices);

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
    climatisation,
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
      console.log(new Date().toLocaleTimeString() + ' | PUSH OK | Bat1=' + (data.batteries[0]?.soc ?? '?') + '% | Grid=' + data.grid.powerW + 'W | Solar=' + data.solar.productionW + 'W | Clim=' + data.climatisation.length);
    } catch (e) {
      console.log('ERREUR LOOP: ' + e.message);
    }
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }
}

loop();
