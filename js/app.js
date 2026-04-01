/* ═══════════════════════════════════════════════════════════════════════════
   Saiyan Tracker — app.js
   All JS extracted from index.html with Sprint 1 fixes + streaks + transformations
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Constants & Storage Keys
// ═══════════════════════════════════════════════════════════════════════════

const STEPS_KEY        = 'st_steps';
const SLEEP_KEY        = 'st_sleep';
const WATER_KEY        = 'st_water';
const GOAL_KEY         = 'st_goal';
const WGOAL_KEY        = 'st_wgoal';
const SENS_KEY         = 'st_sens';
const RUNNING_KEY      = 'st_running';
const ACTIVE_MS_KEY    = 'st_active_ms';
const ACTIVE_START_KEY = 'st_active_start';
const LAST_DRINK_KEY   = 'st_last_drink';
const STREAK_KEY       = 'st_streak';
const TOTAL_STEPS_KEY  = 'st_total_steps';
const LAST_DATE_KEY    = 'st_last_date';
const SLEEP_SESSION_KEY = 'st_sleep_session';

// Named constants (fix #2) — no magic numbers
const STEP_TO_KM         = 0.00075;
const STEP_TO_KCAL       = 0.04;
const RING_CIRCUMFERENCE = 276.46;
const GLASS_ML           = 250;
const SLEEP_CONFIRM_MS   = 5 * 60 * 1000;     // 5 min stillness
const STILLNESS_THRESH   = 0.5;
const STEP_DEBOUNCE_MS   = 300;
const WATER_REMINDER_MS  = 2 * 60 * 60 * 1000; // 2 hours
const MAX_STEPS          = 999999;
const MAX_WATER          = 50;
const MIN_SLEEP_MS       = 30 * 60 * 1000;     // 30 min
const MAX_SLEEP_MS       = 16 * 3600 * 1000;   // 16 hours
const SLEEP_PERFECT_H    = 8;
const GOAL_STEP_SIZE     = 1000;
const GOAL_MIN           = 1000;
const GOAL_MAX           = 50000;
const WATER_GOAL_STEP    = 2;
const WATER_GOAL_MIN     = 4;
const WATER_GOAL_MAX     = 20;

// Transformation levels — total all-time steps
const TRANSFORMATIONS = [
  { name: 'Humain',           minSteps: 0,        emoji: '🧍' },
  { name: 'Saiyan',           minSteps: 50000,     emoji: '💪' },
  { name: 'Super Saiyan',     minSteps: 200000,    emoji: '⚡' },
  { name: 'Super Saiyan 2',   minSteps: 500000,    emoji: '⚡⚡' },
  { name: 'Super Saiyan 3',   minSteps: 1000000,   emoji: '🔥' },
  { name: 'Super Saiyan God',  minSteps: 2500000,  emoji: '🔴' },
  { name: 'Super Saiyan Blue', minSteps: 5000000,  emoji: '🔵' },
  { name: 'Ultra Instinct',    minSteps: 10000000, emoji: '🤍' },
];


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/** Returns today's date as YYYY-MM-DD in LOCAL timezone (fix #1) */
function todayIso() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Format number with French locale */
function fmtNum(n) { return n.toLocaleString('fr-FR'); }

/** Format milliseconds as HhMM */
function formatHM(ms) {
  var totalMin = Math.round(ms / 60000);
  var h = Math.floor(totalMin / 60);
  var m = totalMin % 60;
  return h + 'h' + (m < 10 ? '0' : '') + m;
}

