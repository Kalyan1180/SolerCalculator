<template>
  <div class="quotation-container container my-5">
    <h2 class="text-center mb-4">Submit Solar Requirement</h2>

    <div v-if="loading" class="loader-overlay">
      <div class="loader">Submitting quotation, please wait...</div>
    </div>

    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-if="message" class="alert alert-success text-center" role="status">{{ message }}</div>

    <form v-if="!message" @submit.prevent="submitQuotation" class="quotation-form border p-4 rounded">
      <div class="mb-3">
        <label for="custName" class="form-label">Customer Name</label>
        <input v-model.trim="formData.name" type="text" id="custName" class="form-control" maxlength="100" required />
      </div>

      <div class="mb-3">
        <label for="custAddress" class="form-label">Address</label>
        <textarea v-model.trim="formData.address" id="custAddress" class="form-control" rows="3" maxlength="500" required></textarea>
      </div>

      <div class="mb-3">
        <label for="custPhone" class="form-label">Phone Number</label>
        <input v-model.trim="formData.phone" type="tel" id="custPhone" class="form-control" maxlength="20" required />
      </div>

      <div class="mb-3">
        <label for="custEmail" class="form-label">Email</label>
        <input v-model.trim="formData.email" type="email" id="custEmail" class="form-control" required />
      </div>

      <div class="mb-3">
        <label for="additionalNotes" class="form-label">Additional Notes</label>
        <textarea v-model.trim="formData.additionalNotes" id="additionalNotes" class="form-control" rows="2" maxlength="1000"></textarea>
      </div>

      <div class="mb-3" v-if="canCreateProjects">
        <label for="suggestedPrice" class="form-label">Final Quoted Price (Rs)</label>
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

      <div class="prefilled-fields border p-3 mb-3 rounded" v-if="canCreateProjects && hasCalculatorResults">
        <h4>Calculation Data</h4>
        <p><strong>Panels:</strong> {{ solerResults.panelCount }}</p>
        <p><strong>Estimated installed cost:</strong> Rs {{ formatMoney(solerResults.costWith) }}</p>
        <p><strong>Cost before profit:</strong> Rs {{ formatMoney(solerResults.costWithout) }}</p>
        <p><strong>Offer price:</strong> Rs {{ formatMoney(solerResults.special) }}</p>
        <p><strong>Inverter:</strong> {{ solerResults.inverter?.name || 'N/A' }}</p>
        <p><strong>Battery:</strong> {{ solerResults.battery?.selectedBattery?.name || 'N/A' }}</p>
      </div>

      <button type="submit" class="btn btn-primary w-100" :disabled="loading || !hasCalculatorResults">
        {{ canCreateProjects ? 'Create Project' : 'Submit Requirement' }}
      </button>
    </form>
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
        const result = await createProject(this.currentUser.uid, projectData, this.solerResults);
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
.quotation-container { max-width: 650px; }
.quotation-form, .prefilled-fields { background-color: #f8f9fa; }
.loader-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loader { font-size: 1.15rem; color: #007bff; }
</style>
