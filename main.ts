import { createDriveSafeSDK } from './sdk/index';

const driveSafe = createDriveSafeSDK({
  speedThresholdKmh: 15,
  stationaryDebounceSeconds: 4,
  zeroToleranceInHotspots: true,
  maxWarningStrikes: 3
});

const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedDisplay = document.getElementById('speed-display') as HTMLElement;
const hotspotSelect = document.getElementById('hotspot-select') as HTMLSelectElement;
const globalHotspotPill = document.getElementById('global-hotspot-pill') as HTMLElement;
const globalHotspotStatus = document.getElementById('global-hotspot-status') as HTMLElement;

const fsmStatusBadge = document.getElementById('fsm-status-badge') as HTMLElement;
const shieldActiveVal = document.getElementById('shield-active-val') as HTMLElement;
const debounceVal = document.getElementById('debounce-val') as HTMLElement;
const strikesVal = document.getElementById('strikes-val') as HTMLElement;
const safetyScoreVal = document.getElementById('safety-score-val') as HTMLElement;

const driveSafeShield = document.getElementById('drivesafe-shield') as HTMLElement;
const shieldAlertBanner = document.getElementById('shield-alert-banner') as HTMLElement;
const alertTitle = document.getElementById('alert-title') as HTMLElement;
const alertDesc = document.getElementById('alert-desc') as HTMLElement;
const debounceCountdownBanner = document.getElementById('debounce-countdown-banner') as HTMLElement;
const debounceSecondsNumber = document.getElementById('debounce-seconds-number') as HTMLElement;
const debounceSubSec = document.getElementById('debounce-sub-sec') as HTMLElement;

const logStream = document.getElementById('log-stream') as HTMLElement;
const currentLocationText = document.getElementById('current-location-text') as HTMLElement;

const LOCATION_COORDINATES: Record<string, { lat: number; lon: number; label: string }> = {
  standard: { lat: 12.9716, lon: 77.6412, label: 'Indiranagar 100ft Road' },
  btp_silkboard: { lat: 12.9177, lon: 77.6238, label: 'Central Silk Board Junction (BTP Blackspot)' },
  btp_tinfactory: { lat: 12.9972, lon: 77.6698, label: 'Tin Factory / KR Puram Node (BTP Blackspot)' },
  btp_hebbal: { lat: 13.0358, lon: 77.5970, label: 'Hebbal Flyover Expressway (BTP Blackspot)' },
  btp_marathahalli: { lat: 12.9562, lon: 77.7011, label: 'Marathahalli Multiplex Junction (BTP Blackspot)' },
  btp_ecity_toll: { lat: 12.8452, lon: 77.6602, label: 'Electronic City Tollway Exit (BTP Blackspot)' }
};

let currentCoords = LOCATION_COORDINATES['standard'];

function logMessage(category: 'system' | 'allowed' | 'infraction' | 'penalty', text: string) {
  const d = new Date();
  const timeStr = d.toTimeString().split(' ')[0] + '.' + Math.floor(d.getMilliseconds() / 100);
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + category;
  entry.innerHTML = '<span class="time">[' + timeStr + ']</span> <span class="msg">' + text + '</span>';
  logStream.appendChild(entry);
  logStream.scrollTop = logStream.scrollHeight;
}

driveSafe.onStateChange((state) => {
  speedDisplay.textContent = state.activeSpeedKmh.toString();
  shieldActiveVal.textContent = state.isShieldActive ? 'ACTIVE (LOCKED)' : 'INACTIVE (FREE)';
  shieldActiveVal.style.color = state.isShieldActive ? 'var(--accent-rose)' : 'var(--accent-emerald)';

  strikesVal.textContent = state.currentStrikes + ' / 3';
  safetyScoreVal.textContent = state.safetyScore.toString();

  if (state.isShieldActive) {
    if (state.debounceRemainingSeconds > 0) {
      fsmStatusBadge.textContent = 'DEBOUNCE TIMER (' + state.debounceRemainingSeconds + 's)';
      fsmStatusBadge.className = 'status-indicator locked';
    } else {
      fsmStatusBadge.textContent = 'MOTION LOCKED (' + state.activeSpeedKmh + ' km/h)';
      fsmStatusBadge.className = 'status-indicator locked';
    }
  } else {
    fsmStatusBadge.textContent = 'STATIONARY / UNLOCKED';
    fsmStatusBadge.className = 'status-indicator';
  }

  if (state.debounceRemainingSeconds > 0) {
    debounceVal.textContent = state.debounceRemainingSeconds + 's remaining';
    debounceVal.style.color = 'var(--accent-amber)';
    debounceCountdownBanner.classList.remove('hidden');
    debounceSecondsNumber.textContent = state.debounceRemainingSeconds.toString();
    debounceSubSec.textContent = state.debounceRemainingSeconds.toString();
  } else {
    debounceVal.textContent = state.isStationary ? 'REST (0s)' : 'IN MOTION';
    debounceVal.style.color = 'var(--text-muted)';
    debounceCountdownBanner.classList.add('hidden');
  }

  if (state.isInHotspot) {
    globalHotspotPill.classList.add('active-hotspot');
    globalHotspotStatus.textContent = (state.activeHotspot ? state.activeHotspot.name.slice(0, 24) : 'BTP') + '... (ZERO-TOLERANCE)';
  } else {
    globalHotspotPill.classList.remove('active-hotspot');
    globalHotspotStatus.textContent = 'STANDARD ZONE';
  }

  if (state.isShieldActive) {
    driveSafeShield.classList.remove('hidden');
  } else {
    driveSafeShield.classList.add('hidden');
  }
});

