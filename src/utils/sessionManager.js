import {
  browserLocalPersistence,
  browserSessionPersistence,
  onIdTokenChanged,
  setPersistence,
  signOut
} from 'firebase/auth';
import { auth } from '@/firebase';
import { clearUserAccessCache, customerAccess, getUserAccess, hasPermission } from '@/utils/accessControl';
import { PERMISSIONS } from '@/constants/rbac';
import sessionConfig from '../../config/session.json';

export const SESSION_EVENT_NAME = 'ant-solar:session';

const REMEMBER_PREFERENCE_KEY = 'ant-solar:remember-session';
const ACTIVITY_KEY_PREFIX = 'ant-solar:last-activity:';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

let routerReference = null;
let initializePromise = null;
let unsubscribeTokenListener = null;
let evaluationTimer = null;
let activityListenersInstalled = false;
let currentState = null;
let warningVisible = false;
let endingSession = false;
let lastActivityWriteAt = 0;
let serverValidation = { uid: '', checkedAt: 0, payload: null };
let authGeneration = 0;

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage is unavailable:', error);
    return null;
  }
}

function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('Session storage is unavailable:', error);
    return null;
  }
}

function emitSessionEvent(type, details = {}) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT_NAME, {
    detail: {
      type,
      timestamp: Date.now(),
      ...details
    }
  }));
}

function activityStorage() {
  return getRememberSessionPreference() ? safeLocalStorage() : safeSessionStorage();
}

function activityKey(uid) {
  return `${ACTIVITY_KEY_PREFIX}${uid}`;
}

