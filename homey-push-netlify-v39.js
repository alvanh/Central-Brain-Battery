// HomeyScript V39-PUSH-NETLIFY
// Objectif : envoyer les vraies données Homey vers Netlify.
// Remplacer NETLIFY_ENDPOINT par ton URL Netlify.

const NETLIFY_ENDPOINT = 'https://TON-SITE.netlify.app/.netlify/functions/energy';

const BATTERIES = {
  batterie1: { id: '0d3db87e-f2e2-42ee-818e-fe1eda72ea31', name: 'Batterie_1' },
  batterie2: { id: '7cae1822-f159-4d81-a071-c078589fb74b', name: 'Batterie_2' },
  batterie3: { id: 'b2302309-a297-4732-9f9f-54aed7cb311f', name: 'Batterie_3' },
  batterie4: { id: 'fe7d4c65-1650-463f-b417-5431fb35bf1d', name: 'Batterie_4' }
};

const SHELLY_NAME_PART = 'Shelly Pro 3EM';
const PRODUCTION_SOLAIRE_VAR_ID = '177acdbb-b770-41df-95a6-98a755840b96';
const ACTIVE_POWER_THRESHOLD = 30;

async function getAllDevices() {
  return await Homey.devices.getDevices();
}

async function getDeviceById(id) {
  const devices = await getAllDevices();
  return Object.values(devices).find(d => d.id === id) || null;
}

async function getProductionSolaire() {
  try {
    const variable = await Homey.logic.getVariable({ id: PRODUCTION_SOLAIRE_VAR_ID });
    return Number(variable.value) || 0;
  } catch (err) {
    return 0;
  }
}

async function getShellyDevice() {
  const devices = await getAllDevices();
  for (const d of Object.values(devices)) {
    if ((d.name || '').includes(SHELLY_NAME_PART)) return d;
  }
  return null;
}

async function getShellyGridPower() {
  const shelly = await getShellyDevice();
  if (!shelly) return null;

  const caps = shelly.capabilitiesObj || {};
  if (caps.measure_power) return Number(caps.measure_power.value) || 0;

  let total = 0;
  let found = false;
  for (const key in caps) {
    if (key.includes('power')) {
      const value = Number(caps[key].value);
      if (!isNaN(value)) {
        total += value;
        found = true;
      }
    }
  }
  return found ? total : null;
}

function getDirection(power) {
  if (power < -ACTIVE_POWER_THRESHOLD) return 'CHARGING';
  if (power > ACTIVE_POWER_THRESHOLD) return 'DISCHARGING';
  return 'IDLE';
}

async function readBattery(key) {
  const battery = BATTERIES[key];
  const device = await getDeviceById(battery.id);

  if (!device) {
    return {
      key,
      name: battery.name,
      online: false,
      soc: null,
      powerW: null,
      direction: 'UNKNOWN',
      mode: 'unknown'
    };
  }

  const caps = device.capabilitiesObj || {};
  const soc = caps.measure_battery ? Number(caps.measure_battery.value) : null;

  let power = 0;
  if (caps.measure_power_ongrid && caps.measure_power_ongrid.value !== null) {
    power = Number(caps.measure_power_ongrid.value) || 0;
  } else if (caps.measure_power && caps.measure_power.value !== null) {
    power = Number(caps.measure_power.value) || 0;
  }

  const direction = getDirection(power);

  return {
    key,
    name: battery.name,
    online: true,
    soc,
    powerW: power,
    direction,
    mode:
      direction === 'CHARGING' ? 'decharge' :
      direction === 'DISCHARGING' ? 'charge' :
      'attente'
  };
}

// IMPORTANT : si dans ton affichage les signes sont inversés,
// inverse seulement les libellés ci-dessus. Les watts Homey sont conservés bruts.

async function buildPayload() {
  const productionKw = await getProductionSolaire();
  const gridPowerW = await getShellyGridPower();

  const batteries = [];
  for (const key of Object.keys(BATTERIES)) {
    batteries.push(await readBattery(key));
  }

  const batteryTotalW = batteries.reduce((sum, b) => sum + (Number(b.powerW) || 0), 0);

  return {
    updatedAt: new Date().toISOString(),
    source: 'Homey',
    solar: {
      productionKw,
      productionW: Math.round(productionKw * 1000)
    },
    grid: {
      powerW: gridPowerW
    },
    batteries,
    totals: {
      batteryPowerW: batteryTotalW
    }
  };
}

const payload = await buildPayload();

console.log(JSON.stringify(payload, null, 2));

const response = await fetch(NETLIFY_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

console.log('Netlify status: ' + response.status);
console.log(await response.text());

return payload;
