/* ═══════════════════════════════════════════════════════════════════════════
   Saiyan Tracker — app.js
   All JS extracted from index.html with Sprint 1 fixes + streaks + transformations
   + Final round fixes (FIX 1-12)
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
const ACTIVE_DATE_KEY  = 'st_active_date';
const HISTORY_MODE_KEY = 'st_history_mode';
const BEST_DAY_KEY     = 'st_best_day';
const COMPACT_KEY      = 'st_compact';
const CAL_GOAL_KEY     = 'st_cal_goal';
const WEIGHT_KEY       = 'st_weight';
const DIST_GOAL_KEY    = 'st_dist_goal';
const DIST_MODE_KEY    = 'st_dist_mode';
const WEEKLY_SHOWN_KEY = 'st_weekly_shown';
const WEEKLY_REPORTS_KEY = 'st_weekly_reports';
const BADGES_KEY       = 'st_badges';
const CHALLENGES_KEY   = 'st_challenges';
const MOVE_REMIND_KEY  = 'st_last_move_remind';
const USER_PROFILE_KEY = 'st_user_profile';
const SLEEP_GOAL_KEY   = 'st_sleep_goal';
const SLEEP_DETAIL_KEY = 'st_sleep_detail';
const THEME_KEY        = 'st_theme';
const FRIENDS_CODE_KEY = 'st_friends_code';

// Named constants — no magic numbers
const STEP_TO_KM         = 0.00075;
const STEP_TO_KCAL       = 0.04;
const RING_CIRCUMFERENCE = 276.46;
const CAL_RING_CIRCUMFERENCE = 207.35; // r=33, 2*pi*33
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

// FEAT-S12: Sleep goal bounds
const SLEEP_GOAL_MIN     = 5;
const SLEEP_GOAL_MAX     = 10;
const SLEEP_GOAL_STEP    = 0.5;

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

/** Returns today's date as YYYY-MM-DD in LOCAL timezone */
function todayIso() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Convert a Date object to YYYY-MM-DD (FIX 7) */
function dateToIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Format number with French locale */
function fmtNum(n) { return n.toLocaleString('fr-FR'); }

/** Format milliseconds as HhMM */
function formatHM(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h + 'h' + (m < 10 ? '0' : '') + m;
}

