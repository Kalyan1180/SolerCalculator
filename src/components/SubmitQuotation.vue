<template>
  <div class="quotation-container container my-5">
    <h2 class="text-center mb-4">{{ isAdmin ? 'Generate Quotation' : 'Send Solar Requirement' }}</h2>

    <div v-if="loading" class="loader-overlay" aria-live="polite">
      <div class="loader">Submitting quotation, please wait...</div>
    </div>

    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-if="message" class="alert alert-success text-center" role="status">{{ message }}</div>

    <form v-if="!message" @submit.prevent="submitQuotation" class="quotation-form border p-4 rounded">
      <div class="mb-3">
        <label for="custName" class="form-label">Customer Name</label>
        <input v-model.trim="formData.name" type="text" id="custName" class="form-control" maxlength="150" required />
      </div>

      <div class="mb-3">
        <label for="custEmail" class="form-label">Email</label>
        <input
          v-model.trim="formData.email"
          type="email"
          id="custEmail"
          class="form-control"
          maxlength="254"
          :readonly="!isAdmin"
          required
        />
      </div>

      <div class="mb-3">
        <label for="custAddress" class="form-label">Address</label>
        <textarea v-model.trim="formData.address" id="custAddress" class="form-control" maxlength="500" rows="3" required></textarea>
      </div>

      <div class="mb-3">
        <label for="custPhone" class="form-label">Phone Number</label>
        <input
          v-model.trim="formData.phone"
          type="tel"
          id="custPhone"
          class="form-control"
          maxlength="30"
          pattern="[0-9+() -]{8,30}"
          required
        />
      </div>

      <div class="mb-3" v-if="isAdmin">
        <label for="suggestedPrice" class="form-label">Quoted Price (Rs)</label>
        <input
          v-model.number="formData.suggestedPrice"
          type="number"
          id="suggestedPrice"
          class="form-control"
          min="0"
          step="1"
          required
        />
      </div>

      <div class="prefilled-fields border p-3 mb-3 rounded" v-if="isAdmin && hasResults">
        <h4>Calculation Data</h4>
        <p><strong>Estimated cost with installation:</strong> Rs {{ formatNumber(solerResults.costWith) }}</p>
        <p><strong>Estimated cost without profit:</strong> Rs {{ formatNumber(solerResults.costWithout) }}</p>
        <p><strong>Profit percentage:</strong> {{ formatNumber(solerResults.profit, 2) }}%</p>
        <p><strong>Special offer price:</strong> Rs {{ formatNumber(solerResults.special) }}</p>
        <p><strong>Panels:</strong> {{ solerResults.panelCount }}</p>
        <p><strong>Inverter:</strong> {{ solerResults.inverter?.name || 'N/A' }}</p>
        <p><strong>Battery:</strong> {{ solerResults.battery?.selectedBattery?.name || 'N/A' }}</p>
      </div>

      <button type="submit" class="btn btn-primary w-100" :disabled="loading || !hasResults">
        {{ isAdmin ? 'Create Quotation' : 'Send Requirement' }}
      </button>
    </form>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { getUserRole } from '@/utils/firebaseHelpers';
import { authorizedFetch } from '@/utils/apiClient';

export default {
  name: 'SubmitQuotation',
  data() {
    return {
      currentUser: null,
      userRole: null,
      unsubscribeAuth: null,
      formData: {
        name: '',
        address: '',
        phone: '',
        suggestedPrice: 0,
        email: ''
      },
      message: '',
      error: '',
      loading: false,
      redirectTimer: null
    };
  },
  computed: {
    ...mapGetters(['solerResults']),
    isAdmin() {
      return this.userRole === 'admin';
    },
    hasResults() {
      return Boolean(
        this.solerResults &&
        Number(this.solerResults.panelCount) > 0 &&
        this.solerResults.inverter &&
        this.solerResults.battery
      );
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (!user) return;

      this.formData.email = user.email || '';
      this.formData.name = user.displayName || '';
      this.userRole = await getUserRole(user.uid);
      this.formData.suggestedPrice = Number(this.solerResults?.special) || 0;
    });
  },
  mounted() {
    if (!this.hasResults) {
      this.error = 'Calculator results are missing. Please calculate your solar requirement again.';
    }
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  methods: {
    formatNumber(value, digits = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number.toFixed(digits) : '0';
    },
    async submitQuotation() {
      this.error = '';
      this.message = '';

      if (!this.hasResults) {
        this.error = 'Calculator results are missing. Please return to the calculator.';
        return;
      }

      this.loading = true;
      try {
        const quotedPrice = this.isAdmin
          ? Number(this.formData.suggestedPrice)
          : Number(this.solerResults.special);

        if (!Number.isFinite(quotedPrice) || quotedPrice < 0) {
          throw new Error('Quoted price is invalid.');
        }

        const result = await authorizedFetch('/.netlify/functions/addProject', {
          method: 'POST',
          body: JSON.stringify({
            name: this.formData.name,
            email: this.formData.email,
            phone: this.formData.phone,
            address: this.formData.address,
            panelCount: this.solerResults.panelCount,
            inverter: this.solerResults.inverter,
            battery: this.solerResults.battery,
            costWith: this.solerResults.costWith,
            costWithout: this.solerResults.costWithout,
            quotedPrice
          })
        });

        this.message = `${result.message} Project ID: ${result.projectId}`;
        this.redirectTimer = setTimeout(() => {
          this.$router.push(this.isAdmin ? '/admin/projects' : '/customer/my-projects');
        }, 1800);
      } catch (error) {
        console.error('Error creating project:', error);
        this.error = error.message || 'Unable to create the project.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.quotation-container {
  max-width: 650px;
  margin: auto;
  padding: 20px;
}
.quotation-form {
  background-color: #f8f9fa;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.prefilled-fields {
  background-color: #fef9e7;
  border: 1px dashed #f39c12 !important;
}
.loader-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loader {
  font-size: 20px;
  color: #007bff;
}
</style>