/** Format timestamp as HH:MM */
function fmtTime(ts) {
  if (!ts) return '\u2014';
  var d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Toast Notification (fix #3)
// ═══════════════════════════════════════════════════════════════════════════

var _toastTimer = null;
function showToast(msg, durationMs) {
  if (durationMs === undefined) durationMs = 2500;
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, durationMs);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Safe localStorage Helpers (fix #5, #6)
// ═══════════════════════════════════════════════════════════════════════════

function safeGet(key, fallback) {
  try {
    var val = localStorage.getItem(key);
    return val !== null ? val : (fallback !== undefined ? fallback : null);
  } catch (e) {
    showToast('Erreur lecture stockage');
    return fallback !== undefined ? fallback : null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    showToast('Stockage plein ! Libere de l\'espace.');
  }
}

function getHistory(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch (e) { showToast('Erreur lecture historique'); return {}; }
}

function setHistory(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); }
  catch (e) { showToast('Stockage plein ! Historique non sauvegarde.'); }
}

function todayVal(key) { return getHistory(key)[todayIso()] || 0; }

function saveTodayVal(key, val) {
  var h = getHistory(key);
  h[todayIso()] = val;
  setHistory(key, h);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: Application State
// ═══════════════════════════════════════════════════════════════════════════

var stepCount      = 0;
var dailyGoal      = 10000;
var threshold      = 12;
var isRunning      = false;
var lastAccel      = 0;
var lastStepTime   = 0;
var activeStart    = null;
var totalActiveMs  = 0;
var motionGranted  = false;

var sleepMode       = false;
var sleepStart      = null;
var sleepConfirmed  = false;
var stillnessStart  = null;
var lastSleepAccel  = Infinity;
var sleepCheckInterval = null;

var waterGoal      = 8;
var waterCount     = 0;
var waterReminderInterval = null;


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Streak System (fix #16)
// ═══════════════════════════════════════════════════════════════════════════

function getStreak() {
  try {
    var data = JSON.parse(safeGet(STREAK_KEY, '{"count":0,"lastDate":""}'));
    return data;
  } catch (e) { return { count: 0, lastDate: '' }; }
}

function updateStreak() {
  var streak = getStreak();
  var today = todayIso();
  var stepsH = getHistory(STEPS_KEY);
  var todaySteps = stepsH[today] || 0;

  if (todaySteps >= dailyGoal) {
    if (streak.lastDate === today) {
      // Already counted today
    } else {
      // Check if yesterday was also a streak day
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yIso = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
      if (streak.lastDate === yIso) {
        streak.count++;
      } else {
        streak.count = 1;
      }
      streak.lastDate = today;
      safeSet(STREAK_KEY, JSON.stringify(streak));
    }
  }

  // Update badge UI
  var badge = document.getElementById('streakBadge');
  if (badge) {
    if (streak.count > 0) {
      badge.textContent = '\uD83D\uDD25 ' + streak.count + ' jour' + (streak.count > 1 ? 's' : '');
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Transformation System (fix #17)
// ═══════════════════════════════════════════════════════════════════════════

function getTotalAllTimeSteps() {
  var total = parseInt(safeGet(TOTAL_STEPS_KEY, '0'), 10);
  return isNaN(total) ? 0 : total;
}

function addToTotalSteps(count) {
  var total = getTotalAllTimeSteps() + count;
  safeSet(TOTAL_STEPS_KEY, total.toString());
  return total;
}

function getCurrentTransformation(totalSteps) {
  var level = TRANSFORMATIONS[0];
  for (var i = TRANSFORMATIONS.length - 1; i >= 0; i--) {
    if (totalSteps >= TRANSFORMATIONS[i].minSteps) {
      level = TRANSFORMATIONS[i];
      break;
    }
  }
  return level;
}

function getNextTransformation(totalSteps) {
  for (var i = 0; i < TRANSFORMATIONS.length; i++) {
    if (totalSteps < TRANSFORMATIONS[i].minSteps) {
      return TRANSFORMATIONS[i];
    }
  }
  return null; // maxed out
}

function updateTransformationUI() {
  var total = getTotalAllTimeSteps();
  var current = getCurrentTransformation(total);
  var next = getNextTransformation(total);

  var levelEl = document.getElementById('transformLevel');
  var progressEl = document.getElementById('transformProgress');

  if (levelEl) {
    levelEl.textContent = current.emoji + ' ' + current.name;
  }
  if (progressEl) {
    if (next) {
      var remaining = next.minSteps - total;
      progressEl.textContent = fmtNum(remaining) + ' pas avant ' + next.name;
    } else {
      progressEl.textContent = 'Niveau maximum atteint !';
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: Sync Code & Cross-app Sync (fix #15)
// ═══════════════════════════════════════════════════════════════════════════

function generateSyncCode() {
  var date = todayIso();
  var sleepHistory = getHistory(SLEEP_KEY);
  var sleepHours = sleepHistory[date] || 0;
  var hash = btoa((stepCount + sleepHours + waterCount + date + 'saiyan').slice(0, 32)).slice(0, 12);
  var data = { steps: stepCount, sleepHours: sleepHours, waterGlasses: waterCount, date: date, timestamp: Date.now(), hash: hash, app: 'saiyan-tracker' };
  return btoa(JSON.stringify(data));
}

function syncToFitness() {
  var sleepHistory = getHistory(SLEEP_KEY);
  var sleepHours = sleepHistory[todayIso()] || 0;
  safeSet('saiyan_tracker_sync', JSON.stringify({
    steps: stepCount,
    sleepHours: sleepHours,
    waterGlasses: waterCount,
    date: todayIso(),
    timestamp: Date.now()
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: UI Update — Steps
// ═══════════════════════════════════════════════════════════════════════════

var _stepsRafId = null;
function updateStepsUI() {
  if (_stepsRafId) return;
  _stepsRafId = requestAnimationFrame(function() { _stepsRafId = null; _updateStepsUIImmediate(); });
}

function _updateStepsUIImmediate() {
  var pct = Math.min(1, stepCount / dailyGoal);
  var pctInt = Math.round(pct * 100);

  var el = document.getElementById('stepDisplay');
  el.textContent = fmtNum(stepCount);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');

  document.getElementById('ringFill').style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - pct)).toFixed(2);
  document.getElementById('progressFill').style.width = pctInt + '%';
  document.getElementById('progressPct').textContent = pctInt + '%';
  document.getElementById('distDisp').textContent = (stepCount * STEP_TO_KM).toFixed(2);
  document.getElementById('calDisp').textContent = Math.round(stepCount * STEP_TO_KCAL);

  var ams = totalActiveMs;
  if (isRunning && activeStart) ams += Date.now() - activeStart;
  document.getElementById('minDisp').textContent = Math.floor(ams / 60000);

  document.getElementById('goalValueDisp').textContent = fmtNum(dailyGoal);
  document.getElementById('goalDisplay').textContent = fmtNum(dailyGoal);

  document.getElementById('syncCodeBox').textContent = generateSyncCode();

  // ARIA progressbar
  var ringWrap = document.getElementById('ringWrap');
  if (ringWrap) {
    ringWrap.setAttribute('aria-valuenow', stepCount);
    ringWrap.setAttribute('aria-valuemax', dailyGoal);
  }

  updateTopBar();
  renderStepsHistory();
  updateStreak();
  updateTransformationUI();
  syncToFitness();
}

function renderStepsHistory() {
  var h = getHistory(STEPS_KEY);
  renderHistory('stepsHistory', h, dailyGoal, 'ki');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: UI Update — Sleep
// ═══════════════════════════════════════════════════════════════════════════

function updateSleepUI() {
  var sleepHistory = getHistory(SLEEP_KEY);
  var date = todayIso();
  var todaySleep = sleepHistory[date] || 0;

  var iconEl   = document.getElementById('sleepIcon');
  var durEl    = document.getElementById('sleepDurationDisp');
  var lblEl    = document.getElementById('sleepStatusLabel');
  var detectEl = document.getElementById('sleepDetecting');
  var btnSleep = document.getElementById('btnSleepMode');
  var btnWake  = document.getElementById('btnWakeUp');

  if (sleepMode) {
    iconEl.textContent = '\uD83D\uDE34';
    iconEl.style.animation = 'float 3s ease-in-out infinite';
    if (!sleepConfirmed) {
      durEl.textContent = '\u2026';
      lblEl.textContent = 'Mode sommeil actif depuis ' + fmtTime(sleepStart);
      detectEl.classList.remove('hidden');
    } else {
      var elapsed = formatHM(Date.now() - sleepStart);
      durEl.textContent = elapsed;
      lblEl.textContent = '\uD83D\uDE34 Endormi depuis ' + fmtTime(sleepStart);
      detectEl.classList.add('hidden');
    }
    btnSleep.classList.add('hidden');
    btnWake.classList.remove('hidden');
  } else {
    detectEl.classList.add('hidden');
    btnSleep.classList.remove('hidden');
    btnWake.classList.add('hidden');
    if (todaySleep > 0) {
      iconEl.textContent = '\u2600\uFE0F';
      iconEl.style.animation = '';
      durEl.textContent = todaySleep.toFixed(1) + 'h';
      lblEl.textContent = '\u2600\uFE0F Dernier sommeil : ' + todaySleep.toFixed(1) + 'h';
    } else {
      iconEl.textContent = '\uD83D\uDE34';
      iconEl.style.animation = 'float 3s ease-in-out infinite';
      durEl.textContent = '\u2014';
      lblEl.textContent = 'Aucune donnee pour aujourd\'hui';
    }
  }

  // Load last session times
  try {
    var sd = JSON.parse(localStorage.getItem(SLEEP_SESSION_KEY) || 'null');
    if (sd) {
      document.getElementById('sleepBedtime').textContent = fmtTime(sd.start) || '\u2014';
      document.getElementById('sleepWaketime').textContent = sd.end ? fmtTime(sd.end) : (sleepMode ? 'En cours' : '\u2014');
    }
  } catch (e) { /* ignore */ }

  // Stats
  var nights = Object.keys(sleepHistory).length;
  var vals = Object.values(sleepHistory);
  document.getElementById('sleepNights').textContent = nights;
  if (todaySleep > 0) {
    document.getElementById('sleepTotal').textContent = todaySleep.toFixed(1) + 'h';
    var score = Math.min(100, Math.round((todaySleep / SLEEP_PERFECT_H) * 100));
    document.getElementById('sleepScore').textContent = score + '%';
  } else {
    var lastNight = vals.length > 0 ? vals[vals.length - 1] : 0;
    document.getElementById('sleepTotal').textContent = lastNight > 0 ? lastNight.toFixed(1) + 'h' : '\u2014';
    document.getElementById('sleepScore').textContent = lastNight > 0 ? Math.min(100, Math.round((lastNight / SLEEP_PERFECT_H) * 100)) + '%' : '\u2014';
  }

  updateTopBar();
  renderSleepHistory();
}

function renderSleepHistory() {
  var h = getHistory(SLEEP_KEY);
  var normalized = {};
  Object.entries(h).forEach(function(entry) { normalized[entry[0]] = Math.round(entry[1] * 1000 / 12); });
  renderHistory('sleepHistory', normalized, 1000, 'sleep');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: UI Update — Water
// ═══════════════════════════════════════════════════════════════════════════

function updateWaterUI() {
  var pct = Math.min(1, waterCount / waterGoal);
  var pctInt = Math.round(pct * 100);
  var ml = waterCount * GLASS_ML;

  document.getElementById('waterMlDisp').textContent = ml >= 1000
    ? (ml / 1000).toFixed(1) + ' L'
    : ml + ' ml';
  document.getElementById('waterProgressLabel').textContent = waterCount + ' / ' + waterGoal + ' verres';
  document.getElementById('waterFill').style.width = pctInt + '%';
  document.getElementById('waterPct').textContent = pctInt + '%';
  document.getElementById('waterGoalDisplay').textContent = waterGoal;

  // Star-rating glass grid (fix #7)
  var grid = document.getElementById('glassesGrid');
  grid.innerHTML = '';
  var total = Math.max(waterGoal, waterCount);
  for (var i = 0; i < total; i++) {
    var btn = document.createElement('button');
    btn.className = 'glass-btn' + (i < waterCount ? ' filled' : '');
    btn.textContent = i < waterCount ? '\uD83E\uDD64' : '\uD83E\uDD5B';
    btn.setAttribute('aria-label', 'Verre ' + (i + 1));
    (function(idx, btnRef) {
      btnRef.addEventListener('click', function() {
        if (idx < waterCount) {
          // Click filled = unfill from there
          waterCount = idx;
        } else {
          // Click empty = fill up to there
          waterCount = Math.min(idx + 1, MAX_WATER);
        }
        saveTodayVal(WATER_KEY, waterCount);
        updateWaterUI();
        document.getElementById('waterReminder').classList.remove('show');
        resetWaterReminder();
        btnRef.classList.add('pop');
        setTimeout(function() { btnRef.classList.remove('pop'); }, 250);
      });
    })(i, btn);
    grid.appendChild(btn);
  }

  updateTopBar();
  renderWaterHistory();
}

function renderWaterHistory() {
  var h = getHistory(WATER_KEY);
  renderHistory('waterHistory', h, waterGoal, 'water');
}

function addGlass() {
  if (waterCount >= MAX_WATER) { showToast('Limite atteinte : ' + MAX_WATER + ' verres max'); return; }
  waterCount++;
  saveTodayVal(WATER_KEY, waterCount);
  updateWaterUI();
  document.getElementById('waterReminder').classList.remove('show');
  resetWaterReminder();
  syncToFitness();
}

function removeGlass() {
  if (waterCount <= 0) return;
  waterCount--;
  saveTodayVal(WATER_KEY, waterCount);
  updateWaterUI();
  syncToFitness();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12: Generic History Renderer
// ═══════════════════════════════════════════════════════════════════════════

function renderHistory(containerId, history, goal, type) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  var today = todayIso();
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  var maxVal = Math.max(goal, 1);
  days.forEach(function(day) {
    var v = history[day] || 0;
    if (v > maxVal) maxVal = v;
  });

  var dayLabels = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  days.forEach(function(day) {
    var val = history[day] || 0;
    var h = Math.max(3, Math.round((val / maxVal) * 62));
    var isToday = day === today;
    var dow = new Date(day + 'T12:00:00').getDay();

    var col = document.createElement('div');
    col.className = 'hbar-col';

    var bar = document.createElement('div');
    bar.className = 'hbar ' + (isToday ? 'today-' + type : 'past');
    bar.style.height = h + 'px';

    var dl = document.createElement('span');
    dl.className = 'hday';
    dl.textContent = isToday ? 'Auj' : dayLabels[dow];

    var vl = document.createElement('span');
    vl.className = 'hval';
    if (type === 'sleep') {
      vl.textContent = val > 0 ? (val / 1000 * 12).toFixed(1) + 'h' : '\u2014';
    } else if (type === 'water') {
      vl.textContent = val > 0 ? val + '\uD83E\uDD64' : '\u2014';
    } else {
      vl.textContent = val > 999 ? (val / 1000).toFixed(1) + 'k' : (val || '\u2014');
    }

    col.appendChild(bar);
    col.appendChild(dl);
    col.appendChild(vl);
    container.appendChild(col);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 13: Top Bar
// ═══════════════════════════════════════════════════════════════════════════

function updateTopBar() {
  document.getElementById('topSteps').textContent = '\uD83D\uDEB6 ' + fmtNum(stepCount);
  var sh = getHistory(SLEEP_KEY)[todayIso()];
  document.getElementById('topSleep').textContent = sh ? '\uD83D\uDE34 ' + sh.toFixed(1) + 'h' : '\uD83D\uDE34 \u2014';
  document.getElementById('topWater').textContent = '\uD83D\uDCA7 ' + waterCount;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 14: Motion Handlers (fix #4, #5)
// ═══════════════════════════════════════════════════════════════════════════

/** Named sleep motion handler — separate from step handler (fix #5) */
function handleSleepMotion(e) {
  var g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  var accel = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z);
  var now = Date.now();

  if (sleepMode && !sleepConfirmed) {
    var delta = Math.abs(accel - lastSleepAccel);
    if (delta < STILLNESS_THRESH) {
      if (!stillnessStart) stillnessStart = now;
      if (now - stillnessStart >= SLEEP_CONFIRM_MS) {
        sleepConfirmed = true;
        saveSleepSession({ active: true, start: sleepStart, confirmed: true });
        updateSleepUI();
      }
    } else {
      stillnessStart = null;
    }
    lastSleepAccel = accel;
  }
}

/** Step counter motion handler — no sleep logic (fix #4) */
function handleMotion(e) {
  var g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  var accel = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z);
  var now = Date.now();

  // Step detection only — no sleep logic here
  if (isRunning && accel > threshold && lastAccel <= threshold && (now - lastStepTime) > STEP_DEBOUNCE_MS) {
    if (stepCount >= MAX_STEPS) { lastAccel = accel; return; }
    stepCount++;
    lastStepTime = now;
    saveTodayVal(STEPS_KEY, stepCount);
    addToTotalSteps(1);
    updateStepsUI();

    var c = document.getElementById('ringCenter');
    c.classList.remove('step-flash');
    void c.offsetWidth;
    c.classList.add('step-flash');

    // Announce milestones to screen readers
    if (stepCount % 1000 === 0) {
      var announcer = document.getElementById('stepAnnouncer');
      if (announcer) announcer.textContent = stepCount + ' pas atteints';
    }
  }
  lastAccel = accel;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 15: Start / Stop Steps (fix #13)
// ═══════════════════════════════════════════════════════════════════════════

function persistRunningState() {
  safeSet(RUNNING_KEY, isRunning ? 'true' : 'false');
  safeSet(ACTIVE_MS_KEY, totalActiveMs.toString());
  if (activeStart) {
    safeSet(ACTIVE_START_KEY, activeStart.toString());
  } else {
    try { localStorage.removeItem(ACTIVE_START_KEY); } catch (e) { /* ignore */ }
  }
  // Persist threshold too
  safeSet(SENS_KEY, threshold.toString());
}

function startSteps() {
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function' &&
      !motionGranted) {
    document.getElementById('permOverlay').classList.remove('hidden');
    return;
  }
  if (typeof DeviceMotionEvent === 'undefined') {
    showToast('Accelerometre non disponible');
    return;
  }
  isRunning = true;
  activeStart = Date.now();
  window.addEventListener('devicemotion', handleMotion);

  var btn = document.getElementById('btnStart');
  btn.textContent = 'ARRETER';
  btn.style.background = 'linear-gradient(135deg,#ff4444,#cc0000)';
  btn.style.boxShadow = '0 4px 20px rgba(255,68,68,0.3)';

  // Update status pill
  var pill = document.getElementById('statusPill');
  if (pill) { pill.classList.add('active'); document.getElementById('statusText').textContent = 'ACTIF'; }

  persistRunningState();
}

function stopSteps() {
  isRunning = false;
  if (activeStart) { totalActiveMs += Date.now() - activeStart; activeStart = null; }
  window.removeEventListener('devicemotion', handleMotion);

  var btn = document.getElementById('btnStart');
  btn.textContent = 'DEMARRER';
  btn.style.background = '';
  btn.style.boxShadow = '';

  var pill = document.getElementById('statusPill');
  if (pill) { pill.classList.remove('active'); document.getElementById('statusText').textContent = 'INACTIF'; }

  persistRunningState();
  updateStepsUI();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 16: Sleep Mode (fix #5, #6)
// ═══════════════════════════════════════════════════════════════════════════

function saveSleepSession(obj) {
  safeSet(SLEEP_SESSION_KEY, JSON.stringify(obj));
}

/** activateSleepMode — does NOT add handleMotion listener (fix #5) */
function activateSleepMode() {
  sleepMode       = true;
  sleepStart      = Date.now();
  sleepConfirmed  = false;
  stillnessStart  = null;
  lastSleepAccel  = Infinity;

  saveSleepSession({ active: true, start: sleepStart, confirmed: false });

  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function' &&
      !motionGranted) {
    document.getElementById('permOverlay').classList.remove('hidden');
  } else if (typeof DeviceMotionEvent !== 'undefined') {
    // Only add sleep motion handler — NOT handleMotion (fix #5)
    window.addEventListener('devicemotion', handleSleepMotion);
  }

  updateSleepUI();
}

/** deactivateSleepMode — uses todayIso() for wake date (fix #6) */
function deactivateSleepMode() {
  if (!sleepStart) { sleepMode = false; updateSleepUI(); return; }

  var wakeTime = Date.now();
  var durationMs = wakeTime - sleepStart;
  var durationHours = durationMs / 3600000;

  // Only save if real sleep (> 30min, < 16h)
  if (durationMs > MIN_SLEEP_MS && durationMs < MAX_SLEEP_MS) {
    // Use todayIso() for wake date attribution (fix #6)
    var date = todayIso();
    var h = getHistory(SLEEP_KEY);
    h[date] = parseFloat(durationHours.toFixed(2));
    setHistory(SLEEP_KEY, h);
  }

  saveSleepSession({ active: false, start: sleepStart, end: wakeTime, confirmed: sleepConfirmed });

  // Remove named sleep motion listener (fix #5)
  window.removeEventListener('devicemotion', handleSleepMotion);

  sleepMode      = false;
  sleepConfirmed = false;
  sleepStart     = null;

  updateSleepUI();
  syncToFitness();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 17: Water Reminders (fix #14)
// ═══════════════════════════════════════════════════════════════════════════

function resetWaterReminder() {
  // Save last drink timestamp
  safeSet(LAST_DRINK_KEY, Date.now().toString());
  if (waterReminderInterval) clearInterval(waterReminderInterval);
  waterReminderInterval = setInterval(function() {
    if (waterCount < waterGoal) {
      var lastDrink = parseInt(safeGet(LAST_DRINK_KEY, '0'), 10);
      var elapsed = Date.now() - lastDrink;
      if (elapsed >= WATER_REMINDER_MS) {
        var el = document.getElementById('waterReminder');
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 8000);
      }
    }
  }, WATER_REMINDER_MS);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 18: Load State from Storage
// ═══════════════════════════════════════════════════════════════════════════

function loadAll() {
  stepCount  = todayVal(STEPS_KEY);
  waterCount = todayVal(WATER_KEY);
  dailyGoal  = parseInt(safeGet(GOAL_KEY, '10000'), 10);
  waterGoal  = parseInt(safeGet(WGOAL_KEY, '8'), 10);

  // Load sensitivity & persist threshold (fix #13)
  var savedSens = safeGet(SENS_KEY, null);
  if (savedSens) {
    threshold = parseFloat(savedSens);
    document.querySelectorAll('#sensChips .chip').forEach(function(c) {
      c.classList.remove('active');
      if (parseFloat(c.dataset.thresh) === threshold) c.classList.add('active');
    });
  }

  // Load running state (fix #13)
  totalActiveMs = parseInt(safeGet(ACTIVE_MS_KEY, '0'), 10);
  var wasRunning = safeGet(RUNNING_KEY, 'false') === 'true';
  var savedActiveStart = safeGet(ACTIVE_START_KEY, null);
  if (wasRunning) {
    if (savedActiveStart) {
      totalActiveMs += Date.now() - parseInt(savedActiveStart, 10);
    }
    startSteps();
  }

  // Sleep: load active session
  try {
    var sd = JSON.parse(localStorage.getItem(SLEEP_SESSION_KEY) || 'null');
    if (sd && sd.active) {
      sleepMode      = true;
      sleepStart     = sd.start;
      sleepConfirmed = sd.confirmed || false;
    }
  } catch (e) { /* ignore */ }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 19: Midnight Reset (fix #13)
// ═══════════════════════════════════════════════════════════════════════════

function checkMidnightReset() {
  var lastDate = safeGet(LAST_DATE_KEY, null);
  var today = todayIso();
  if (lastDate && lastDate !== today) {
    // New day
    waterCount = 0;
    saveTodayVal(WATER_KEY, 0);
    stepCount = todayVal(STEPS_KEY);
    totalActiveMs = 0;
    persistRunningState();
    updateStepsUI();
    updateWaterUI();
    updateSleepUI();
  }
  safeSet(LAST_DATE_KEY, today);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 20: Event Listeners & Init
// ═══════════════════════════════════════════════════════════════════════════

// iOS permission overlay
document.getElementById('btnPerm').addEventListener('click', function() {
  DeviceMotionEvent.requestPermission().then(function(result) {
    if (result === 'granted') {
      motionGranted = true;
      document.getElementById('permOverlay').classList.add('hidden');
      if (document.querySelector('#tab-steps.active')) startSteps();
      else if (sleepMode) {
        window.addEventListener('devicemotion', handleSleepMotion);
      }
    } else {
      showToast('Permission refusee. Active l\'acces dans Reglages > Safari.');
    }
  }).catch(function(err) {
    showToast('Erreur : ' + err.message);
  });
});

// Tab navigation
document.querySelectorAll('.nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function(b) {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    if (tabId === 'steps') renderStepsHistory();
    if (tabId === 'sleep') renderSleepHistory();
    if (tabId === 'water') updateWaterUI();
  });
});

// Step counter controls
document.getElementById('btnStart').addEventListener('click', function() {
  if (isRunning) stopSteps(); else startSteps();
});

document.getElementById('btnReset').addEventListener('click', function() {
  if (!confirm('Remettre a zero les pas d\'aujourd\'hui ?')) return;
  stepCount = 0; totalActiveMs = 0;
  if (activeStart) activeStart = Date.now();
  saveTodayVal(STEPS_KEY, 0);
  persistRunningState();
  updateStepsUI();
});

document.getElementById('btnGoalDown').addEventListener('click', function() {
  dailyGoal = Math.max(GOAL_MIN, dailyGoal - GOAL_STEP_SIZE);
  safeSet(GOAL_KEY, dailyGoal.toString());
  updateStepsUI();
});

document.getElementById('btnGoalUp').addEventListener('click', function() {
  dailyGoal = Math.min(GOAL_MAX, dailyGoal + GOAL_STEP_SIZE);
  safeSet(GOAL_KEY, dailyGoal.toString());
  updateStepsUI();
});

// Sensitivity chips
document.querySelectorAll('#sensChips .chip').forEach(function(c) {
  c.addEventListener('click', function() {
    document.querySelectorAll('#sensChips .chip').forEach(function(x) { x.classList.remove('active'); });
    c.classList.add('active');
    threshold = parseFloat(c.dataset.thresh);
    safeSet(SENS_KEY, threshold.toString());
  });
});

// Sleep controls
document.getElementById('btnSleepMode').addEventListener('click', activateSleepMode);
document.getElementById('btnWakeUp').addEventListener('click', deactivateSleepMode);

// Water controls
document.getElementById('btnAddGlass').addEventListener('click', addGlass);
document.getElementById('btnRemoveGlass').addEventListener('click', removeGlass);

document.getElementById('btnWaterGoalDown').addEventListener('click', function() {
  waterGoal = Math.max(WATER_GOAL_MIN, waterGoal - WATER_GOAL_STEP);
  safeSet(WGOAL_KEY, waterGoal.toString());
  updateWaterUI();
});

document.getElementById('btnWaterGoalUp').addEventListener('click', function() {
  waterGoal = Math.min(WATER_GOAL_MAX, waterGoal + WATER_GOAL_STEP);
  safeSet(WGOAL_KEY, waterGoal.toString());
  updateWaterUI();
});

// Copy sync code
document.getElementById('btnCopy').addEventListener('click', function() {
  var code = generateSyncCode();
  var btn = document.getElementById('btnCopy');
  var copyFn = function(text) {
    try { navigator.clipboard.writeText(text); return true; } catch (e) { /* ignore */ }
    try {
      var el = document.createElement('textarea');
      el.value = text; el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el); el.select(); document.execCommand('copy');
      document.body.removeChild(el); return true;
    } catch (e) { return false; }
  };
  if (copyFn(code)) {
    btn.textContent = '\u2705 Code copie !'; btn.classList.add('copied');
    setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copier le code de sync'; btn.classList.remove('copied'); }, 2500);
  }
});

// Midnight reset — visibilitychange (fix #13)
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    checkMidnightReset();
  }
});

// Midnight reset — 60s interval (fix #13)
setInterval(function() { checkMidnightReset(); }, 60000);

// beforeunload — save state and warn if running (fix #17)
window.addEventListener('beforeunload', function(e) {
  persistRunningState();
  if (isRunning) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function() { /* ignore */ });
  });
}

// Active minutes interval
setInterval(function() {
  if (isRunning) {
    var ams = totalActiveMs + (Date.now() - (activeStart || Date.now()));
    document.getElementById('minDisp').textContent = Math.floor(ams / 60000);
  }
  if (sleepMode && sleepConfirmed) updateSleepUI();
}, 10000);

// ── Init ──
checkMidnightReset();
loadAll();
updateStepsUI();
updateSleepUI();
updateWaterUI();
updateTransformationUI();
resetWaterReminder();
