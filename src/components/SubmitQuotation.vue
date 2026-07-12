<template>
  <div class="marketing-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <div class="row justify-content-center">
          <div class="col-xl-9">
            <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
              <div>
                <span class="marketing-eyebrow"><i class="fas fa-file-signature" aria-hidden="true"></i>Quotation workflow</span>
                <h1 class="h2 mb-2">{{ canCreateProjects ? 'Create a customer project' : 'Submit your solar requirement' }}</h1>
                <p class="text-muted mb-0">Review the calculator result and provide the details needed to continue.</p>
              </div>
              <router-link to="/solercalc" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left me-2" aria-hidden="true"></i>Back to calculator
              </router-link>
            </div>

            <div v-if="loading" class="loader-overlay" role="status" aria-live="polite">
              <div class="card p-4 text-center">
                <div class="spinner-border text-primary mx-auto mb-3"></div>
                <strong>Submitting quotation</strong>
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
                        <input v-model.trim="formData.phone" type="tel" id="custPhone" class="form-control" maxlength="20" autocomplete="tel" required />
                      </div>
                      <div class="col-12">
                        <label for="custEmail" class="form-label">Email address *</label>
                        <input v-model.trim="formData.email" type="email" id="custEmail" class="form-control" autocomplete="email" required />
                      </div>
                      <div class="col-12">
                        <label for="custAddress" class="form-label">Installation address *</label>
                        <textarea v-model.trim="formData.address" id="custAddress" class="form-control" rows="3" maxlength="500" autocomplete="street-address" required></textarea>
                      </div>
                      <div class="col-12">
                        <label for="additionalNotes" class="form-label">Additional notes</label>
                        <textarea v-model.trim="formData.additionalNotes" id="additionalNotes" class="form-control" rows="3" maxlength="1000"></textarea>
                      </div>
                      <div v-if="canCreateProjects" class="col-12">
                        <label for="suggestedPrice" class="form-label">Final quoted price (Rs) *</label>
                        <input
                          v-model.number="formData.suggestedPrice"
                          type="number"
                          id="suggestedPrice"
                          class="form-control"
                          min="1"
                          step="1"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" class="btn btn-primary w-100 mt-4" :disabled="loading || !hasCalculatorResults">
                      <i :class="canCreateProjects ? 'fas fa-folder-plus' : 'fas fa-paper-plane'" class="me-2" aria-hidden="true"></i>
                      {{ canCreateProjects ? 'Create project' : 'Submit requirement' }}
                    </button>
                    <small v-if="!hasCalculatorResults" class="d-block text-danger mt-2">Calculator results are missing. Return to the calculator and generate a recommendation first.</small>
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
                      </div>
                      <div class="border-top pt-3 mt-3">
                        <div class="d-flex justify-content-between mb-2"><span class="text-muted">Installed estimate</span><strong>Rs {{ formatMoney(solerResults.costWith) }}</strong></div>
                        <div class="d-flex justify-content-between"><span class="text-muted">Offer price</span><strong class="text-success">Rs {{ formatMoney(solerResults.special) }}</strong></div>
                      </div>

                      <div v-if="canCreateProjects" class="alert alert-info mt-4 mb-0">
                        Internal cost before profit: <strong>Rs {{ formatMoney(solerResults.costWithout) }}</strong>
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
import { createProject } from '@/models/projectModel';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'SubmitQuotation',
  mixins: [rbacMixin],
  data() {
    return {
      currentUser: null,
      unsubscribeAuth: null,
      formData: {
        name: '',
        address: '',
        phone: '',
        email: '',
        additionalNotes: '',
        suggestedPrice: 0
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
    canCreateProjects() {
      return this.can(PERMISSIONS.PROJECTS_CREATE);
    },
    hasCalculatorResults() {
      return Number(this.solerResults?.panelCount) > 0 && Boolean(this.solerResults?.inverter);
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      if (!user) return;

      await this.loadUserAccess(true);
      this.formData.email = user.email || '';
      this.formData.name = user.displayName || this.formData.name;
      this.formData.suggestedPrice = Number(this.solerResults?.special) || 0;
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  },
  methods: {
    formatMoney(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number.toFixed(0) : '0';
    },
    validateForm() {
      if (!this.currentUser) return 'Please log in before submitting a requirement.';
      if (!this.hasCalculatorResults) return 'Calculator results are missing. Please calculate the system again.';
      if (!this.formData.name || !this.formData.address || !this.formData.phone || !this.formData.email) {
        return 'Please complete all required customer fields.';
      }
      if (this.canCreateProjects && Number(this.formData.suggestedPrice) <= 0) {
        return 'Quoted price must be greater than zero.';
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
        const projectData = {
          ...this.formData,
          suggestedPrice: this.canCreateProjects
            ? Number(this.formData.suggestedPrice)
            : Number(this.solerResults.special)
        };
        const customerId = this.canCreateProjects ? null : this.currentUser.uid;
        const result = await createProject(customerId, projectData, this.solerResults);
        if (!result.success) throw new Error(result.error || 'Unable to create project');

        this.message = `Project ${result.projectId} created successfully. Redirecting in ${this.redirectCountdown} seconds...`;
        this.countdownInterval = setInterval(() => {
          this.redirectCountdown -= 1;
          if (this.redirectCountdown <= 0) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            this.$router.push(this.canCreateProjects ? '/admin/projects' : '/customer/my-projects');
            return;
          }
          this.message = `Project ${result.projectId} created successfully. Redirecting in ${this.redirectCountdown} seconds...`;
        }, 1000);
      } catch (error) {
        console.error('Error creating project:', error);
        this.error = error.message || 'Error creating project.';
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