driveSafe.onInfraction((infraction) => {
  logMessage(
    infraction.actionTaken === 'ZERO_TOLERANCE_PENALTY' ? 'penalty' : 'infraction',
    '🚨 [INFRACTION BLOCKED] Tap on #' + infraction.blockedTargetId + ' intercepted at ' + infraction.speedKmh + ' km/h. (' + infraction.actionTaken + ')'
  );

  shieldAlertBanner.classList.remove('hidden');
  if (infraction.actionTaken === 'ZERO_TOLERANCE_PENALTY') {
    alertTitle.textContent = 'HOTSPOT VIOLATION: RATING PENALTY!';
    alertDesc.textContent = 'Zero-tolerance strike applied inside ' + (infraction.hotspotName || 'BTP Zone') + '.';
  } else if (infraction.actionTaken === 'RATING_PENALTY') {
    alertTitle.textContent = '3 STRIKES REACHED: RATING PENALTY!';
    alertDesc.textContent = 'Multiple infractions logged while moving. Internal score lowered.';
  } else {
    alertTitle.textContent = 'TOUCH BLOCKED! (STRIKE ' + infraction.strikeNumber + ' OF 3)';
    alertDesc.textContent = 'Do not interact with menus while vehicle is in motion.';
  }

  setTimeout(() => {
    shieldAlertBanner.classList.add('hidden');
  }, 2400);
});

driveSafe.onRatingPenalty((reason, deductions, newScore) => {
  logMessage('penalty', '💥 [PENALTY APPLIED] -' + deductions + ' pts. New Safety Score: ' + newScore + '/100. Reason: ' + reason);
});

function emitTelematics(speed: number) {
  driveSafe.processTelematics({
    timestamp: Date.now(),
    speedKmh: speed,
    latitude: currentCoords.lat,
    longitude: currentCoords.lon,
    accelerometerG: { x: 0, y: speed > 0 ? 0.3 : 0, z: 0.98 }
  });
}

speedSlider.addEventListener('input', (e) => {
  const speed = parseInt((e.target as HTMLInputElement).value, 10);
  emitTelematics(speed);
});

document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    const target = e.currentTarget as HTMLElement;
    target.classList.add('active');
    const speed = parseInt(target.getAttribute('data-speed') || '0', 10);
    speedSlider.value = speed.toString();
    emitTelematics(speed);
  });
});

hotspotSelect.addEventListener('change', (e) => {
  const key = (e.target as HTMLSelectElement).value;
  currentCoords = LOCATION_COORDINATES[key];
  currentLocationText.textContent = currentCoords.label;
  logMessage('system', '📍 GPS relocated to: ' + currentCoords.label);
  emitTelematics(parseInt(speedSlider.value, 10));
});

const interactiveTargets = document.querySelectorAll('.interactive-target');
interactiveTargets.forEach((el) => {
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetType = (el.getAttribute('data-target-type') || 'BLOCKED_MENU') as 'MAP' | 'SOS' | 'BLOCKED_MENU';
    const rect = el.getBoundingClientRect();
    const evalResult = driveSafe.evaluateTouchInput(rect.left, rect.top, targetType, el.id);

    if (evalResult.allowed) {
      if (targetType === 'SOS') {
        logMessage('allowed', '🆘 [SOS PUNCH-THROUGH] Emergency bypass verified! Native dialer opened.');
        alert('🚨 SOS EMERGENCY PUNCH-THROUGH: Connecting directly to Police / 112...');
      } else if (targetType === 'MAP') {
        logMessage('allowed', '🗺️ [MAP PUNCH-THROUGH] Navigation pan/zoom touch allowed while moving.');
      }
    }
  });
});

document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
  logStream.innerHTML = '';
  logMessage('system', 'Logs cleared.');
});

document.getElementById('scenario-red-light')?.addEventListener('click', () => {
  logMessage('system', '🚦 Running Scenario: Approaching Red Light (Speed drops 35 -> 0 km/h)');
  speedSlider.value = '0';
  emitTelematics(0);
});

document.getElementById('scenario-enter-silkboard')?.addEventListener('click', () => {
  hotspotSelect.value = 'btp_silkboard';
  currentCoords = LOCATION_COORDINATES['btp_silkboard'];
  currentLocationText.textContent = currentCoords.label;
  logMessage('system', '📍 Running Scenario: Vehicle crossed into Silk Board Junction');
  emitTelematics(32);
  speedSlider.value = '32';
});

document.getElementById('scenario-tap-blocked')?.addEventListener('click', () => {
  speedSlider.value = '40';
  emitTelematics(40);
  const btnChat = document.getElementById('btn-chat-customer');
  btnChat?.click();
});

document.getElementById('scenario-tap-sos')?.addEventListener('click', () => {
  speedSlider.value = '60';
  emitTelematics(60);
  const btnSos = document.getElementById('btn-emergency-sos');
  btnSos?.click();
});

const payloadModal = document.getElementById('payload-modal') as HTMLElement;
const payloadJsonContent = document.getElementById('payload-json-content') as HTMLElement;

document.getElementById('btn-export-payload')?.addEventListener('click', () => {
  const payload = driveSafe.generateInsurerAuditPayload();
  payloadJsonContent.textContent = JSON.stringify(payload, null, 2);
  payloadModal.classList.remove('hidden');
});

document.getElementById('btn-close-modal')?.addEventListener('click', () => {
  payloadModal.classList.add('hidden');
});

document.getElementById('btn-dismiss-modal')?.addEventListener('click', () => {
  payloadModal.classList.add('hidden');
});

document.getElementById('btn-copy-payload')?.addEventListener('click', () => {
  navigator.clipboard.writeText(payloadJsonContent.textContent || '');
  alert('Copied encrypted payload JSON to clipboard!');
});

emitTelematics(0);
logMessage('system', 'Ready. Move the speed slider above 15 km/h to see the Touch Shield engage.');
