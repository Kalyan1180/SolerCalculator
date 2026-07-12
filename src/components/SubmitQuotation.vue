<template>
  <div class="marketing-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <div class="row justify-content-center">
          <div class="col-xl-9">
            <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
              <div>
                <span class="marketing-eyebrow"><i class="fas fa-file-signature" aria-hidden="true"></i>Quotation request</span>
                <h1 class="h2 mb-2">Submit your solar requirement</h1>
                <p class="text-muted mb-0">Review the recommended system and provide the details needed for a quotation.</p>
              </div>
              <router-link to="/solercalc" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left me-2" aria-hidden="true"></i>Back to calculator
              </router-link>
            </div>

            <div v-if="loading" class="loader-overlay" role="status" aria-live="polite">
              <div class="card p-4 text-center">
                <div class="spinner-border text-primary mx-auto mb-3"></div>
                <strong>Submitting your requirement</strong>
                <span class="text-muted">Please keep this page open.</span>
              </div>
            </div>

            <div v-if="error" class="alert alert-danger" role="alert">
              <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ error }}
            </div>

            <section v-if="message" class="card text-center p-4 p-md-5">
              <div class="enterprise-empty-state__icon"><i class="fas fa-circle-check" aria-hidden="true"></i></div>
              <h2 class="h4">Requirement submitted</h2>
              <p class="text-muted mb-0">{{ message }}</p>
            </section>

            <div v-else class="row g-4">
              <div class="col-lg-7">
                <form class="card" @submit.prevent="submitQuotation">
                  <div class="card-header">
                    <h2 class="h5 mb-1">Customer details</h2>
                    <p class="text-muted small mb-0">Fields marked with an asterisk are required.</p>
                  </div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label for="custName" class="form-label">Customer name *</label>
                        <input v-model.trim="formData.name" type="text" id="custName" class="form-control" maxlength="100" autocomplete="name" required />
                      </div>
                      <div class="col-md-6">
                        <label for="custPhone" class="form-label">Phone number *</label>
                        <input v-model.trim="formData.phone" type="tel" id="custPhone" class="form-control" maxlength="30" autocomplete="tel" required />
                      </div>
                      <div class="col-12">
                        <label for="custEmail" class="form-label">Email address *</label>
                        <input v-model.trim="formData.email" type="email" id="custEmail" class="form-control" maxlength="160" autocomplete="email" required />
                      </div>
                      <div class="col-12">
                        <label for="custAddress" class="form-label">Installation address *</label>
                        <textarea v-model.trim="formData.address" id="custAddress" class="form-control" rows="3" maxlength="500" autocomplete="street-address" required></textarea>
                      </div>
                      <div class="col-12">
                        <label for="additionalNotes" class="form-label">Additional notes</label>
                        <textarea v-model.trim="formData.additionalNotes" id="additionalNotes" class="form-control" rows="3" maxlength="1000"></textarea>
                      </div>
                    </div>

                    <button type="submit" class="btn btn-primary w-100 mt-4" :disabled="loading || !hasCalculatorResults">
                      <i class="fas fa-paper-plane me-2" aria-hidden="true"></i>Submit requirement
                    </button>
                    <small v-if="!hasCalculatorResults" class="d-block text-danger mt-2">The calculator result is missing. Return to the calculator and calculate your requirement again.</small>
                  </div>
                </form>
              </div>

              <div class="col-lg-5">
                <aside class="card h-100">
                  <div class="card-header">
                    <h2 class="h5 mb-1">System summary</h2>
                    <p class="text-muted small mb-0">Generated from your latest calculator result.</p>
                  </div>
                  <div class="card-body">
                    <template v-if="hasCalculatorResults">
                      <div class="spec-card mb-3">
                        <small class="text-muted d-block">Solar panels</small>
                        <strong class="fs-4">{{ solerResults.panelCount }}</strong>
                      </div>
                      <div class="spec-card mb-3">
                        <small class="text-muted d-block">Inverter</small>
                        <strong>{{ solerResults.inverter?.name || 'N/A' }}</strong>
                      </div>
                      <div class="spec-card mb-3">
                        <small class="text-muted d-block">Battery</small>
                        <strong>{{ solerResults.battery?.selectedBattery?.name || 'Not required' }}</strong>
                        <span v-if="solerResults.battery?.selectedBattery" class="d-block small text-muted">{{ solerResults.battery.quantity }} unit(s)</span>
                      </div>

                      <div v-if="solerResults.requirements?.length" class="border-top pt-3 mt-3">
                        <div v-for="line in solerResults.requirements" :key="`${line.type}-${line.name}`" class="d-flex justify-content-between gap-3 py-1">
                          <span class="text-muted">{{ line.name }}</span>
                          <strong>{{ line.requiredQuantity }} {{ line.unit }}</strong>
                        </div>
                      </div>

                      <div class="border-top pt-3 mt-3">
                        <div class="d-flex justify-content-between mb-2"><span class="text-muted">Installed estimate</span><strong>Rs {{ formatMoney(solerResults.costWith) }}</strong></div>
                        <div class="d-flex justify-content-between"><span class="text-muted">Estimated offer</span><strong class="text-success">Rs {{ formatMoney(solerResults.special) }}</strong></div>
                      </div>
                    </template>
                    <div v-else class="enterprise-empty-state py-4">
                      <div class="enterprise-empty-state__icon"><i class="fas fa-calculator" aria-hidden="true"></i></div>
                      <p class="text-muted mb-0">No calculator result is available.</p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