function readLastActivity(uid, fallback) {
  const storage = activityStorage();
  const parsed = Number(storage?.getItem(activityKey(uid)));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function writeLastActivity(uid, value) {
  const storage = activityStorage();
  try {
    storage?.setItem(activityKey(uid), String(value));
  } catch (error) {
    console.warn('Unable to persist session activity:', error);
  }
}

function clearLastActivity(uid) {
  [safeLocalStorage(), safeSessionStorage()].forEach(storage => {
    try {
      storage?.removeItem(activityKey(uid));
    } catch (error) {
      console.warn('Unable to clear session activity:', error);
    }
  });
}

function parseTokenTime(value, fallback = Date.now()) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function policyForAccess(access) {
  const privileged = hasPermission(access, PERMISSIONS.DASHBOARD_ACCESS);
  const remembered = getRememberSessionPreference();

  if (privileged) {
    return {
      privileged,
      remembered,
      idleMs: sessionConfig.privileged.idleMinutes * MINUTE_MS,
      absoluteMs: sessionConfig.privileged.absoluteHours * HOUR_MS
    };
  }

  return {
    privileged,
    remembered,
    idleMs: sessionConfig.customer.idleMinutes * MINUTE_MS,
    absoluteMs: remembered
      ? sessionConfig.customer.rememberedAbsoluteDays * DAY_MS
      : sessionConfig.customer.sessionAbsoluteHours * HOUR_MS
  };
}

function deadlineDetails(state = currentState) {
  if (!state) return null;
  const storedLastActivity = readLastActivity(state.uid, state.lastActivityAt);
  const lastActivityAt = Math.max(state.authenticatedAt, storedLastActivity);
  const idleDeadline = lastActivityAt + state.idleMs;
  const absoluteDeadline = state.authenticatedAt + state.absoluteMs;
  const deadline = Math.min(idleDeadline, absoluteDeadline);
  const reason = absoluteDeadline <= idleDeadline ? 'absolute-timeout' : 'idle-timeout';

  return {
    lastActivityAt,
    idleDeadline,
    absoluteDeadline,
    deadline,
    reason,
    remainingMs: Math.max(0, deadline - Date.now())
  };
}

function clearEvaluationTimer() {
  if (evaluationTimer) window.clearTimeout(evaluationTimer);
  evaluationTimer = null;
}

function scheduleEvaluation() {
  clearEvaluationTimer();
  const details = deadlineDetails();
  if (!details) return;

  const warningAt = details.deadline - (sessionConfig.warningMinutes * MINUTE_MS);
  const nextCheckAt = Date.now() < warningAt ? warningAt : details.deadline;
  evaluationTimer = window.setTimeout(
    () => evaluateSession().catch(error => console.error('Session evaluation failed:', error)),
    Math.max(1000, nextCheckAt - Date.now())
  );
}

async function evaluateSession() {
  if (!currentState || !auth.currentUser || auth.currentUser.uid !== currentState.uid) return;

  const details = deadlineDetails();
  if (!details) return;
  currentState.lastActivityAt = details.lastActivityAt;

  if (details.remainingMs <= 0) {
    await endSession(details.reason, { redirectToLogin: true });
    return;
  }

  const warningThreshold = sessionConfig.warningMinutes * MINUTE_MS;
  if (details.remainingMs <= warningThreshold) {
    warningVisible = true;
    emitSessionEvent('warning', {
      ...getSessionSnapshot(),
      reason: details.reason,
      deadline: details.deadline,
      remainingMs: details.remainingMs
    });
  } else if (warningVisible) {
    warningVisible = false;
    emitSessionEvent('active', getSessionSnapshot());
  }

  scheduleEvaluation();
}

function recordActivity() {
  if (!currentState || !auth.currentUser) return;
  const now = Date.now();
  const throttleMs = sessionConfig.activityWriteThrottleSeconds * 1000;
  if (now - lastActivityWriteAt < throttleMs) return;

  lastActivityWriteAt = now;
  currentState.lastActivityAt = now;
  writeLastActivity(currentState.uid, now);
  if (warningVisible) {
    warningVisible = false;
    emitSessionEvent('active', getSessionSnapshot());
  }
  scheduleEvaluation();
}

function installActivityListeners() {
  if (activityListenersInstalled) return;
  ACTIVITY_EVENTS.forEach(eventName => {
    document.addEventListener(eventName, recordActivity, { capture: true, passive: true });
  });
  activityListenersInstalled = true;
}

function resetRuntimeState() {
  clearEvaluationTimer();
  currentState = null;
  warningVisible = false;
  lastActivityWriteAt = 0;
  serverValidation = { uid: '', checkedAt: 0, payload: null };
}

async function configureUserSession(user, generation) {
  const tokenResult = await user.getIdTokenResult();
  let access = customerAccess(user.uid);

  try {
    access = await getUserAccess(user.uid, { force: true });
  } catch (error) {
    console.error('Unable to load access while initializing the session:', error);
  }

  if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;

  const policy = policyForAccess(access);
  const authenticatedAt = parseTokenTime(
    tokenResult.authTime,
    Number(tokenResult.claims?.auth_time) * 1000 || Date.now()
  );
  const fallbackActivity = Math.max(authenticatedAt, Date.now());
  const lastActivityAt = readLastActivity(user.uid, fallbackActivity);

  currentState = {
    uid: user.uid,
    role: access.role,
    privileged: policy.privileged,
    remembered: policy.remembered,
    idleMs: policy.idleMs,
    absoluteMs: policy.absoluteMs,
    authenticatedAt,
    tokenExpiresAt: parseTokenTime(tokenResult.expirationTime),
    lastActivityAt: Math.max(authenticatedAt, lastActivityAt)
  };

  writeLastActivity(user.uid, currentState.lastActivityAt);
  emitSessionEvent('initialized', getSessionSnapshot());
  await evaluateSession();
}

async function handleTokenChange(user) {
  const generation = ++authGeneration;
  if (!user) {
    resetRuntimeState();
    emitSessionEvent('signed-out');
    return;
  }

  await configureUserSession(user, generation);
}

function redirectAfterSessionEnd(reason, options) {
  if (!routerReference) return Promise.resolve();
  const currentRoute = routerReference.currentRoute.value;
  const redirect = currentRoute?.fullPath && currentRoute.name !== 'LoginPage'
    ? currentRoute.fullPath
    : undefined;

  if (options.redirectToLogin) {
    return routerReference.replace({
      name: 'LoginPage',
      query: {
        reason,
        ...(redirect ? { redirect } : {})
      }
    }).catch(() => undefined);
  }

  return routerReference.replace(options.redirect || '/').catch(() => undefined);
}

export function getRememberSessionPreference() {
  return safeLocalStorage()?.getItem(REMEMBER_PREFERENCE_KEY) === 'true';
}

export async function configureSessionPersistence(remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const storage = safeLocalStorage();
  try {
    if (remember) storage?.setItem(REMEMBER_PREFERENCE_KEY, 'true');
    else storage?.removeItem(REMEMBER_PREFERENCE_KEY);
  } catch (error) {
    console.warn('Unable to save the session persistence preference:', error);
  }
}

export async function initializeAuthPersistence() {
  await configureSessionPersistence(getRememberSessionPreference());
}

export function initializeSessionManager(router) {
  routerReference = router;
  installActivityListeners();

  if (initializePromise) return initializePromise;
  initializePromise = new Promise(resolve => {
    let initialEvent = true;
    unsubscribeTokenListener = onIdTokenChanged(
      auth,
      async user => {
        try {
          await handleTokenChange(user);
        } catch (error) {
          console.error('Unable to initialize the authentication session:', error);
          resetRuntimeState();
        } finally {
          if (initialEvent) {
            initialEvent = false;
            resolve();
          }
        }
      },
      error => {
        console.error('Firebase token listener failed:', error);
        resetRuntimeState();
        if (initialEvent) {
          initialEvent = false;
          resolve();
        }
      }
    );
  });

  return initializePromise;
}

export function disposeSessionManager() {
  if (unsubscribeTokenListener) unsubscribeTokenListener();
  unsubscribeTokenListener = null;
  clearEvaluationTimer();
  if (activityListenersInstalled) {
    ACTIVITY_EVENTS.forEach(eventName => {
      document.removeEventListener(eventName, recordActivity, { capture: true });
    });
  }
  activityListenersInstalled = false;
  initializePromise = null;
  resetRuntimeState();
}

export function subscribeSessionEvents(handler) {
  const listener = event => handler(event.detail);
  window.addEventListener(SESSION_EVENT_NAME, listener);
  return () => window.removeEventListener(SESSION_EVENT_NAME, listener);
}

export function getSessionSnapshot() {
  if (!currentState) return null;
  const details = deadlineDetails(currentState);
  return {
    uid: currentState.uid,
    role: currentState.role,
    privileged: currentState.privileged,
    remembered: currentState.remembered,
    authenticatedAt: currentState.authenticatedAt,
    tokenExpiresAt: currentState.tokenExpiresAt,
    lastActivityAt: details?.lastActivityAt || currentState.lastActivityAt,
    idleDeadline: details?.idleDeadline || null,
    absoluteDeadline: details?.absoluteDeadline || null,
    deadline: details?.deadline || null,
    reason: details?.reason || null,
    remainingMs: details?.remainingMs || 0
  };
}

export async function getFreshIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in before performing this action');

  const tokenResult = await user.getIdTokenResult();
  const expiresAt = parseTokenTime(tokenResult.expirationTime);
  const refreshWindowMs = sessionConfig.tokenRefreshWindowMinutes * MINUTE_MS;
  const shouldRefresh = forceRefresh || expiresAt - Date.now() <= refreshWindowMs;
  return user.getIdToken(shouldRefresh);
}