/** Format timestamp as HH:MM */
function fmtTime(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Toast Notification
// ═══════════════════════════════════════════════════════════════════════════

let _toastTimer = null;
function showToast(msg, durationMs) {
  if (durationMs === undefined) durationMs = 2500;
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, durationMs);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Safe localStorage Helpers
// ═══════════════════════════════════════════════════════════════════════════

function safeGet(key, fallback) {
  try {
    const val = localStorage.getItem(key);
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
  const h = getHistory(key);
  h[todayIso()] = val;
  setHistory(key, h);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: Application State (FIX 9: var -> let)
// ═══════════════════════════════════════════════════════════════════════════

let stepCount      = 0;
let dailyGoal      = 10000;
let threshold      = 12;
let isRunning      = false;
let lastAccel      = 0;
let lastStepTime   = 0;
let activeStart    = null;
let totalActiveMs  = 0;
let motionGranted  = false;
let motionListenerActive = false;

let sleepMode       = false;
let sleepStart      = null;
let sleepConfirmed  = false;
let stillnessStart  = null;
let lastSleepAccel  = Infinity;
let sleepCheckInterval = null;

let waterGoal      = 8;
let waterCount     = 0;
let waterReminderInterval = null;

// FIX 4: Smart intervals
let midnightInterval = null;
let activeInterval = null;

// FIX 10: History mode (7 or 30 days)
let historyDays = parseInt(safeGet(HISTORY_MODE_KEY, '7'), 10);
let compactMode = safeGet(COMPACT_KEY, 'false') === 'true';
let calGoal = parseInt(safeGet(CAL_GOAL_KEY, '300'), 10);
let userWeight = parseInt(safeGet(WEIGHT_KEY, '70'), 10);
let distGoal = parseFloat(safeGet(DIST_GOAL_KEY, '5'));
let distanceMode = safeGet(DIST_MODE_KEY, 'false') === 'true';

// FEAT-S10: User profile
let userProfile = (function() {
  try { return JSON.parse(safeGet(USER_PROFILE_KEY, 'null')); } catch(e) { return null; }
})();

// FEAT-S12: Sleep goal
let sleepGoalH = parseFloat(safeGet(SLEEP_GOAL_KEY, '8'));

// FEAT-S14: Theme
let lightTheme = safeGet(THEME_KEY, 'false') === 'true';

// FIX 12: Notification tracking
let goalNotifSent = false;
let lastTransformName = '';


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Streak System
// ═══════════════════════════════════════════════════════════════════════════

function getStreak() {
  try {
    const data = JSON.parse(safeGet(STREAK_KEY, '{"count":0,"lastDate":""}'));
    return data;
  } catch (e) { return { count: 0, lastDate: '' }; }
}

function updateStreak() {
  const streak = getStreak();
  const today = todayIso();
  const stepsH = getHistory(STEPS_KEY);
  const todaySteps = stepsH[today] || 0;

  if (todaySteps >= dailyGoal) {
    if (streak.lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yIso = dateToIso(yesterday);
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
  const badge = document.getElementById('streakBadge');
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
// SECTION 7: Transformation System
// ═══════════════════════════════════════════════════════════════════════════

function getTotalAllTimeSteps() {
  const total = parseInt(safeGet(TOTAL_STEPS_KEY, '0'), 10);
  return isNaN(total) ? 0 : total;
}

function addToTotalSteps(count) {
  const total = getTotalAllTimeSteps() + count;
  safeSet(TOTAL_STEPS_KEY, total.toString());
  return total;
}

function getCurrentTransformation(totalSteps) {
  let level = TRANSFORMATIONS[0];
  for (let i = TRANSFORMATIONS.length - 1; i >= 0; i--) {
    if (totalSteps >= TRANSFORMATIONS[i].minSteps) {
      level = TRANSFORMATIONS[i];
      break;
    }
  }
  return level;
}

function getNextTransformation(totalSteps) {
  for (let i = 0; i < TRANSFORMATIONS.length; i++) {
    if (totalSteps < TRANSFORMATIONS[i].minSteps) {
      return TRANSFORMATIONS[i];
    }
  }
  return null; // maxed out
}

function updateTransformationUI() {
  const total = getTotalAllTimeSteps();
  const current = getCurrentTransformation(total);
  const next = getNextTransformation(total);

  const levelEl = document.getElementById('transformLevel');
  const progressEl = document.getElementById('transformProgress');

  if (levelEl) {
    levelEl.textContent = current.emoji + ' ' + current.name;
  }
  if (progressEl) {
    if (next) {
      const remaining = next.minSteps - total;
      progressEl.textContent = fmtNum(remaining) + ' pas avant ' + next.name;
    } else {
      progressEl.textContent = 'Niveau maximum atteint !';
    }
  }

  // FIX 12: Notify on new transformation
  if (lastTransformName && lastTransformName !== current.name) {
    sendNotif('Nouvelle transformation !', current.emoji + ' ' + current.name + ' atteint !');
    // FEAT-S15: Show fullscreen transformation animation
    showTransformationAnimation(current.name, current.emoji);
  }
  lastTransformName = current.name;
}



// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7b: Personal Record (Best Day)
// ═══════════════════════════════════════════════════════════════════════════

function getBestDay() {
  try {
    return JSON.parse(safeGet(BEST_DAY_KEY, '{"steps":0,"date":""}'));
  } catch (e) { return { steps: 0, date: '' }; }
}

function checkAndUpdateBestDay() {
  var best = getBestDay();
  var recordEl = document.getElementById('bestDayDisplay');
  if (!recordEl) return;

  if (stepCount > best.steps && stepCount > 0) {
    var wasRecord = best.steps > 0;
    best.steps = stepCount;
    best.date = todayIso();
    safeSet(BEST_DAY_KEY, JSON.stringify(best));
    if (wasRecord) {
      showConfetti();
      sendNotif('NOUVEAU RECORD DE POUVOIR !', fmtNum(stepCount) + ' pas ! Tu as d\u00e9pass\u00e9 ton record !');
      showToast('\u26A1 NOUVEAU RECORD DE POUVOIR ! ' + fmtNum(stepCount) + ' pas !', 4000);
    }
  }

  if (best.steps > 0) {
    var dateStr = best.date;
    try {
      var parts = best.date.split('-');
      var months = ['jan', 'f\u00e9v', 'mars', 'avr', 'mai', 'juin', 'juil', 'ao\u00fbt', 'sept', 'oct', 'nov', 'd\u00e9c'];
      dateStr = parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1];
    } catch(e) {}
    recordEl.textContent = '\uD83C\uDFC6 Record : ' + fmtNum(best.steps) + ' pas (' + dateStr + ')';
    recordEl.classList.remove('hidden');
  } else {
    recordEl.classList.add('hidden');
  }
}

function showConfetti() {
  var canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  var ctx = canvas.getContext('2d');
  var particles = [];
  var colors = ['#FFD700', '#FF8C00', '#FF4500', '#39FF14', '#37B7FF', '#9B59B6'];

  for (var i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 8
    });
  }

  var frames = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frames++;
    if (frames < 120) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  animate();
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7c: Calorie Burn Goal
// ═══════════════════════════════════════════════════════════════════════════

function calculateCalories() {
  // FEAT-S10: Use profile weight if available, else fallback to userWeight
  var w = (userProfile && userProfile.weight) ? userProfile.weight : userWeight;
  // Calories = steps * (0.04 * weight / 70) per spec
  var stepCal = stepCount * (0.04 * w / 70);
  var ams = totalActiveMs;
  if (isRunning && activeStart) ams += Date.now() - activeStart;
  var activeMinutes = ams / 60000;
  var activeCal = activeMinutes * (w * 0.05);
  return Math.round(stepCal + activeCal);
}

function updateCalorieRing() {
  var cal = calculateCalories();
  var pct = Math.min(1, cal / calGoal);
  var ringEl = document.getElementById('calRingFill');
  var textEl = document.getElementById('calRingText');
  var goalEl = document.getElementById('calGoalDisp');
  if (ringEl) {
    ringEl.style.strokeDashoffset = (CAL_RING_CIRCUMFERENCE * (1 - pct)).toFixed(2);
  }
  if (textEl) {
    textEl.textContent = cal + ' / ' + calGoal + ' kcal';
  }
  if (goalEl) {
    goalEl.textContent = '\uD83D\uDD25 Ki br\u00fbl\u00e9';
  }
  // Also update the main calorie display
  document.getElementById('calDisp').textContent = cal;
  // Update calorie goal display in compact section
  var calGoalDisp = document.getElementById('calGoalDisplay');
  if (calGoalDisp) calGoalDisp.textContent = calGoal;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7d: Distance Goal
// ═══════════════════════════════════════════════════════════════════════════

function getCurrentDistance() {
  return stepCount * STEP_TO_KM;
}

function updateDistanceGoal() {
  var dist = getCurrentDistance();
  var distGoalEl = document.getElementById('distGoalDisplay');
  var distStatEl = document.getElementById('distMainStat');
  var distGoalSub = document.getElementById('distGoalSub');
  if (distGoalEl) distGoalEl.textContent = distGoal.toFixed(1) + ' km';
  if (distStatEl) distStatEl.textContent = dist.toFixed(2) + ' km';
  if (distGoalSub) distGoalSub.textContent = '/ ' + distGoal.toFixed(1) + ' km';
}

function toggleDistanceMode() {
  distanceMode = !distanceMode;
  safeSet(DIST_MODE_KEY, distanceMode ? 'true' : 'false');
  applyDistanceMode();
}

function applyDistanceMode() {
  var stepLabel = document.querySelector('.step-label');
  var stepDisplay = document.getElementById('stepDisplay');
  var goalSub = document.querySelector('.step-goal-sub');
  var modeBtn = document.getElementById('btnDistMode');

  if (distanceMode) {
    if (stepLabel) stepLabel.textContent = 'Distance aujourd\'hui';
    if (stepDisplay) stepDisplay.textContent = getCurrentDistance().toFixed(2);
    if (goalSub) goalSub.innerHTML = '/ <span id="goalValueDisp">' + distGoal.toFixed(1) + '</span> km';
    if (modeBtn) { modeBtn.textContent = 'MODE PAS'; modeBtn.classList.add('compact-active'); }
    // Update ring for distance
    var pct = Math.min(1, getCurrentDistance() / distGoal);
    document.getElementById('ringFill').style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - pct)).toFixed(2);
  } else {
    if (stepLabel) stepLabel.textContent = 'Pas aujourd\'hui';
    if (stepDisplay) stepDisplay.textContent = fmtNum(stepCount);
    if (goalSub) goalSub.innerHTML = '/ <span id="goalValueDisp">' + fmtNum(dailyGoal) + '</span>';
    if (modeBtn) { modeBtn.textContent = 'MODE DISTANCE'; modeBtn.classList.remove('compact-active'); }
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: Sync Code & Cross-app Sync (FIX 8: real SHA-256)
// ═══════════════════════════════════════════════════════════════════════════

/** Real SHA-256 hash using SubtleCrypto (FIX 8) */
async function hashData(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function generateSyncCode() {
  const date = todayIso();
  const sleepHistory = getHistory(SLEEP_KEY);
  const sleepHours = sleepHistory[date] || 0;
  const hash = await hashData(stepCount + '' + sleepHours + '' + waterCount + date + 'saiyan');
  const data = { steps: stepCount, sleepHours: sleepHours, waterGlasses: waterCount, date: date, timestamp: Date.now(), hash: hash, app: 'saiyan-tracker' };
  return btoa(JSON.stringify(data));
}

function syncToFitness() {
  // Also sync to Supabase cloud if logged in
  if (typeof cloudSyncSteps === 'function') {
    try { cloudSyncSteps(); } catch(e) {}
  }
  const sleepHistory = getHistory(SLEEP_KEY);
  const sleepHours = sleepHistory[todayIso()] || 0;
  safeSet('saiyan_tracker_sync', JSON.stringify({
    steps: stepCount,
    sleepHours: sleepHours,
    waterGlasses: waterCount,
    date: todayIso(),
    timestamp: Date.now()
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: UI Update — Steps (FIX 6: bump only on real steps)
// ═══════════════════════════════════════════════════════════════════════════

let _stepsRafId = null;
let _pendingIsNewStep = false;

function updateStepsUI(isNewStep) {
  if (isNewStep) _pendingIsNewStep = true;
  if (_stepsRafId) return;
  _stepsRafId = requestAnimationFrame(function() {
    _stepsRafId = null;
    const doNewStep = _pendingIsNewStep;
    _pendingIsNewStep = false;
    _updateStepsUIImmediate(doNewStep);
  });
}

function _updateStepsUIImmediate(isNewStep) {
  const pct = Math.min(1, stepCount / dailyGoal);
  const pctInt = Math.round(pct * 100);

  const el = document.getElementById('stepDisplay');
  el.textContent = fmtNum(stepCount);

  // FIX 6: Only bump on real new steps
  if (isNewStep) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  document.getElementById('ringFill').style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - pct)).toFixed(2);
  document.getElementById('progressFill').style.width = pctInt + '%';
  document.getElementById('progressPct').textContent = pctInt + '%';
  document.getElementById('distDisp').textContent = (stepCount * STEP_TO_KM).toFixed(2);
  document.getElementById('calDisp').textContent = calculateCalories();

  let ams = totalActiveMs;
  if (isRunning && activeStart) ams += Date.now() - activeStart;
  document.getElementById('minDisp').textContent = Math.floor(ams / 60000);

  if (distanceMode) {
    applyDistanceMode();
  } else {
    document.getElementById('goalValueDisp').textContent = fmtNum(dailyGoal);
  }
  document.getElementById('goalDisplay').textContent = fmtNum(dailyGoal);

  // Sync code is now async (FIX 8)
  generateSyncCode().then(function(code) {
    document.getElementById('syncCodeBox').textContent = code;
  });

  // ARIA progressbar
  const ringWrap = document.getElementById('ringWrap');
  if (ringWrap) {
    ringWrap.setAttribute('aria-valuenow', stepCount);
    ringWrap.setAttribute('aria-valuemax', dailyGoal);
  }

  updateTopBar();
  renderStepsHistory();
  renderHourlyChart();
  updateStreak();
  updateTransformationUI();
  checkAndUpdateBestDay();
  updateCalorieRing();
  updateDistanceGoal();
  checkBadges();
  syncToFitness();

  // FIX 12: Goal reached notification
  if (stepCount >= dailyGoal && !goalNotifSent) {
    goalNotifSent = true;
    requestNotifPermission();
    sendNotif('Objectif atteint !', fmtNum(stepCount) + ' pas ! Tu es un vrai Saiyan !');
  }
}

function renderStepsHistory() {
  const h = getHistory(STEPS_KEY);
  renderHistory('stepsHistory', h, dailyGoal, 'ki');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: UI Update — Sleep
// ═══════════════════════════════════════════════════════════════════════════

function updateSleepUI() {
  const sleepHistory = getHistory(SLEEP_KEY);
  const date = todayIso();
  const todaySleep = sleepHistory[date] || 0;

  const iconEl   = document.getElementById('sleepIcon');
  const durEl    = document.getElementById('sleepDurationDisp');
  const lblEl    = document.getElementById('sleepStatusLabel');
  const detectEl = document.getElementById('sleepDetecting');
  const btnSleep = document.getElementById('btnSleepMode');
  const btnWake  = document.getElementById('btnWakeUp');

  if (sleepMode) {
    iconEl.textContent = '\uD83D\uDE34';
    iconEl.style.animation = 'float 3s ease-in-out infinite';
    if (!sleepConfirmed) {
      durEl.textContent = '\u2026';
      lblEl.textContent = 'Mode sommeil actif depuis ' + fmtTime(sleepStart);
      detectEl.classList.remove('hidden');
    } else {
      const elapsed = formatHM(Date.now() - sleepStart);
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
    const sd = JSON.parse(localStorage.getItem(SLEEP_SESSION_KEY) || 'null');
    if (sd) {
      document.getElementById('sleepBedtime').textContent = fmtTime(sd.start) || '\u2014';
      document.getElementById('sleepWaketime').textContent = sd.end ? fmtTime(sd.end) : (sleepMode ? 'En cours' : '\u2014');
    }
  } catch (e) { /* ignore */ }

  // Stats
  const nights = Object.keys(sleepHistory).length;
  const vals = Object.values(sleepHistory);
  document.getElementById('sleepNights').textContent = nights;
  if (todaySleep > 0) {
    document.getElementById('sleepTotal').textContent = todaySleep.toFixed(1) + 'h';
    const score = Math.min(100, Math.round((todaySleep / sleepGoalH) * 100));
    document.getElementById('sleepScore').textContent = score + '%';
  } else {
    const lastNight = vals.length > 0 ? vals[vals.length - 1] : 0;
    document.getElementById('sleepTotal').textContent = lastNight > 0 ? lastNight.toFixed(1) + 'h' : '\u2014';
    document.getElementById('sleepScore').textContent = lastNight > 0 ? Math.min(100, Math.round((lastNight / SLEEP_PERFECT_H) * 100)) + '%' : '\u2014';
  }

  updateTopBar();
  renderSleepHistory();
  renderSleepDetailHistory();
}

function renderSleepHistory() {
  const h = getHistory(SLEEP_KEY);
  const normalized = {};
  Object.entries(h).forEach(function(entry) { normalized[entry[0]] = Math.round(entry[1] * 1000 / 12); });
  renderHistory('sleepHistory', normalized, 1000, 'sleep');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: UI Update — Water
// ═══════════════════════════════════════════════════════════════════════════

function updateWaterUI() {
  const pct = Math.min(1, waterCount / waterGoal);
  const pctInt = Math.round(pct * 100);
  const ml = waterCount * GLASS_ML;

  document.getElementById('waterMlDisp').textContent = ml >= 1000
    ? (ml / 1000).toFixed(1) + ' L'
    : ml + ' ml';
  document.getElementById('waterProgressLabel').textContent = waterCount + ' / ' + waterGoal + ' verres';
  document.getElementById('waterFill').style.width = pctInt + '%';
  document.getElementById('waterPct').textContent = pctInt + '%';
  document.getElementById('waterGoalDisplay').textContent = waterGoal;

  // Star-rating glass grid
  const grid = document.getElementById('glassesGrid');
  grid.innerHTML = '';
  const total = Math.max(waterGoal, waterCount);
  for (let i = 0; i < total; i++) {
    const btn = document.createElement('button');
    btn.className = 'glass-btn' + (i < waterCount ? ' filled' : '');
    btn.textContent = i < waterCount ? '\uD83E\uDD64' : '\uD83E\uDD5B';
    btn.setAttribute('aria-label', 'Verre ' + (i + 1));
    (function(idx, btnRef) {
      btnRef.addEventListener('click', function() {
        if (idx < waterCount) {
          waterCount = idx;
        } else {
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
  const h = getHistory(WATER_KEY);
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
// SECTION 12: Generic History Renderer (FIX 10: 30-day toggle + color coding)
// ═══════════════════════════════════════════════════════════════════════════

function renderHistory(containerId, history, goal, type) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  var today = todayIso();
  var numDays = historyDays;
  var days = [];
  for (var i = numDays - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Collect values
  var values = [];
  days.forEach(function(day) { values.push(history[day] || 0); });

  // Calculate 7-day moving average
  var movingAvg = [];
  for (var mi = 0; mi < values.length; mi++) {
    var sum = 0;
    var cnt = 0;
    for (var mj = Math.max(0, mi - 6); mj <= mi; mj++) {
      sum += values[mj];
      cnt++;
    }
    movingAvg.push(cnt > 0 ? sum / cnt : 0);
  }

  var maxVal = Math.max(goal, 1);
  values.forEach(function(v) { if (v > maxVal) maxVal = v; });
  movingAvg.forEach(function(v) { if (v > maxVal) maxVal = v; });

  // Create wrapper with relative positioning for canvas overlay
  var chartHeight = 80;
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;height:' + (chartHeight + 36) + 'px';

  // Y-axis scale with 4 graduations
  var yAxis = document.createElement('div');
  yAxis.style.cssText = 'position:absolute;left:0;top:0;bottom:36px;width:32px;display:flex;flex-direction:column;justify-content:space-between;font-size:0.48rem;color:var(--muted);text-align:right;padding-right:4px';
  var gradSteps = [1, 0.75, 0.5, 0.25, 0];
  gradSteps.forEach(function(frac) {
    var yLabel = document.createElement('span');
    var val2 = Math.round(maxVal * frac);
    yLabel.textContent = val2 > 999 ? (val2 / 1000).toFixed(1) + 'k' : val2;
    yAxis.appendChild(yLabel);
  });
  wrapper.appendChild(yAxis);

  // Bars container
  var barsDiv = document.createElement('div');
  barsDiv.style.cssText = 'position:absolute;left:30px;right:0;top:0;bottom:0;display:grid;grid-template-columns:repeat(' + numDays + ',1fr);gap:' + (numDays > 7 ? '2' : '5') + 'px;align-items:flex-end;height:' + (chartHeight + 36) + 'px';

  var dayLabels = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  days.forEach(function(day, idx) {
    var val = values[idx];
    var h = Math.max(3, Math.round((val / maxVal) * chartHeight));
    var isToday = day === today;
    var dow = new Date(day + 'T12:00:00').getDay();

    var col = document.createElement('div');
    col.className = 'hbar-col';

    var bar = document.createElement('div');
    bar.className = 'hbar';

    // DBZ color coding
    if (type === 'ki') {
      var ratio = val / goal;
      if (ratio >= 1) {
        bar.style.background = isToday ? 'linear-gradient(180deg, var(--gold), var(--orange))' : 'var(--gold)';
        bar.style.boxShadow = '0 0 6px rgba(255,215,0,0.3)';
      } else if (ratio >= 0.8) {
        bar.style.background = 'var(--orange)';
      } else if (ratio >= 0.5) {
        bar.style.background = '#FF8C00';
        bar.style.opacity = '0.7';
      } else if (val > 0) {
        bar.style.background = 'var(--red)';
        bar.style.opacity = '0.6';
      } else {
        bar.classList.add('past');
      }
    } else if (isToday) {
      bar.classList.add('today-' + type);
    } else {
      bar.classList.add(val > 0 ? 'past' : 'past');
      if (type === 'sleep' && val > 0) bar.style.background = 'rgba(102,126,234,0.5)';
      if (type === 'water' && val > 0) bar.style.background = 'rgba(0,212,255,0.4)';
    }

    bar.style.height = h + 'px';

    // Day label
    var dl = document.createElement('span');
    dl.className = 'hday';
    if (numDays <= 7) {
      dl.textContent = isToday ? 'Auj' : dayLabels[dow];
    } else {
      var dateNum = new Date(day + 'T12:00:00').getDate();
      dl.textContent = isToday ? 'Auj' : dateNum.toString();
      dl.style.transform = 'rotate(-45deg)';
      dl.style.fontSize = '0.55rem';
    }

    // Tap detail with rich info
    var stepsH2 = getHistory(STEPS_KEY);
    var sleepH2 = getHistory(SLEEP_KEY);
    var waterH2 = getHistory(WATER_KEY);

    (function(colRef, dayRef, valRef, typeRef) {
      colRef.style.cursor = 'pointer';
      colRef.addEventListener('click', function() {
        var sVal = stepsH2[dayRef] || 0;
        var distVal = (sVal * STEP_TO_KM).toFixed(2);
        var calVal = Math.round(sVal * STEP_TO_KCAL);
        var slVal = sleepH2[dayRef] || 0;
        var wVal = waterH2[dayRef] || 0;
        var parts = dayRef.split('-');
        var months2 = ['jan','fev','mars','avr','mai','juin','juil','aout','sept','oct','nov','dec'];
        var dateLabel = parseInt(parts[2],10) + ' ' + months2[parseInt(parts[1],10)-1];
        var detail = dateLabel + ' : ' + fmtNum(sVal) + ' pas, ' + distVal + ' km, ' + calVal + ' kcal';
        if (slVal > 0) detail += ', ' + slVal.toFixed(1) + 'h sommeil';
        if (wVal > 0) detail += ', ' + wVal + ' verres';
        showToast(detail, 3000);
      });
    })(col, day, val, type);

    // Value label (7-day mode only)
    var vl = document.createElement('span');
    vl.className = 'hval';
    if (numDays <= 7) {
      if (type === 'sleep') {
        vl.textContent = val > 0 ? (val / 1000 * 12).toFixed(1) + 'h' : '\u2014';
      } else if (type === 'water') {
        vl.textContent = val > 0 ? val + '\uD83E\uDD64' : '\u2014';
      } else {
        vl.textContent = val > 999 ? (val / 1000).toFixed(1) + 'k' : (val || '\u2014');
      }
    }

    col.appendChild(bar);
    col.appendChild(dl);
    col.appendChild(vl);
    barsDiv.appendChild(col);
  });

  wrapper.appendChild(barsDiv);

  // Canvas overlay for goal line and moving average
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:30px;right:0;top:0;height:' + chartHeight + 'px;pointer-events:none';
  canvas.width = 600;
  canvas.height = chartHeight;
  wrapper.appendChild(canvas);

  container.appendChild(wrapper);

  // Draw lines on canvas after DOM insertion
  requestAnimationFrame(function() {
    var w = canvas.offsetWidth || 600;
    canvas.width = w;
    var ctx2 = canvas.getContext('2d');
    var barW = w / numDays;

    // Dotted goal line
    var goalY = chartHeight - (goal / maxVal * chartHeight);
    ctx2.setLineDash([4, 4]);
    ctx2.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(0, goalY);
    ctx2.lineTo(w, goalY);
    ctx2.stroke();

    // 7-day moving average trend line (all views)
    if (numDays >= 7) {
      ctx2.setLineDash([]);
      ctx2.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      movingAvg.forEach(function(avg, idx2) {
        var x = barW * idx2 + barW / 2;
        var y = chartHeight - (avg / maxVal * chartHeight);
        if (idx2 === 0) ctx2.moveTo(x, y);
        else ctx2.lineTo(x, y);
      });
      ctx2.stroke();
    }
  });

  // Update grid styles (remove old grid template)
  container.style.gridTemplateColumns = '';
  container.style.display = 'block';
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12b: Hourly Chart (FIX 11)
// ═══════════════════════════════════════════════════════════════════════════

function renderHourlyChart() {
  const container = document.getElementById('hourlyChart');
  if (!container) return;
  container.innerHTML = '';

  const hourlyKey = 'st_hourly_' + todayIso();
  const hourly = JSON.parse(safeGet(hourlyKey, '{}'));

  let maxH = 1;
  for (let i = 0; i < 24; i++) {
    const v = hourly[i] || 0;
    if (v > maxH) maxH = v;
  }

  for (let i = 0; i < 24; i++) {
    const val = hourly[i] || 0;
    const pct = Math.round((val / maxH) * 100);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.7rem';

    const label = document.createElement('span');
    label.style.cssText = 'min-width:28px;text-align:right;color:var(--muted);font-size:0.65rem';
    label.textContent = i.toString().padStart(2, '0') + 'h';

    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden';

    const barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;border-radius:4px;background:var(--gradient-ki);transition:width 0.3s ease;width:' + (val > 0 ? Math.max(2, pct) : 0) + '%';

    const valLabel = document.createElement('span');
    valLabel.style.cssText = 'min-width:32px;font-size:0.65rem;color:var(--muted)';
    valLabel.textContent = val > 0 ? val : '';

    barWrap.appendChild(barFill);
    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(valLabel);
    container.appendChild(row);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 13: Top Bar
// ═══════════════════════════════════════════════════════════════════════════

function updateTopBar() {
  document.getElementById('topSteps').textContent = '\uD83D\uDEB6 ' + fmtNum(stepCount);
  const sh = getHistory(SLEEP_KEY)[todayIso()];
  document.getElementById('topSleep').textContent = sh ? '\uD83D\uDE34 ' + sh.toFixed(1) + 'h' : '\uD83D\uDE34 \u2014';
  document.getElementById('topWater').textContent = '\uD83D\uDCA7 ' + waterCount;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 14: Motion Handlers
// ═══════════════════════════════════════════════════════════════════════════

/** Named sleep motion handler — separate from step handler */
function handleSleepMotion(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  const accel = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z);

  if (sleepMode && !sleepConfirmed) {
    const delta = Math.abs(accel - lastSleepAccel);
    if (delta < STILLNESS_THRESH) {
      if (!stillnessStart) stillnessStart = Date.now();
      if (Date.now() - stillnessStart >= SLEEP_CONFIRM_MS) {
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

/** Step counter motion handler — no sleep logic */
function handleMotion(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  const accel = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z);
  const now = Date.now();

  // Step detection only — no sleep logic here
  if (isRunning && accel > threshold && lastAccel <= threshold && (now - lastStepTime) > STEP_DEBOUNCE_MS) {
    if (stepCount >= MAX_STEPS) { lastAccel = accel; return; }
    stepCount++;
    lastStepTime = now;
    saveTodayVal(STEPS_KEY, stepCount);
    addToTotalSteps(1);

    // FIX 11: Track hourly steps
    const hour = new Date().getHours();
    const hourlyKey = 'st_hourly_' + todayIso();
    const hourly = JSON.parse(safeGet(hourlyKey, '{}'));
    hourly[hour] = (hourly[hour] || 0) + 1;
    safeSet(hourlyKey, JSON.stringify(hourly));

    // FIX 6: Only bump on real steps
    updateStepsUI(true);

    const c = document.getElementById('ringCenter');
    c.classList.remove('step-flash');
    void c.offsetWidth;
    c.classList.add('step-flash');

    // Announce milestones to screen readers
    if (stepCount % 1000 === 0) {
      const announcer = document.getElementById('stepAnnouncer');
      if (announcer) announcer.textContent = stepCount + ' pas atteints';
    }
  }
  lastAccel = accel;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 15: Start / Stop Steps
// ═══════════════════════════════════════════════════════════════════════════

function persistRunningState() {
  safeSet(RUNNING_KEY, isRunning ? 'true' : 'false');
  safeSet(ACTIVE_MS_KEY, totalActiveMs.toString());
  if (activeStart) {
    safeSet(ACTIVE_START_KEY, activeStart.toString());
  } else {
    try { localStorage.removeItem(ACTIVE_START_KEY); } catch (e) { /* ignore */ }
  }
  safeSet(SENS_KEY, threshold.toString());
}

function startSteps() {
  if (motionListenerActive) return;
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
  motionListenerActive = true;

  const btn = document.getElementById('btnStart');
  btn.textContent = 'ARRETER';
  btn.style.background = 'linear-gradient(135deg,#ff4444,#cc0000)';
  btn.style.boxShadow = '0 4px 20px rgba(255,68,68,0.3)';

  // Update status pill
  const pill = document.getElementById('statusPill');
  if (pill) { pill.classList.add('active'); document.getElementById('statusText').textContent = 'ACTIF'; }

  persistRunningState();
}

function stopSteps() {
  isRunning = false;
  if (activeStart) { totalActiveMs += Date.now() - activeStart; activeStart = null; }
  window.removeEventListener('devicemotion', handleMotion);
  motionListenerActive = false;

  const btn = document.getElementById('btnStart');
  btn.textContent = 'DEMARRER';
  btn.style.background = '';
  btn.style.boxShadow = '';

  const pill = document.getElementById('statusPill');
  if (pill) { pill.classList.remove('active'); document.getElementById('statusText').textContent = 'INACTIF'; }

  persistRunningState();
  updateStepsUI();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 16: Sleep Mode (FIX 1, 2, 7)
// ═══════════════════════════════════════════════════════════════════════════

function saveSleepSession(obj) {
  safeSet(SLEEP_SESSION_KEY, JSON.stringify(obj));
}

/** activateSleepMode — FIX 1: Remove handleMotion first, then add handleSleepMotion */
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
    // FIX 1: Remove step listener first (mutual exclusion)
    window.removeEventListener('devicemotion', handleMotion);
    // Then add sleep motion handler
    window.addEventListener('devicemotion', handleSleepMotion);
  }

  // FIX 2: Backup interval that confirms sleep even if devicemotion stops firing
  sleepCheckInterval = setInterval(function() {
    if (!sleepConfirmed && stillnessStart && Date.now() - stillnessStart >= SLEEP_CONFIRM_MS) {
      sleepConfirmed = true;
      sleepStart = sleepStart || Date.now();
      updateSleepUI();
    }
  }, 5000);

  updateSleepUI();
}

/** deactivateSleepMode — FIX 7: attribute to sleep START date, FIX 1: re-add handleMotion */
function deactivateSleepMode() {
  if (!sleepStart) { sleepMode = false; updateSleepUI(); return; }

  const wakeTime = Date.now();
  const durationMs = wakeTime - sleepStart;
  const durationHours = durationMs / 3600000;

  // Only save if real sleep (> 30min, < 16h)
  if (durationMs > MIN_SLEEP_MS && durationMs < MAX_SLEEP_MS) {
    // FIX 7: Use sleep START date for attribution (not wake date)
    const sleepDate = dateToIso(new Date(sleepStart));
    const h = getHistory(SLEEP_KEY);
    h[sleepDate] = parseFloat(durationHours.toFixed(2));
    setHistory(SLEEP_KEY, h);

    // FEAT-S13: Store detailed sleep entry (bedtime, waketime)
    var detailH = getHistory(SLEEP_DETAIL_KEY);
    detailH[sleepDate] = {
      bed: sleepStart,
      wake: wakeTime,
      durationH: parseFloat(durationHours.toFixed(2)),
      score: Math.min(100, Math.round((durationHours / sleepGoalH) * 100))
    };
    setHistory(SLEEP_DETAIL_KEY, detailH);
  }

  saveSleepSession({ active: false, start: sleepStart, end: wakeTime, confirmed: sleepConfirmed });

  // FIX 1: Remove sleep motion listener
  window.removeEventListener('devicemotion', handleSleepMotion);
  // FIX 1: Re-add step listener IF isRunning
  if (isRunning) window.addEventListener('devicemotion', handleMotion);

  // FIX 2: Clear backup interval
  clearInterval(sleepCheckInterval);

  sleepMode      = false;
  sleepConfirmed = false;
  sleepStart     = null;

  updateSleepUI();
  syncToFitness();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 17: Water Reminders
// ═══════════════════════════════════════════════════════════════════════════

function resetWaterReminder() {
  safeSet(LAST_DRINK_KEY, Date.now().toString());
  if (waterReminderInterval) clearInterval(waterReminderInterval);
  waterReminderInterval = setInterval(function() {
    if (waterCount < waterGoal) {
      const lastDrink = parseInt(safeGet(LAST_DRINK_KEY, '0'), 10);
      const elapsed = Date.now() - lastDrink;
      if (elapsed >= WATER_REMINDER_MS) {
        const el = document.getElementById('waterReminder');
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 8000);
      }
    }
  }, WATER_REMINDER_MS);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 18: PWA Notifications (FIX 12)
// ═══════════════════════════════════════════════════════════════════════════

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // BUG-S5 fix: fallback to new Notification() if SW controller not ready
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(function(reg) {
      reg.showNotification(title, { body: body, icon: 'icon.svg' });
    });
  } else {
    try {
      new Notification(title, { body: body, icon: 'icon.svg' });
    } catch (e) { /* some browsers block Notification constructor */ }
  }
}

// FIX 12: Streak danger notification (18h check)
function checkStreakDanger() {
  const now = new Date();
  if (now.getHours() >= 18 && stepCount < dailyGoal * 0.8) {
    sendNotif('Streak en danger !', 'Tu es a ' + Math.round(stepCount / dailyGoal * 100) + '% de ton objectif. Bouge-toi !');
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 19: Load State from Storage (FIX 5: date-aware active time)
// ═══════════════════════════════════════════════════════════════════════════

function loadAll() {
  stepCount  = todayVal(STEPS_KEY);
  waterCount = todayVal(WATER_KEY);
  dailyGoal  = parseInt(safeGet(GOAL_KEY, '10000'), 10);
  waterGoal  = parseInt(safeGet(WGOAL_KEY, '8'), 10);

  // Load sensitivity & persist threshold
  const savedSens = safeGet(SENS_KEY, null);
  if (savedSens) {
    threshold = parseFloat(savedSens);
    document.querySelectorAll('#sensChips .chip').forEach(function(c) {
      c.classList.remove('active');
      if (parseFloat(c.dataset.thresh) === threshold) c.classList.add('active');
    });
  }

  // FIX 5: Load active time only if same date
  const savedActiveDate = safeGet(ACTIVE_DATE_KEY);
  if (savedActiveDate === todayIso()) {
    totalActiveMs = parseInt(safeGet(ACTIVE_MS_KEY, '0'), 10);
  } else {
    totalActiveMs = 0;
  }

  // Load running state
  const wasRunning = safeGet(RUNNING_KEY, 'false') === 'true';
  const savedActiveStart = safeGet(ACTIVE_START_KEY, null);
  if (wasRunning) {
    if (savedActiveStart) {
      totalActiveMs += Date.now() - parseInt(savedActiveStart, 10);
    }
    startSteps();
  }

  // Sleep: load active session
  try {
    const sd = JSON.parse(localStorage.getItem(SLEEP_SESSION_KEY) || 'null');
    if (sd && sd.active) {
      sleepMode      = true;
      sleepStart     = sd.start;
      sleepConfirmed = sd.confirmed || false;
      // BUG-S2 fix: reattach motion listener and restart backup interval on reload
      if (typeof DeviceMotionEvent !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
        window.addEventListener('devicemotion', handleSleepMotion);
      }
      sleepCheckInterval = setInterval(function() {
        if (!sleepConfirmed && stillnessStart && Date.now() - stillnessStart >= SLEEP_CONFIRM_MS) {
          sleepConfirmed = true;
          sleepStart = sleepStart || Date.now();
          saveSleepSession({ active: true, start: sleepStart, confirmed: true });
          updateSleepUI();
        }
      }, 5000);
    }
  } catch (e) { /* ignore */ }

  // FIX 10: Load history mode preference
  historyDays = parseInt(safeGet(HISTORY_MODE_KEY, '7'), 10);
  updateHistoryToggleUI();

  // Init transformation name tracking
  lastTransformName = getCurrentTransformation(getTotalAllTimeSteps()).name;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 20: Midnight Reset
// ═══════════════════════════════════════════════════════════════════════════

function checkMidnightReset() {
  const lastDate = safeGet(LAST_DATE_KEY, null);
  const today = todayIso();
  if (lastDate && lastDate !== today) {
    // New day
    waterCount = 0;
    saveTodayVal(WATER_KEY, 0);
    stepCount = todayVal(STEPS_KEY);
    totalActiveMs = 0;
    goalNotifSent = false;
    persistRunningState();
    updateStepsUI();
    updateWaterUI();
    updateSleepUI();
  }
  safeSet(LAST_DATE_KEY, today);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 21: Smart Intervals (FIX 4: pause when hidden)
// ═══════════════════════════════════════════════════════════════════════════

function updateActiveMinutes() {
  if (isRunning) {
    const ams = totalActiveMs + (Date.now() - (activeStart || Date.now()));
    document.getElementById('minDisp').textContent = Math.floor(ams / 60000);
    // FIX 5: Save active date
    safeSet(ACTIVE_DATE_KEY, todayIso());
  }
  if (sleepMode && sleepConfirmed) updateSleepUI();
  // FIX 12: Check streak danger at 18h+
  checkStreakDanger();
  // FEAT-S9: Activity reminder check
  checkActivityReminder();
}

function startIntervals() {
  setInterval(checkInactivityReminder, 30 * 60 * 1000); // Check every 30min
  midnightInterval = setInterval(checkMidnightReset, 60000);
  activeInterval = setInterval(updateActiveMinutes, 10000);
}

function stopIntervals() {
  clearInterval(midnightInterval);
  clearInterval(activeInterval);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22: History Toggle (FIX 10)
// ═══════════════════════════════════════════════════════════════════════════

function updateHistoryToggleUI() {
  document.querySelectorAll('.history-toggle-btn').forEach(function(btn) {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.days) === historyDays) btn.classList.add('active');
  });
}

function setupHistoryToggles() {
  document.querySelectorAll('.history-toggle').forEach(function(toggle) {
    toggle.querySelectorAll('.history-toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        historyDays = parseInt(btn.dataset.days);
        safeSet(HISTORY_MODE_KEY, historyDays.toString());
        updateHistoryToggleUI();
        renderStepsHistory();
        renderSleepHistory();
        renderWaterHistory();
      });
    });
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22b: Compact Widget Mode
// ═══════════════════════════════════════════════════════════════════════════

function toggleCompactMode() {
  compactMode = !compactMode;
  safeSet(COMPACT_KEY, compactMode ? 'true' : 'false');
  applyCompactMode();
}

function applyCompactMode() {
  var el = document.getElementById('compactContent');
  var btn = document.getElementById('btnCompact');
  if (!el || !btn) return;
  if (compactMode) {
    el.classList.add('hidden');
    btn.innerHTML = 'DETAILS ▼';
    btn.classList.add('compact-active');
  } else {
    el.classList.remove('hidden');
    btn.innerHTML = 'COMPACT ▲';
    btn.classList.remove('compact-active');
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22c: Weekly Summary Modal
// ═══════════════════════════════════════════════════════════════════════════

function checkWeeklySummary() {
  var now = new Date();
  // Only show on Monday (day 1)
  if (now.getDay() !== 1) return;

  var today = todayIso();
  var lastShown = safeGet(WEEKLY_SHOWN_KEY, '');
  if (lastShown === today) return;

  // Calculate last week's data (Monday to Sunday)
  var stepsH = getHistory(STEPS_KEY);
  var sleepH = getHistory(SLEEP_KEY);
  var waterH = getHistory(WATER_KEY);

  // Last week = 7 days ending yesterday
  var thisWeekDays = [];
  var prevWeekDays = [];
  for (var i = 1; i <= 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    thisWeekDays.push(dateToIso(d));
  }
  for (var i = 8; i <= 14; i++) {
    var d2 = new Date();
    d2.setDate(d2.getDate() - i);
    prevWeekDays.push(dateToIso(d2));
  }

  // Calculate stats for this week
  var totalSteps = 0;
  var bestDay = { steps: 0, date: '' };
  var worstDay = { steps: Infinity, date: '' };
  var goalsAchieved = 0;
  var totalSleep = 0;
  var sleepCount = 0;
  var totalWater = 0;
  var waterCount2 = 0;

  thisWeekDays.forEach(function(day) {
    var s = stepsH[day] || 0;
    totalSteps += s;
    if (s > bestDay.steps) { bestDay.steps = s; bestDay.date = day; }
    if (s < worstDay.steps) { worstDay.steps = s; worstDay.date = day; }
    if (s >= dailyGoal) goalsAchieved++;
    var sl = sleepH[day] || 0;
    if (sl > 0) { totalSleep += sl; sleepCount++; }
    var w = waterH[day] || 0;
    if (w > 0) { totalWater += w; waterCount2++; }
  });

  if (worstDay.steps === Infinity) worstDay.steps = 0;

  var avgSteps = Math.round(totalSteps / 7);
  var avgSleep = sleepCount > 0 ? (totalSleep / sleepCount).toFixed(1) : '?';
  var avgWater = waterCount2 > 0 ? (totalWater / waterCount2).toFixed(1) : '?';

  // Previous week total
  var prevTotal = 0;
  prevWeekDays.forEach(function(day) { prevTotal += stepsH[day] || 0; });
  var diff = prevTotal > 0 ? Math.round(((totalSteps - prevTotal) / prevTotal) * 100) : 0;
  var diffSign = diff >= 0 ? '+' : '';
  var diffColor = diff >= 0 ? 'var(--green)' : 'var(--red)';

  // Format dates
  function fmtDate(iso) {
    if (!iso) return '?';
    try {
      var parts = iso.split('-');
      var months = ['jan', 'fev', 'mars', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];
      return parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1];
    } catch(e) { return iso; }
  }

  // Current transformation
  var transfo = getCurrentTransformation(getTotalAllTimeSteps());

  // Build modal
  var modal = document.getElementById('weeklyModal');
  if (!modal) return;

  var body = document.getElementById('weeklyModalBody');
  if (!body) return;

  body.innerHTML =
    '<div style="font-size:2rem;margin-bottom:8px">📊</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;margin-bottom:12px">' +
      '<div class="weekly-stat"><div class="weekly-stat-val">' + fmtNum(totalSteps) + '</div><div class="weekly-stat-lbl">Pas total</div></div>' +
      '<div class="weekly-stat"><div class="weekly-stat-val">' + fmtNum(avgSteps) + '</div><div class="weekly-stat-lbl">Moy/jour</div></div>' +
      '<div class="weekly-stat"><div class="weekly-stat-val" style="color:' + diffColor + '">' + diffSign + diff + '%</div><div class="weekly-stat-lbl">vs sem. prec.</div></div>' +
      '<div class="weekly-stat"><div class="weekly-stat-val">' + goalsAchieved + '/7</div><div class="weekly-stat-lbl">Objectifs</div></div>' +
    '</div>' +
    '<div style="font-size:0.78rem;color:var(--muted);line-height:1.8;text-align:left">' +
      'Meilleur jour : <strong style="color:var(--green)">' + fmtNum(bestDay.steps) + ' pas</strong> (' + fmtDate(bestDay.date) + ')<br>' +
      'Pire jour : <strong style="color:var(--red)">' + fmtNum(worstDay.steps) + ' pas</strong> (' + fmtDate(worstDay.date) + ')<br>' +
      'Sommeil moy : <strong style="color:#a78bfa">' + avgSleep + 'h</strong><br>' +
      'Hydratation moy : <strong style="color:var(--blue)">' + avgWater + ' verres</strong><br>' +
      'Transformation : <strong style="color:var(--gold)">' + transfo.emoji + ' ' + transfo.name + '</strong>' +
    '</div>';

  modal.classList.remove('hidden');
  safeSet(WEEKLY_SHOWN_KEY, today);

  // FEAT-S4: Store weekly report for later viewing
  var reports = [];
  try { reports = JSON.parse(safeGet(WEEKLY_REPORTS_KEY, '[]')); } catch(e) { reports = []; }
  reports.unshift({
    date: today,
    totalSteps: totalSteps,
    avgSteps: avgSteps,
    bestDay: bestDay,
    worstDay: worstDay,
    goalsAchieved: goalsAchieved,
    avgSleep: avgSleep,
    avgWater: avgWater,
    diff: diff
  });
  // Keep max 12 weeks
  if (reports.length > 12) reports = reports.slice(0, 12);
  safeSet(WEEKLY_REPORTS_KEY, JSON.stringify(reports));
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22d: Badges / Achievements System
// ═══════════════════════════════════════════════════════════════════════════

var BADGE_DEFS = [
  { id: 'premier_pas', name: 'Premier Pas', desc: '1 pas \u2014 Dragon Ball 1 \u00e9toile', icon: '\uD83C\uDF1F', check: function() { return getTotalAllTimeSteps() >= 1; } },
  { id: 'club_10k', name: '10K Club', desc: '10 000 pas en un jour \u2014 4 \u00e9toiles', icon: '\u2B50', check: function() {
    var h = getHistory(STEPS_KEY);
    return Object.values(h).some(function(v) { return v >= 10000; });
  }},
  { id: 'marathon', name: 'Marathon', desc: '42 195 pas en un jour \u2014 7 \u00e9toiles', icon: '\uD83D\uDD34', check: function() {
    var h = getHistory(STEPS_KEY);
    return Object.values(h).some(function(v) { return v >= 42195; });
  }},
  { id: 'semaine_parfaite', name: 'Semaine Parfaite', desc: '7/7 objectifs atteints \u2014 Potara', icon: '\uD83C\uDFC5', check: function() {
    var h = getHistory(STEPS_KEY);
    var streak2 = 0;
    var d = new Date();
    for (var i = 0; i < 365; i++) {
      var iso = dateToIso(d);
      if ((h[iso] || 0) >= dailyGoal) {
        streak2++;
        if (streak2 >= 7) return true;
      } else {
        streak2 = 0;
      }
      d.setDate(d.getDate() - 1);
    }
    return false;
  }},
  { id: 'hydrate', name: 'Hydrat\u00e9', desc: '30 jours cons\u00e9cutifs 8+ verres \u2014 Senzu Bean', icon: '\uD83D\uDCA7', check: function() {
    var h = getHistory(WATER_KEY);
    var count3 = 0;
    Object.values(h).forEach(function(v) { if (v >= 8) count3++; });
    return count3 >= 30;
  }},
  { id: 'dormeur_elite', name: "Dormeur d'\u00c9lite", desc: '14 jours 7h+ sommeil \u2014 HTC', icon: '\uD83D\uDE34', check: function() {
    var h = getHistory(SLEEP_KEY);
    var count4 = 0;
    Object.values(h).forEach(function(v) { if (v >= 7) count4++; });
    return count4 >= 14;
  }},
  { id: 'million_steps', name: 'Million Steps', desc: '1 000 000 pas cumul\u00e9s \u2014 Ultra Instinct', icon: '\uD83D\uDD25', check: function() { return getTotalAllTimeSteps() >= 1000000; } }
];

function getUnlockedBadges() {
  try { return JSON.parse(safeGet(BADGES_KEY, '[]')); }
  catch(e) { return []; }
}

function checkBadges() {
  var unlocked = getUnlockedBadges();
  var changed = false;
  var newlyUnlocked = [];

  BADGE_DEFS.forEach(function(badge) {
    if (unlocked.indexOf(badge.id) === -1 && badge.check()) {
      unlocked.push(badge.id);
      newlyUnlocked.push(badge.id);
      changed = true;
      showToast(badge.icon + ' Badge d\u00e9bloqu\u00e9 : ' + badge.name + ' !', 4000);
      sendNotif('Badge d\u00e9bloqu\u00e9 !', badge.icon + ' ' + badge.name);
      showConfetti();
    }
  });

  if (changed) {
    safeSet(BADGES_KEY, JSON.stringify(unlocked));
  }
  renderBadges(unlocked, newlyUnlocked);
}

function renderBadges(unlocked, newlyUnlocked) {
  var container = document.getElementById('badgesGrid');
  if (!container) return;
  container.innerHTML = '';
  if (!newlyUnlocked) newlyUnlocked = [];

  BADGE_DEFS.forEach(function(badge) {
    var isUnlocked = unlocked.indexOf(badge.id) !== -1;
    var isNew = newlyUnlocked.indexOf(badge.id) !== -1;
    var el = document.createElement('div');
    el.className = 'badge-card' + (isUnlocked ? ' unlocked' : '') + (isNew ? ' just-unlocked' : '');
    el.innerHTML = '<div class="badge-icon">' + (isUnlocked ? badge.icon : '\uD83D\uDD12') + '</div>' +
      '<div class="badge-name">' + badge.name + '</div>' +
      '<div class="badge-desc">' + badge.desc + '</div>';
    container.appendChild(el);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22e: Solo Challenges (DBZ Theme)
// ═══════════════════════════════════════════════════════════════════════════

var CHALLENGE_DEFS = [
  {
    id: 'tortue_geniale',
    name: 'Entra\u00eenement de Tortue G\u00e9niale',
    desc: '15 000 pas/jour pendant 7 jours',
    icon: '\uD83D\uDC22',
    badge: '\uD83D\uDC22',
    duration: 7,
    target: 15000,
    check: function(dayData) { return dayData.steps >= 15000; }
  },
  {
    id: 'gravity_x10',
    name: 'Gravit\u00e9 \u00d710',
    desc: '2\u00d7 ton objectif quotidien pendant 3 jours',
    icon: '\uD83D\uDCAA',
    badge: '\uD83D\uDCAA',
    duration: 3,
    target: 0,
    check: function(dayData) { return dayData.steps >= dailyGoal * 2; }
  },
  {
    id: 'snake_way',
    name: 'Course Snake Way',
    desc: '100 000 pas total en 7 jours',
    icon: '\uD83D\uDC0D',
    badge: '\uD83D\uDC0D',
    duration: 7,
    target: 100000,
    check: null,
    checkTotal: function(totalSteps) { return totalSteps >= 100000; }
  },
  {
    id: 'whis_regime',
    name: 'R\u00e9gime de Whis',
    desc: 'Objectif pas + 8 verres + 7h sommeil pendant 5 jours',
    icon: '\uD83D\uDC7C',
    badge: '\uD83D\uDC7C',
    duration: 5,
    target: 0,
    check: function(dayData) {
      return dayData.steps >= dailyGoal && dayData.water >= 8 && dayData.sleep >= 7;
    }
  },
  {
    id: 'vegeta_training',
    name: 'Entra\u00eenement de Vegeta',
    desc: '20 000 pas/jour pendant 30 jours',
    icon: '\uD83D\uDC51',
    badge: '\uD83D\uDC51',
    duration: 30,
    target: 20000,
    check: function(dayData) { return dayData.steps >= 20000; }
  }
];

function getChallenges() {
  try { return JSON.parse(safeGet(CHALLENGES_KEY, '{}')); }
  catch(e) { return {}; }
}

function saveChallenges(data) {
  safeSet(CHALLENGES_KEY, JSON.stringify(data));
}

function startChallenge(id) {
  var challenges = getChallenges();
  if (challenges[id] && challenges[id].completed) {
    showToast('Ce challenge est deja complete !');
    return;
  }
  challenges[id] = {
    startDate: todayIso(),
    daysCompleted: 0,
    totalSteps: 0,
    completed: false,
    lastCheckedDate: ''
  };
  saveChallenges(challenges);
  showToast('Challenge demarre !', 2000);
  renderChallenges();
}

function updateChallenges() {
  var challenges = getChallenges();
  var today = todayIso();
  var stepsH = getHistory(STEPS_KEY);
  var waterH = getHistory(WATER_KEY);
  var sleepH = getHistory(SLEEP_KEY);
  var changed = false;

  CHALLENGE_DEFS.forEach(function(def) {
    var ch = challenges[def.id];
    if (!ch || ch.completed) return;
    if (ch.lastCheckedDate === today) return;

    // Check if challenge expired (beyond duration + 1 day buffer)
    var startD = new Date(ch.startDate + 'T12:00:00');
    var now = new Date();
    var daysSinceStart = Math.floor((now - startD) / 86400000);

    if (def.checkTotal) {
      // Cumulative challenge
      var total = 0;
      for (var i = 0; i <= daysSinceStart && i < def.duration; i++) {
        var d = new Date(startD);
        d.setDate(d.getDate() + i);
        var iso = dateToIso(d);
        total += stepsH[iso] || 0;
      }
      ch.totalSteps = total;
      if (def.checkTotal(total)) {
        ch.completed = true;
        ch.daysCompleted = def.duration;
        showToast(def.icon + ' Challenge ' + def.name + ' complete !', 4000);
        sendNotif('Challenge complete !', def.icon + ' ' + def.name);
        changed = true;
      } else if (daysSinceStart >= def.duration) {
        // Failed
        delete challenges[def.id];
        changed = true;
      }
    } else {
      // Daily challenge - check yesterday or today
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yIso = dateToIso(yesterday);

      // Check each unchecked day
      for (var j = 0; j <= daysSinceStart && j < def.duration; j++) {
        var dd = new Date(startD);
        dd.setDate(dd.getDate() + j);
        var dayIso = dateToIso(dd);
        if (dayIso >= today) continue; // Don't check today yet (not over)

        var dayData = {
          steps: stepsH[dayIso] || 0,
          water: waterH[dayIso] || 0,
          sleep: sleepH[dayIso] || 0
        };

        if (def.check(dayData)) {
          // Only count if not already counted
          ch.daysCompleted = Math.min(def.duration, ch.daysCompleted + 1);
        }
      }

      ch.lastCheckedDate = today;
      changed = true;

      if (ch.daysCompleted >= def.duration) {
        ch.completed = true;
        showToast(def.icon + ' Challenge ' + def.name + ' complete !', 4000);
        sendNotif('Challenge complete !', def.icon + ' ' + def.name);
      } else if (daysSinceStart > def.duration + 1) {
        // Expired - remove
        delete challenges[def.id];
      }
    }
  });

  if (changed) saveChallenges(challenges);
  renderChallenges();
}

function renderChallenges() {
  var container = document.getElementById('challengesGrid');
  if (!container) return;
  container.innerHTML = '';
  var challenges = getChallenges();

  CHALLENGE_DEFS.forEach(function(def) {
    var ch = challenges[def.id];
    var el = document.createElement('div');
    el.className = 'challenge-card' + (ch && ch.completed ? ' completed' : '');

    var progressHtml = '';
    if (ch && !ch.completed) {
      if (def.checkTotal) {
        var pct = Math.min(100, Math.round((ch.totalSteps / 100000) * 100));
        progressHtml = '<div class="challenge-progress"><div class="challenge-progress-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="challenge-progress-text">' + fmtNum(ch.totalSteps) + ' / 100 000</div>';
      } else {
        progressHtml = '<div class="challenge-progress"><div class="challenge-progress-fill" style="width:' + Math.round((ch.daysCompleted / def.duration) * 100) + '%"></div></div>' +
          '<div class="challenge-progress-text">' + ch.daysCompleted + ' / ' + def.duration + ' jours</div>';
      }
    } else if (ch && ch.completed) {
      progressHtml = '<div class="challenge-badge-done">\u2705 Complete</div>';
    }

    var btnHtml = '';
    if (!ch) {
      btnHtml = '<button class="btn-challenge-start" data-challenge="' + def.id + '">LANCER</button>';
    }

    el.innerHTML = '<div class="challenge-icon">' + def.icon + '</div>' +
      '<div class="challenge-name">' + def.name + '</div>' +
      '<div class="challenge-desc">' + def.desc + '</div>' +
      progressHtml + btnHtml;

    container.appendChild(el);
  });

  // Add click listeners to start buttons
  container.querySelectorAll('.btn-challenge-start').forEach(function(btn) {
    btn.addEventListener('click', function() {
      startChallenge(btn.dataset.challenge);
    });
  });
}



// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22f: FEAT-S9 — Activity Reminders (every 2h, 8h-20h)
// ═══════════════════════════════════════════════════════════════════════════

function checkActivityReminder() {
  var now = new Date();
  var hour = now.getHours();
  if (hour < 8 || hour > 20) return;

  var lastRemind = parseInt(safeGet(MOVE_REMIND_KEY, '0'), 10);
  if (Date.now() - lastRemind < 2 * 3600 * 1000) return;

  // Check if steps were counted in the last hour
  var hourlyKey = 'st_hourly_' + todayIso();
  var hourly = JSON.parse(safeGet(hourlyKey, '{}'));
  var lastHourSteps = hourly[hour] || 0;
  var prevHourSteps = hourly[hour - 1] || 0;

  if (lastHourSteps === 0 && prevHourSteps === 0) {
    sendNotif('Hey guerrier !', 'Tu es immobile depuis trop longtemps. Bouge pour maintenir ton ki !');
    safeSet(MOVE_REMIND_KEY, Date.now().toString());
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22g: FEAT-S10 — User Profile Settings
// ═══════════════════════════════════════════════════════════════════════════

function getUserProfile() {
  if (!userProfile) return { weight: 70, height: 175, age: 30, sex: 'M' };
  return userProfile;
}

function saveUserProfile(profile) {
  userProfile = profile;
  safeSet(USER_PROFILE_KEY, JSON.stringify(profile));
}

function openSettingsModal() {
  var modal = document.getElementById('settingsModal');
  if (!modal) return;
  var p = getUserProfile();
  document.getElementById('profileWeight').value = p.weight;
  document.getElementById('profileHeight').value = p.height;
  document.getElementById('profileAge').value = p.age;
  document.getElementById('profileSex').value = p.sex;
  document.getElementById('sleepGoalInput').value = sleepGoalH;
  document.getElementById('themeToggle').checked = lightTheme;
  // FEAT-S8: Load goal fields
  var stepGoalEl = document.getElementById('profileStepGoal');
  var calGoalEl = document.getElementById('profileCalGoal');
  var distGoalEl = document.getElementById('profileDistGoal');
  if (stepGoalEl) stepGoalEl.value = dailyGoal;
  if (calGoalEl) calGoalEl.value = calGoal;
  if (distGoalEl) distGoalEl.value = distGoal;
  modal.classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettingsFromModal() {
  var w = parseInt(document.getElementById('profileWeight').value, 10);
  var h = parseInt(document.getElementById('profileHeight').value, 10);
  var a = parseInt(document.getElementById('profileAge').value, 10);
  var s = document.getElementById('profileSex').value;

  if (isNaN(w) || w < 20 || w > 300) { showToast('Poids invalide (20-300 kg)'); return; }
  if (isNaN(h) || h < 100 || h > 250) { showToast('Taille invalide (100-250 cm)'); return; }
  if (isNaN(a) || a < 5 || a > 120) { showToast('Age invalide (5-120)'); return; }

  saveUserProfile({ weight: w, height: h, age: a, sex: s });

  // Also update legacy weight
  userWeight = w;
  safeSet(WEIGHT_KEY, w.toString());
  if (document.getElementById('weightDisplay')) document.getElementById('weightDisplay').textContent = w + ' kg';

  // FEAT-S12: Save sleep goal
  var sg = parseFloat(document.getElementById('sleepGoalInput').value);
  if (!isNaN(sg) && sg >= SLEEP_GOAL_MIN && sg <= SLEEP_GOAL_MAX) {
    sleepGoalH = sg;
    safeSet(SLEEP_GOAL_KEY, sg.toString());
  }

  // FEAT-S14: Save theme
  var newTheme = document.getElementById('themeToggle').checked;
  if (newTheme !== lightTheme) {
    lightTheme = newTheme;
    safeSet(THEME_KEY, lightTheme ? 'true' : 'false');
    applyTheme();
  }

  // FEAT-S8: Save step/cal/dist goals from settings
  var stepGoalEl = document.getElementById('profileStepGoal');
  if (stepGoalEl) {
    var newStepGoal = parseInt(stepGoalEl.value, 10);
    if (!isNaN(newStepGoal) && newStepGoal >= 1000 && newStepGoal <= 50000) {
      dailyGoal = newStepGoal;
      safeSet(GOAL_KEY, dailyGoal.toString());
    }
  }
  var calGoalEl = document.getElementById('profileCalGoal');
  if (calGoalEl) {
    var newCalGoal = parseInt(calGoalEl.value, 10);
    if (!isNaN(newCalGoal) && newCalGoal >= 100 && newCalGoal <= 2000) {
      calGoal = newCalGoal;
      safeSet(CAL_GOAL_KEY, calGoal.toString());
    }
  }
  var distGoalEl = document.getElementById('profileDistGoal');
  if (distGoalEl) {
    var newDistGoal = parseFloat(distGoalEl.value);
    if (!isNaN(newDistGoal) && newDistGoal >= 1 && newDistGoal <= 50) {
      distGoal = newDistGoal;
      safeSet(DIST_GOAL_KEY, distGoal.toString());
    }
  }

  updateCalorieRing();
  updateDistanceGoal();
  updateStepsUI();
  updateSleepUI();
  closeSettingsModal();
  showToast('Profil sauvegard\u00e9 !');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22h: FEAT-S11 — Data Export (CSV/JSON)
// ═══════════════════════════════════════════════════════════════════════════

function exportDataJSON() {
  var stepsH = getHistory(STEPS_KEY);
  var sleepH = getHistory(SLEEP_KEY);
  var waterH = getHistory(WATER_KEY);
  var detailH = getHistory(SLEEP_DETAIL_KEY);

  var allDates = new Set();
  Object.keys(stepsH).forEach(function(k) { allDates.add(k); });
  Object.keys(sleepH).forEach(function(k) { allDates.add(k); });
  Object.keys(waterH).forEach(function(k) { allDates.add(k); });

  var sorted = Array.from(allDates).sort();
  var rows = sorted.map(function(date) {
    var detail = detailH[date] || {};
    return {
      date: date,
      steps: stepsH[date] || 0,
      sleep_hours: sleepH[date] || 0,
      water_glasses: waterH[date] || 0,
      bedtime: detail.bed ? new Date(detail.bed).toISOString() : null,
      waketime: detail.wake ? new Date(detail.wake).toISOString() : null,
      sleep_score: detail.score || null
    };
  });

  var blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'saiyan-steps-export.json');
}

function exportDataCSV() {
  var stepsH = getHistory(STEPS_KEY);
  var sleepH = getHistory(SLEEP_KEY);
  var waterH = getHistory(WATER_KEY);
  var detailH = getHistory(SLEEP_DETAIL_KEY);

  var allDates = new Set();
  Object.keys(stepsH).forEach(function(k) { allDates.add(k); });
  Object.keys(sleepH).forEach(function(k) { allDates.add(k); });
  Object.keys(waterH).forEach(function(k) { allDates.add(k); });

  var sorted = Array.from(allDates).sort();
  var lines = ['date,steps,sleep_hours,water_glasses,bedtime,waketime,sleep_score'];
  sorted.forEach(function(date) {
    var detail = detailH[date] || {};
    lines.push([
      date,
      stepsH[date] || 0,
      sleepH[date] || 0,
      waterH[date] || 0,
      detail.bed ? new Date(detail.bed).toISOString() : '',
      detail.wake ? new Date(detail.wake).toISOString() : '',
      detail.score || ''
    ].join(','));
  });

  var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  downloadBlob(blob, 'saiyan-steps-export.csv');
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22i: FEAT-S13 — Detailed Sleep History Display
// ═══════════════════════════════════════════════════════════════════════════

function renderSleepDetailHistory() {
  var container = document.getElementById('sleepDetailHistory');
  if (!container) return;
  container.innerHTML = '';

  var detailH = getHistory(SLEEP_DETAIL_KEY);
  var numDays = historyDays;
  var days = [];
  for (var i = numDays - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateToIso(d));
  }

  // Render detail entries
  var hasData = false;
  days.forEach(function(day) {
    var entry = detailH[day];
    if (!entry) return;
    hasData = true;

    var bedDate = new Date(entry.bed);
    var wakeDate = new Date(entry.wake);
    var bedStr = bedDate.getHours() + 'h' + (bedDate.getMinutes() < 10 ? '0' : '') + bedDate.getMinutes();
    var wakeStr = wakeDate.getHours() + 'h' + (wakeDate.getMinutes() < 10 ? '0' : '') + wakeDate.getMinutes();
    var durH = Math.floor(entry.durationH);
    var durM = Math.round((entry.durationH - durH) * 60);
    var durStr = durH + 'h' + (durM < 10 ? '0' : '') + durM;

    var row = document.createElement('div');
    row.className = 'sleep-detail-row';
    row.innerHTML = '<span class="sleep-detail-date">' + day.slice(5) + '</span>' +
      '<span class="sleep-detail-time">' + bedStr + ' \u2192 ' + wakeStr + '</span>' +
      '<span class="sleep-detail-dur">(' + durStr + ', score: ' + entry.score + '%)</span>';
    container.appendChild(row);
  });

  if (!hasData) {
    container.innerHTML = '<div style="color:var(--muted);font-size:0.78rem;text-align:center;padding:12px">Aucune donnee detaillee de sommeil</div>';
  }

  // FEAT-S13: Horizontal bar chart for sleep patterns
  renderSleepPatternChart(days, detailH);
}

function renderSleepPatternChart(days, detailH) {
  var container = document.getElementById('sleepPatternChart');
  if (!container) return;
  container.innerHTML = '';

  var maxH = sleepGoalH + 2;
  days.forEach(function(day) {
    var entry = detailH[day];
    var val = entry ? entry.durationH : 0;
    var pct = Math.min(100, Math.round((val / maxH) * 100));
    var isGoal = val >= sleepGoalH;

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.65rem';

    var label = document.createElement('span');
    label.style.cssText = 'min-width:32px;text-align:right;color:var(--muted)';
    label.textContent = day.slice(5);

    var barWrap = document.createElement('div');
    barWrap.style.cssText = 'flex:1;height:10px;background:rgba(255,255,255,0.06);border-radius:5px;overflow:hidden';

    var barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;border-radius:5px;transition:width 0.3s;width:' + (val > 0 ? Math.max(3, pct) : 0) + '%;background:' + (isGoal ? 'var(--gradient-sleep)' : 'rgba(102,126,234,0.4)');

    var valLabel = document.createElement('span');
    valLabel.style.cssText = 'min-width:36px;color:' + (isGoal ? '#a78bfa' : 'var(--muted)');
    valLabel.textContent = val > 0 ? val.toFixed(1) + 'h' : '\u2014';

    barWrap.appendChild(barFill);
    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(valLabel);
    container.appendChild(row);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22j: FEAT-S14 — Light Theme Mode
// ═══════════════════════════════════════════════════════════════════════════

function applyTheme() {
  var root = document.documentElement;
  if (lightTheme) {
    root.style.setProperty('--bg', '#f5f5f5');
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--stroke', 'rgba(0,0,0,0.08)');
    root.style.setProperty('--text', '#1a1a2e');
    root.style.setProperty('--muted', '#6b7280');
    root.style.setProperty('--gold', '#FF8C00');
    root.style.setProperty('--orange', '#FF6B00');
    document.body.classList.add('light-theme');
  } else {
    root.style.setProperty('--bg', '#0a0a0f');
    root.style.setProperty('--bg-card', '#12151f');
    root.style.setProperty('--stroke', 'rgba(255,255,255,0.07)');
    root.style.setProperty('--text', '#f0f4ff');
    root.style.setProperty('--muted', '#94a3c0');
    root.style.setProperty('--gold', '#FFD700');
    root.style.setProperty('--orange', '#FF8C00');
    document.body.classList.remove('light-theme');
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22k: FEAT-S15 — Transformation Animations
// ═══════════════════════════════════════════════════════════════════════════

function showTransformationAnimation(transformName, emoji) {
  var overlay = document.getElementById('transformOverlay');
  if (!overlay) return;

  var nameEl = document.getElementById('transformAnimName');
  var emojiEl = document.getElementById('transformAnimEmoji');
  if (nameEl) nameEl.textContent = transformName;
  if (emojiEl) emojiEl.textContent = emoji;

  overlay.classList.remove('hidden');

  // Spawn golden particles
  spawnGoldenParticles();

  // Flash effect
  overlay.style.animation = 'transformFlash 0.3s ease-out';

  setTimeout(function() {
    overlay.classList.add('hidden');
    overlay.style.animation = '';
  }, 3000);
}

function spawnGoldenParticles() {
  var canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  var ctx = canvas.getContext('2d');
  var particles = [];
  var colors = ['#FFD700', '#FFAA00', '#FF8C00', '#FFF8DC', '#FFE4B5'];

  for (var i = 0; i < 120; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = Math.random() * 4 + 1;
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: Math.random() * 4 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.005 + Math.random() * 0.01
    });
  }

  var frames = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var alive = false;
    particles.forEach(function(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.alpha -= p.decay;
      if (p.alpha <= 0) return;
      alive = true;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    frames++;
    if (alive && frames < 180) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  animate();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22l: FEAT-S16 — Friends Leaderboard (Supabase)
// ═══════════════════════════════════════════════════════════════════════════

function generateFriendCode() {
  var code = safeGet(FRIENDS_CODE_KEY, '');
  if (!code) {
    code = 'SAI-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    safeSet(FRIENDS_CODE_KEY, code);
  }
  return code;
}

async function syncToLeaderboard() {
  if (typeof getSbClient !== 'function') return;
  var sb = getSbClient();
  if (!sb || !_sbUser) return;

  var friendCode = generateFriendCode();
  var today = todayIso();

  // Get weekly steps total
  var stepsH = getHistory(STEPS_KEY);
  var weekTotal = 0;
  for (var i = 0; i < 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var iso = dateToIso(d);
    weekTotal += stepsH[iso] || 0;
  }

  try {
    await sb.from('steps_leaderboard').upsert({
      user_id: _sbUser.id,
      friend_code: friendCode,
      display_name: _sbUser.email ? _sbUser.email.split('@')[0] : 'Guerrier',
      week_steps: weekTotal,
      today_steps: stepCount,
      transformation: getCurrentTransformation(getTotalAllTimeSteps()).name,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch(e) { /* ignore sync errors */ }
}

async function loadLeaderboard() {
  var container = document.getElementById('leaderboardList');
  if (!container) return;

  if (typeof getSbClient !== 'function') {
    container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Connecte-toi pour voir le classement</div>';
    return;
  }

  var sb = getSbClient();
  if (!sb || !_sbUser) {
    container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Connecte-toi pour voir le classement</div>';
    return;
  }

  container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Chargement...</div>';

  try {
    var { data, error } = await sb.from('steps_leaderboard')
      .select('*')
      .order('week_steps', { ascending: false })
      .limit(20);

    if (error || !data) {
      container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Erreur de chargement</div>';
      return;
    }

    container.innerHTML = '';
    if (data.length === 0) {
      container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Aucun participant pour le moment</div>';
      return;
    }

    data.forEach(function(entry, idx) {
      var medal = idx === 0 ? '\uD83E\uDD47' : idx === 1 ? '\uD83E\uDD48' : idx === 2 ? '\uD83E\uDD49' : (idx + 1) + '.';
      var isMe = entry.user_id === _sbUser.id;
      var row = document.createElement('div');
      row.className = 'leaderboard-row' + (isMe ? ' leaderboard-me' : '');
      row.innerHTML = '<span class="lb-rank">' + medal + '</span>' +
        '<span class="lb-name">' + (entry.display_name || 'Guerrier') + '</span>' +
        '<span class="lb-transform">' + (entry.transformation || '') + '</span>' +
        '<span class="lb-steps">' + fmtNum(entry.week_steps || 0) + '</span>';
      container.appendChild(row);
    });
  } catch(e) {
    container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Erreur: ' + (e.message || e) + '</div>';
  }
}


// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22m: FEAT-S4 — Weekly Reports Viewer
// ═══════════════════════════════════════════════════════════════════════════

function renderWeeklyReports() {
  var container = document.getElementById('weeklyReportsContainer');
  if (!container) return;
  container.innerHTML = '';

  var reports = [];
  try { reports = JSON.parse(safeGet(WEEKLY_REPORTS_KEY, '[]')); } catch(e) { reports = []; }

  if (reports.length === 0) {
    container.innerHTML = '<div style="color:var(--muted);font-size:0.78rem;text-align:center;padding:8px">Aucun rapport disponible. Le premier sera g\u00e9n\u00e9r\u00e9 lundi.</div>';
    return;
  }

  reports.forEach(function(r) {
    var el = document.createElement('div');
    el.className = 'weekly-report-item';
    var diffArrow = r.diff >= 0 ? '\u2191' : '\u2193';
    var diffColor = r.diff >= 0 ? 'var(--green)' : 'var(--red)';
    el.innerHTML = '<strong>' + r.date + '</strong> \u2014 ' +
      fmtNum(r.totalSteps) + ' pas (moy: ' + fmtNum(r.avgSteps) + '/j) \u2014 ' +
      r.goalsAchieved + '/7 objectifs \u2014 ' +
      '<span style="color:' + diffColor + '">' + diffArrow + Math.abs(r.diff) + '%</span> vs pr\u00e9c.';
    el.addEventListener('click', function() {
      showWeeklyReportDetail(r);
    });
    container.appendChild(el);
  });
}

function showWeeklyReportDetail(r) {
  function fmtDate(iso) {
    if (!iso) return '?';
    try {
      var parts = iso.split('-');
      var months = ['jan','f\u00e9v','mars','avr','mai','juin','juil','ao\u00fbt','sept','oct','nov','d\u00e9c'];
      return parseInt(parts[2],10) + ' ' + months[parseInt(parts[1],10)-1];
    } catch(e) { return iso; }
  }
  var diffSign = r.diff >= 0 ? '+' : '';
  var diffColor = r.diff >= 0 ? 'var(--green)' : 'var(--red)';
  var body = document.getElementById('weeklyModalBody');
  body.innerHTML =
    '<div style="font-size:2rem;margin-bottom:8px">\uD83D\uDCCA</div>' +
    '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:8px">Semaine du ' + r.date + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;margin-bottom:12px">' +
      '<div class="weekly-stat"><div class="weekly-stat-val">' + fmtNum(r.totalSteps) + '</div><div class="weekly-stat-lbl">Pas total</div></div>' +
      '<div class="weekly-stat"><div class="weekly-stat-val">' + fmtNum(r.avgSteps) + '</div><div class="weekly-stat-lbl">Moy/jour</div></div>' +
      '<div class="weekly-stat"><div class="weekly-stat-val" style="color:' + diffColor + '">' + diffSign + r.diff + '%</div><div class="weekly-stat-lbl">vs sem. pr\u00e9c.</div></div>' +
      '<div class="weekly-stat"><div class="weekly-stat-val">' + r.goalsAchieved + '/7</div><div class="weekly-stat-lbl">Objectifs</div></div>' +
    '</div>' +
    '<div style="font-size:0.78rem;color:var(--muted);line-height:1.8;text-align:left">' +
      'Meilleur jour : <strong style="color:var(--green)">' + fmtNum(r.bestDay.steps) + ' pas</strong> (' + fmtDate(r.bestDay.date) + ')<br>' +
      'Pire jour : <strong style="color:var(--red)">' + fmtNum(r.worstDay.steps) + ' pas</strong> (' + fmtDate(r.worstDay.date) + ')<br>' +
      'Sommeil moy : <strong style="color:#a78bfa">' + r.avgSleep + 'h</strong><br>' +
      'Hydratation moy : <strong style="color:var(--blue)">' + r.avgWater + ' verres</strong>' +
    '</div>';
  document.getElementById('weeklyModal').classList.remove('hidden');
}

// SECTION 23: Event Listeners & Init
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
    const tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function(b) {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    if (tabId === 'steps') { renderStepsHistory(); renderHourlyChart(); }
    if (tabId === 'sleep') { renderSleepHistory(); renderSleepDetailHistory(); }
    if (tabId === 'water') updateWaterUI();
    if (tabId === 'more') { loadLeaderboard(); renderChallenges(); renderWeeklyReports(); checkBadges(); }
  });
});

// Distance goal controls
document.getElementById('btnDistMode').addEventListener('click', toggleDistanceMode);
document.getElementById('btnDistGoalDown').addEventListener('click', function() {
  distGoal = Math.max(0.5, distGoal - 0.5);
  safeSet(DIST_GOAL_KEY, distGoal.toString());
  updateDistanceGoal();
  if (distanceMode) applyDistanceMode();
});
document.getElementById('btnDistGoalUp').addEventListener('click', function() {
  distGoal = Math.min(50, distGoal + 0.5);
  safeSet(DIST_GOAL_KEY, distGoal.toString());
  updateDistanceGoal();
  if (distanceMode) applyDistanceMode();
});

// Calorie goal controls
document.getElementById('btnCalGoalDown').addEventListener('click', function() {
  calGoal = Math.max(100, calGoal - 50);
  safeSet(CAL_GOAL_KEY, calGoal.toString());
  updateCalorieRing();
});
document.getElementById('btnCalGoalUp').addEventListener('click', function() {
  calGoal = Math.min(2000, calGoal + 50);
  safeSet(CAL_GOAL_KEY, calGoal.toString());
  updateCalorieRing();
});
document.getElementById('btnWeightDown').addEventListener('click', function() {
  userWeight = Math.max(30, userWeight - 1);
  safeSet(WEIGHT_KEY, userWeight.toString());
  document.getElementById('weightDisplay').textContent = userWeight + ' kg';
  updateCalorieRing();
  updateStepsUI();
});
document.getElementById('btnWeightUp').addEventListener('click', function() {
  userWeight = Math.min(200, userWeight + 1);
  safeSet(WEIGHT_KEY, userWeight.toString());
  document.getElementById('weightDisplay').textContent = userWeight + ' kg';
  updateCalorieRing();
  updateStepsUI();
});

// FEAT-S10: Settings modal
var btnSettings = document.getElementById('btnSettings');
if (btnSettings) btnSettings.addEventListener('click', openSettingsModal);
var btnCloseSettings = document.getElementById('btnCloseSettings');
if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);
var btnSaveSettings = document.getElementById('btnSaveSettings');
if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettingsFromModal);

// FEAT-S11: Export buttons
var btnExportJSON = document.getElementById('btnExportJSON');
if (btnExportJSON) btnExportJSON.addEventListener('click', exportDataJSON);
var btnExportCSV = document.getElementById('btnExportCSV');
if (btnExportCSV) btnExportCSV.addEventListener('click', exportDataCSV);

// FEAT-S4: Weekly reports viewer
var btnViewReports = document.getElementById('btnViewWeeklyReports');
if (btnViewReports) btnViewReports.addEventListener('click', renderWeeklyReports);

// FEAT-S16: Leaderboard
var btnRefreshLB = document.getElementById('btnRefreshLeaderboard');
if (btnRefreshLB) btnRefreshLB.addEventListener('click', function() { syncToLeaderboard().then(loadLeaderboard); });

// FEAT-S14: Close transform overlay on click
var transformOverlay = document.getElementById('transformOverlay');
if (transformOverlay) transformOverlay.addEventListener('click', function() { transformOverlay.classList.add('hidden'); });

// Weekly summary modal close
document.getElementById('btnCloseWeekly').addEventListener('click', function() {
  document.getElementById('weeklyModal').classList.add('hidden');
});

// Compact mode toggle
document.getElementById('btnCompact').addEventListener('click', toggleCompactMode);

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

// Copy sync code (FIX 8: now async)
document.getElementById('btnCopy').addEventListener('click', function() {
  generateSyncCode().then(function(code) {
    var btn = document.getElementById('btnCopy');
    function onCopySuccess() {
      btn.textContent = '\u2705 Code copie !';
      btn.classList.add('copied');
      setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copier le code de sync'; btn.classList.remove('copied'); }, 2500);
    }
    function onCopyFail() {
      showToast('Impossible de copier le code');
    }
    // BUG-S3 fix: prefer navigator.clipboard.writeText with fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(onCopySuccess).catch(function() {
        try {
          var el = document.createElement('textarea');
          el.value = code; el.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(el); el.select(); document.execCommand('copy');
          document.body.removeChild(el);
          onCopySuccess();
        } catch (e) { onCopyFail(); }
      });
    } else {
      try {
        var el = document.createElement('textarea');
        el.value = code; el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el); el.select(); document.execCommand('copy');
        document.body.removeChild(el);
        onCopySuccess();
      } catch (e) { onCopyFail(); }
    }
  });
});

// FIX 4: Smart visibility change — pause/resume intervals
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    stopIntervals();
  } else {
    checkMidnightReset();
  restoreSleepSession();
    startIntervals();
checkBadges();
updateChallenges();
setTimeout(checkWeeklySummary, 1500);
  }
});

// beforeunload — save state and warn if running
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

// ── Init ──
checkMidnightReset();
  restoreSleepSession();
loadAll();
updateStepsUI();
updateSleepUI();
updateWaterUI();
updateTransformationUI();
resetWaterReminder();
checkAndUpdateBestDay();
updateCalorieRing();
updateDistanceGoal();
applyDistanceMode();
if (document.getElementById('weightDisplay')) document.getElementById('weightDisplay').textContent = userWeight + ' kg';
renderHourlyChart();
setupHistoryToggles();
applyCompactMode();
startIntervals();
checkBadges();
updateChallenges();
setTimeout(checkWeeklySummary, 1500);

// BUG-S2: Restore sleep session on reload
function restoreSleepSession() {
  try {
    const session = safeGet('st_sleep_session', null);
    if (session && (session.status === 'active' || session.status === 'confirmed')) {
      sleepMode = true;
      sleepStart = session.start;
      sleepConfirmed = session.status === 'confirmed';
      if (typeof stillnessStart === 'undefined' || !stillnessStart) {
        stillnessStart = Date.now();
      }
      // Re-attach motion listener for sleep detection
      if (typeof startListeningToMotion === 'function') {
        startListeningToMotion();
      }
      showToast('Mode sommeil restaur\u00e9');
      updateSleepUI();
    }
  } catch(e) { console.warn('Sleep restore failed:', e); }
}


// FEAT-S9: Inactivity reminders (every 2h between 8h-20h)
function checkInactivityReminder() {
  try {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 8 || hour > 20) return;

    const remindersEnabled = safeGet('st_inactivity_remind', true);
    if (!remindersEnabled) return;

    const lastRemind = safeGet('st_last_move_remind', 0);
    const twoHours = 2 * 60 * 60 * 1000;
    if (Date.now() - lastRemind < twoHours) return;

    // Check if steps increased in last hour
    const hourlyData = safeGet('st_hourly_' + todayIso(), {});
    const currentHour = hour.toString();
    const prevHour = (hour - 1).toString();
    const recentSteps = (hourlyData[currentHour] || 0) + (hourlyData[prevHour] || 0);

    if (recentSteps < 50) {
      safeSet('st_last_move_remind', Date.now());
      if (typeof notify === 'function') {
        notify('Bouge guerrier !', 'Tu es immobile depuis trop longtemps. Maintiens ton ki !');
      }
      showToast('\ud83d\udeb6 Bouge pour maintenir ton ki !');
    }
  } catch(e) { console.warn('Inactivity check error:', e); }
}
