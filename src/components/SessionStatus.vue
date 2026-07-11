<template>
  <div v-if="warning" class="session-warning" role="alert" aria-live="assertive">
    <div>
      <strong>{{ title }}</strong>
      <div class="small">{{ message }}</div>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <button
        v-if="warning.reason === 'idle-timeout'"
        type="button"
        class="btn btn-sm btn-dark"
        :disabled="busy"
        @click="staySignedIn"
      >
        {{ busy ? 'Refreshing...' : 'Stay signed in' }}
      </button>
      <button type="button" class="btn btn-sm btn-outline-dark" :disabled="busy" @click="signOutNow">
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
        ? `Sign in again in ${this.countdown}`
        : `Session expires in ${this.countdown}`;
    },
    message() {
      return this.warning?.reason === 'absolute-timeout'
        ? 'The maximum secure session duration is ending. Save your work and sign in again.'
        : 'You have been inactive. Continue the session or sign out now.';
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
  width: min(460px, calc(100vw - 2rem));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #f0ad4e;
  border-radius: 12px;
  background: #fff3cd;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
}

@media (max-width: 575.98px) {
  .session-warning {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