export async function validateServerSession(force = false) {
  const user = auth.currentUser;
  if (!user) return { active: false, reason: 'signed-out' };

  const cacheMs = sessionConfig.serverValidationCacheSeconds * 1000;
  if (
    !force
    && serverValidation.uid === user.uid
    && serverValidation.payload
    && Date.now() - serverValidation.checkedAt < cacheMs
  ) {
    return serverValidation.payload;
  }

  const token = await getFreshIdToken();
  const response = await fetch('/.netlify/functions/sessionStatus', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401) {
    const reason = payload.code || 'server-session-rejected';
    await endSession(reason, { redirectToLogin: true });
    return { active: false, reason };
  }
  if (!response.ok) {
    throw new Error(payload.error || `Session validation failed with status ${response.status}`);
  }

  serverValidation = {
    uid: user.uid,
    checkedAt: Date.now(),
    payload: { active: true, ...payload }
  };
  return serverValidation.payload;
}

export async function ensureActiveSession(options = {}) {
  if (!auth.currentUser || !currentState) return { active: false, reason: 'signed-out' };

  const details = deadlineDetails();
  if (!details || details.remainingMs <= 0) {
    const reason = details?.reason || 'session-expired';
    await endSession(reason, { redirectToLogin: false });
    return { active: false, reason };
  }

  if (options.serverCheck) {
    try {
      return await validateServerSession(Boolean(options.forceServerCheck));
    } catch (error) {
      console.error('Server session validation unavailable:', error);
      return { active: false, reason: 'session-validation-unavailable', error };
    }
  }

  return { active: true, ...getSessionSnapshot() };
}

export async function extendSession() {
  if (!currentState || !auth.currentUser) throw new Error('The session has already ended');

  const details = deadlineDetails();
  if (!details || details.absoluteDeadline <= Date.now()) {
    await endSession('absolute-timeout', { redirectToLogin: true });
    throw new Error('The maximum session duration has been reached. Please sign in again.');
  }

  const now = Date.now();
  currentState.lastActivityAt = now;
  writeLastActivity(currentState.uid, now);
  await getFreshIdToken(true);
  warningVisible = false;
  emitSessionEvent('active', getSessionSnapshot());
  scheduleEvaluation();
}

export async function endSession(reason = 'manual', options = {}) {
  if (endingSession) return;
  endingSession = true;

  const uid = auth.currentUser?.uid || currentState?.uid;
  try {
    if (uid) {
      clearUserAccessCache(uid);
      clearLastActivity(uid);
    }
    serverValidation = { uid: '', checkedAt: 0, payload: null };
    await signOut(auth);
    emitSessionEvent(reason === 'manual' ? 'signed-out' : 'expired', { reason });
    await redirectAfterSessionEnd(reason, options);
  } finally {
    endingSession = false;
  }
}
