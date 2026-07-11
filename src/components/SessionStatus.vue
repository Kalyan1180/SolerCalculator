<template>
  <div v-if="warning" class="session-warning" role="alert" aria-live="assertive">
    <span class="session-warning__icon"><i class="fas fa-hourglass-half" aria-hidden="true"></i></span>
    <div class="session-warning__content">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <strong>{{ title }}</strong>
        <span class="session-warning__timer">{{ countdown }}</span>
      </div>
      <p class="small mb-0">{{ message }}</p>
    </div>
    <div class="session-warning__actions">
      <button
        v-if="warning.reason === 'idle-timeout'"
        type="button"
        class="btn btn-sm btn-primary"
        :disabled="busy"
        @click="staySignedIn"
      >
        <span v-if="busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
        {{ busy ? 'Refreshing…' : 'Stay signed in' }}
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="signOutNow">
        Sign out
      </button>
    </div>
  </div>
</template>

<script>
import {
  endSession,
  extendSession,
  getSessionSnapshot,
  subscribeSessionEvents
} from '@/utils/sessionManager';

export default {
  name: 'SessionStatus',
  data() {
    return {
      warning: null,
      now: Date.now(),
      busy: false,
      unsubscribeSession: null,
      countdownTimer: null
    };
  },
  computed: {
    secondsRemaining() {
      if (!this.warning?.deadline) return 0;
      return Math.max(0, Math.ceil((this.warning.deadline - this.now) / 1000));
    },
    countdown() {
      const minutes = Math.floor(this.secondsRemaining / 60);
      const seconds = this.secondsRemaining % 60;
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    },
    title() {
      return this.warning?.reason === 'absolute-timeout'
        ? 'Secure session ending'
        : 'Session inactivity warning';
    },
    message() {
      return this.warning?.reason === 'absolute-timeout'
        ? 'Save your work. The maximum secure session duration requires a new sign-in.'
        : 'Your session will end because of inactivity unless you continue.';
    }
  },
  mounted() {
    this.unsubscribeSession = subscribeSessionEvents(event => {
      if (event.type === 'warning') {
        this.warning = event;
        this.now = Date.now();
        this.startCountdown();
      } else if (['active', 'expired', 'signed-out'].includes(event.type)) {
        this.warning = null;
        this.stopCountdown();
      }
    });

    const snapshot = getSessionSnapshot();
    if (snapshot?.remainingMs > 0 && snapshot.remainingMs <= 2 * 60 * 1000) {
      this.warning = { type: 'warning', ...snapshot };
      this.startCountdown();
    }
  },
  beforeUnmount() {
    if (this.unsubscribeSession) this.unsubscribeSession();
    this.stopCountdown();
  },
  methods: {
    startCountdown() {
      this.stopCountdown();
      this.countdownTimer = window.setInterval(() => {
        this.now = Date.now();
      }, 1000);
    },
    stopCountdown() {
      if (this.countdownTimer) window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    },
    async staySignedIn() {
      this.busy = true;
      try {
        await extendSession();
        this.warning = null;
      } catch (error) {
        console.error('Unable to extend the session:', error);
      } finally {
        this.busy = false;
      }
    },
    async signOutNow() {
      this.busy = true;
      try {
        await endSession('manual', { redirect: '/' });
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.session-warning {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1080;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.9rem;
  width: min(620px, calc(100vw - 2rem));
  padding: 1rem;
  border: 1px solid #fedf89;
  border-radius: 14px;
  color: var(--ant-slate-800);
  background: rgba(255, 250, 235, 0.98);
  box-shadow: var(--ant-shadow-lg);
  backdrop-filter: blur(14px);
}
.session-warning__icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 11px; color: #fff; background: var(--ant-amber-600); }
.session-warning__content { min-width: 0; }
.session-warning__content p { color: var(--ant-slate-600); }
.session-warning__timer { padding: 0.25rem 0.48rem; border-radius: 7px; color: #93370d; background: #fef0c7; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78rem; font-weight: 800; }
.session-warning__actions { display: flex; gap: 0.45rem; }
@media (max-width: 767.98px) {
  .session-warning { grid-template-columns: auto minmax(0, 1fr); }
  .session-warning__actions { grid-column: 1 / -1; justify-content: flex-end; }
}
@media (max-width: 575.98px) {
  .session-warning { right: 0.65rem; bottom: 0.65rem; width: calc(100vw - 1.3rem); }
  .session-warning__actions { display: grid; grid-template-columns: repeat(2, 1fr); }
}
</style>