export default {
  name: 'SubmitQuotation',
  data() {
    return {
      currentUser: null,
      unsubscribeAuth: null,
      formData: {
        name: '',
        address: '',
        phone: '',
        email: '',
        additionalNotes: ''
      },
      message: '',
      error: '',
      loading: false,
      redirectCountdown: 4,
      countdownInterval: null
    };
  },
  computed: {
    ...mapGetters(['solerResults']),
    hasCalculatorResults() {
      return Boolean(this.solerResults?.recommendationId)
        && Number(this.solerResults?.panelCount) > 0
        && Boolean(this.solerResults?.inverter);
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, user => {
      this.currentUser = user;
      if (!user) return;
      this.formData.email = user.email || '';
      this.formData.name = user.displayName || this.formData.name;
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  },
  methods: {
    formatMoney(value) {
      const number = Number(value);
      return Number.isFinite(number) ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(number) : '0';
    },
    validateForm() {
      if (!this.currentUser) return 'Please sign in before submitting a requirement.';
      if (!this.hasCalculatorResults) return 'The calculator result is missing. Please calculate the system again.';
      if (!this.formData.name || !this.formData.address || !this.formData.phone || !this.formData.email) {
        return 'Please complete all required customer fields.';
      }
      return null;
    },
    async submitQuotation() {
      this.error = '';
      const validationError = this.validateForm();
      if (validationError) {
        this.error = validationError;
        return;
      }

      this.loading = true;
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/createQuotation', {
          method: 'POST',
          body: JSON.stringify({
            recommendationId: this.solerResults.recommendationId,
            ...this.formData,
            managedProject: false
          })
        });

        this.message = `${result.message} Reference ${result.projectId}. Redirecting in ${this.redirectCountdown} seconds...`;
        this.countdownInterval = setInterval(() => {
          this.redirectCountdown -= 1;
          if (this.redirectCountdown <= 0) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            this.$router.push('/customer/my-projects');
            return;
          }
          this.message = `${result.message} Reference ${result.projectId}. Redirecting in ${this.redirectCountdown} seconds...`;
        }, 1000);
      } catch (error) {
        console.error('Error submitting requirement:', error);
        this.error = error.message || 'Unable to submit your requirement.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 1090;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(7, 20, 38, 0.45);
  backdrop-filter: blur(4px);
}
.loader-overlay .card { min-width: min(360px, 100%); }
.spec-card { padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 10px; background: var(--ant-slate-50); }
</style>
