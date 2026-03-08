// ==================== GLOBAL CONSTANTS ====================
const DIESEL_PRICE_PER_LITER = 94.5; // ₹ per liter
const SEA_LEVEL_RL = 525.5; // Fixed sea level height

// ==================== UTILITY FUNCTIONS ====================

// Haversine formula to calculate distance between two coordinates in kilometers
function haversineKm(coord1, coord2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2[0] - coord1[0]);
  const dLon = toRad(coord2[1] - coord1[1]);
  const lat1 = toRad(coord1[0]);
  const lat2 = toRad(coord2[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// ==================== FUEL AND COST CALCULATION ====================

// FIXED calculateFuelAndCost function for D7:
function calculateFuelAndCost(
  distance,
  pitch,
  movement,
  deviceId,
  timeDiffHours = 0,
) {
  console.log(
    `distance: ${distance} km, pitch: ${pitch}°, movement: ${movement}, deviceId: ${deviceId}, timeDiffHours: ${timeDiffHours}h`,
  );
  let fuel = 0;

  // For very small distances (less than 1 meter), use minimal fuel
  if (distance < 0.001) {
    // < 1 meter
    return {
      fuel: 0.000001, // 0.001 mL
      cost: 0.0,
    };
  }

  // Check if device actually moved (more than 1 meter)
  const isMoving = distance > 0.001; // > 1 meter

  // ALL DEVICES use distance-based when MOVING
  if (isMoving && distance > 0) {
    // Base: 1.52 km per liter = 0.6579 liters per km
    let litersPerKm = 1 / 1.52; // ~0.6579 L/km

    // Base fuel for this segment
    fuel = distance * litersPerKm; // distance in km

    // Apply gradient multiplier based on pitch
    const gradientMultiplier = getGradientMultiplier(pitch);

    // movement is already numeric (converted from string)
    const speedMultiplier = getSpeedMultiplier(movement);

    fuel = fuel * gradientMultiplier * speedMultiplier;

    //console.log(`🚚 Distance-based fuel for ${(distance*1000).toFixed(1)}m: ${(fuel*1000).toFixed(1)}mL`);
  }
  // Only use time-based for STATIONARY excavator
  else if (deviceId === "D7" && !isMoving) {
    // Cap timeDiffHours to reasonable maximum
    const MAX_TIME_GAP_HOURS = 1.0; // Maximum 1 hour between readings
    const realisticTimeDiff = Math.min(timeDiffHours, MAX_TIME_GAP_HOURS);

    // 15 liters per hour (only when NOT moving)
    fuel = 15 * realisticTimeDiff;

    console.log(
      `🏗️ Stationary excavator time: ${timeDiffHours.toFixed(2)}h → ${realisticTimeDiff.toFixed(2)}h = ${fuel.toFixed(3)}L`,
    );
  }
  // Minimal fuel for stationary non-excavator
  else {
    fuel = 0.00001; // 0.01 mL minimal fuel
  }

  const cost = fuel * DIESEL_PRICE_PER_LITER;

  return {
    fuel: parseFloat(fuel.toFixed(6)),
    cost: parseFloat(cost.toFixed(2)),
  };
}

// Gradient multiplier function (based on pitch)
function getGradientMultiplier(pitch = 0) {
  const pitchValue = Number(pitch);
  if (pitchValue <= -5) return 0.25; // Downhill
  if (pitchValue > -5 && pitchValue <= 3) return 0.65; // Flat
  if (pitchValue > 3 && pitchValue <= 8) return 1.3; // Mild uphill
  return 2.0; // Steep uphill
}

// Speed multiplier function
function getSpeedMultiplier(speed = 0) {
  const speedValue = Number(speed);
  if (speedValue <= 5) return 0.9; // Idle / slow
  if (speedValue <= 20) return 1.0; // Normal
  if (speedValue <= 35) return 1.1; // Loaded
  return 1.25; // Overspeed / stress
}

// Utility: remove null / undefined fields
function removeEmptyFields(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}
function formatIST(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

module.exports = {
  calculateFuelAndCost,
  removeEmptyFields,
  haversineKm,
  formatIST,
  SEA_LEVEL_RL,
  DIESEL_PRICE_PER_LITER,
};
