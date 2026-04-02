/* Supabase Auth + Cloud Sync for Saiyan Steps
   Same Supabase project as Saiyan Fitness (kwgqkycuviybgzyharwb) */
'use strict';

const SUPABASE_URL = 'https://kwgqkycuviybgzyharwb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Z3FreWN1dml5Ymd6eWhhcndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjgzMzIsImV4cCI6MjA1ODkwNDMzMn0.a2AKBI3R2dSdEdaHBRzpHdeE_F5JBhFtBadLvqTelEY';

let _sbClient = null;
let _sbUser = null;

function getSbClient() {
  if (_sbClient) return _sbClient;
  if (!window.supabase) return null;
  _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sbClient;
}

async function initAuth() {
  const sb = getSbClient();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    _sbUser = session.user;
    updateAuthUI(true);
    return session.user;
  }
  updateAuthUI(false);
  return null;
}

async function signIn(email, password) {
  const sb = getSbClient();
  if (!sb) throw new Error('Supabase non disponible');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _sbUser = data.user;
  updateAuthUI(true);
  return data.user;
}

async function signUp(email, password) {
  const sb = getSbClient();
  if (!sb) throw new Error('Supabase non disponible');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  _sbUser = data.user;
  updateAuthUI(true);
  return data.user;
}

async function signOut() {
  const sb = getSbClient();
  if (!sb) return;
  await sb.auth.signOut();
  _sbUser = null;
  updateAuthUI(false);
}

function updateAuthUI(loggedIn) {
  const loginSection = document.getElementById('authSection');
  const userInfo = document.getElementById('userInfo');
  if (!loginSection || !userInfo) return;

  if (loggedIn && _sbUser) {
    loginSection.classList.add('hidden');
    userInfo.classList.remove('hidden');
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = _sbUser.email || '';
  } else {
    loginSection.classList.remove('hidden');
    userInfo.classList.add('hidden');
  }
}

// Sync steps data to Supabase (steps_sync table)
async function cloudSyncSteps() {
  const sb = getSbClient();
  if (!sb || !_sbUser) return;

  const today = new Date().toISOString().slice(0, 10);
  const data = {
    user_id: _sbUser.id,
    date: today,
    steps: parseInt(localStorage.getItem('st_steps') || '0'),
    water_glasses: parseInt(localStorage.getItem('st_water') || '0'),
    sleep_minutes: Math.round(parseInt(localStorage.getItem('st_sleep') || '0') / 60000),
    total_steps: parseInt(localStorage.getItem('st_total_steps') || '0'),
    streak: parseInt(localStorage.getItem('st_streak') || '0'),
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await sb.from('steps_sync').upsert(data, {
      onConflict: 'user_id,date',
    });
    if (error) console.warn('Sync error:', error.message);
  } catch (e) {
    console.warn('Cloud sync failed:', e);
  }
}

// Setup auth event listeners
function setupAuthListeners() {
  const loginBtn = document.getElementById('btnLogin');
  const signupBtn = document.getElementById('btnSignup');
  const logoutBtn = document.getElementById('btnLogout');
  const authError = document.getElementById('authError');

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('authEmail').value.trim();
      const pwd = document.getElementById('authPassword').value;
      if (!email || !pwd) return;
      try {
        authError.textContent = '';
        await signIn(email, pwd);
        cloudSyncSteps();
      } catch (e) {
        authError.textContent = e.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : e.message || 'Erreur de connexion';
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = document.getElementById('authEmail').value.trim();
      const pwd = document.getElementById('authPassword').value;
      if (!email || !pwd) return;
      if (pwd.length < 6) { authError.textContent = 'Mot de passe: 6 caracteres minimum'; return; }
      try {
        authError.textContent = '';
        await signUp(email, pwd);
        authError.style.color = '#4fffb0';
        authError.textContent = 'Compte cree ! Verifie ton email si necessaire.';
      } catch (e) {
        authError.style.color = '#ff5f76';
        authError.textContent = e.message || 'Erreur';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', signOut);
  }
}

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  initAuth().then(() => {
    // Sync every 5 minutes if logged in
    setInterval(() => { if (_sbUser) cloudSyncSteps(); }, 5 * 60 * 1000);
  });
});


// FEAT-S15: Sync to leaderboard table
async function syncStepsLeaderboard() {
  const sb = getSbClient();
  if (!sb) return;
  try {
    const user = (await sb.auth.getUser()).data.user;
    if (!user) return;
    const profile = JSON.parse(localStorage.getItem('st_user_profile') || '{}');
    const totalSteps = parseInt(localStorage.getItem('st_total_steps') || '0');
    const streak = parseInt(localStorage.getItem('st_streak') || '0');

    await sb.from('leaderboard').upsert({
      user_id: user.id,
      display_name: profile.name || user.email.split('@')[0],
      weekly_steps: totalSteps,
      streak: streak,
      transformation: localStorage.getItem('st_transformation') || 'Humain',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch(e) { console.warn('Leaderboard sync error:', e); }
}
