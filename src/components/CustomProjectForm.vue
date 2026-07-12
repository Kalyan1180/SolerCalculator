<template>
  <div class="custom-project container-fluid py-4">
    <div v-if="loading" class="loader-overlay" role="status">
      <div class="card p-4 text-center"><div class="spinner-border text-primary mx-auto mb-3"></div><strong>Please wait</strong><span class="text-muted">{{ loadingMessage }}</span></div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Create a managed project</h2>
        <p class="text-muted mb-0">Enter the customer requirement and generate an authorized operational recommendation.</p>
      </div>
      <router-link :to="{ name: 'ProjectManagement' }" class="btn btn-outline-secondary"><i class="fas fa-arrow-left me-2"></i>Back to projects</router-link>
    </div>

    <div v-if="statusMessage" :class="['alert', statusType === 'success' ? 'alert-success' : 'alert-danger']">{{ statusMessage }}</div>

    <form @submit.prevent="submitCustomProject">
      <div class="row g-4">
        <div class="col-xl-7">
          <section class="card mb-4">
            <div class="card-header"><h3 class="h5 mb-1">Customer details</h3><p class="small text-muted mb-0">These details appear on the project and quotation.</p></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Name</label><input v-model.trim="form.name" class="form-control" maxlength="100" required /></div>
                <div class="col-md-6"><label class="form-label">Email</label><input v-model.trim="form.email" type="email" class="form-control" maxlength="160" required /></div>
                <div class="col-md-6"><label class="form-label">Phone</label><input v-model.trim="form.phone" type="tel" class="form-control" maxlength="30" required /></div>
                <div class="col-md-6"><label class="form-label">Address</label><input v-model.trim="form.address" class="form-control" maxlength="500" required /></div>
                <div class="col-12"><label class="form-label">Customer notes</label><textarea v-model.trim="form.additionalNotes" class="form-control" rows="3" maxlength="1000"></textarea></div>
              </div>
            </div>
          </section>

          <section class="card mb-4">
            <div class="card-header"><h3 class="h5 mb-1">System requirement</h3><p class="small text-muted mb-0">These values drive the protected recommendation.</p></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4"><label class="form-label">Panels required</label><input v-model.number="form.panels" type="number" min="1" max="500" step="1" class="form-control" required /></div>
                <div class="col-md-4"><label class="form-label">Daily energy (kWh)</label><input v-model.number="form.dailyEnergy" type="number" min="0.01" max="1000" step="0.01" class="form-control" required /></div>
                <div class="col-md-4"><label class="form-label">Peak load (kW)</label><input v-model.number="form.peakLoad" type="number" min="0" max="1000" step="0.01" class="form-control" required /></div>
              </div>
              <button type="button" class="btn btn-outline-primary mt-4" :disabled="loading" @click="generateSuggestion">
                <i class="fas fa-wand-magic-sparkles me-2" aria-hidden="true"></i>{{ recommendation ? 'Refresh operational suggestion' : 'Generate operational suggestion' }}
              </button>
            </div>
          </section>

          <section v-if="recommendation" class="card">
            <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div><h3 class="h5 mb-1">Recommended bill of materials</h3><p class="small text-muted mb-0">Internal availability details are visible only in authorized workspaces.</p></div>
              <span class="stock-readiness" :class="recommendation.inventoryAssessment.status === 'ready' ? 'is-ready' : 'is-short'">
                {{ recommendation.inventoryAssessment.status === 'ready' ? 'Supply ready' : `${recommendation.inventoryAssessment.shortItemCount} short item(s)` }}
              </span>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead><tr><th>Item</th><th>Required</th><th>Available</th><th>Shortfall</th></tr></thead>
                <tbody>
                  <tr v-for="line in recommendation.billOfMaterials" :key="line.itemId">
                    <td><strong>{{ line.name }}</strong><br /><small class="text-muted">{{ line.sku || 'No SKU' }} · {{ line.type }}</small></td>
                    <td>{{ line.requiredQuantity }} {{ line.unit }}</td>
                    <td>{{ line.availableQuantity }} {{ line.unit }}</td>
                    <td><strong :class="line.shortfall > 0 ? 'text-danger' : 'text-success'">{{ line.shortfall }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="col-xl-5">
          <section class="card sticky-summary">
            <div class="card-header"><h3 class="h5 mb-1">Pricing and creation</h3><p class="small text-muted mb-0">Generate a recommendation before creating the project.</p></div>
            <div class="card-body">
              <template v-if="recommendation">
                <div class="pricing-row"><span>Material cost</span><strong>Rs {{ money(recommendation.materialCost) }}</strong></div>
                <div class="pricing-row"><span>Labour cost</span><strong>Rs {{ money(recommendation.laborCost) }}</strong></div>
                <div class="pricing-row"><span>Estimated installed price</span><strong>Rs {{ money(recommendation.totalCostWithMarkup) }}</strong></div>
                <div class="pricing-row"><span>Suggested offer</span><strong class="text-success">Rs {{ money(recommendation.offerPrice) }}</strong></div>
                <hr />
                <label class="form-label" for="quotedPrice">Final quoted price (Rs)</label>
                <input id="quotedPrice" v-model.number="form.quotedPrice" type="number" min="1" step="1" class="form-control form-control-lg" required />
                <div v-if="recommendation.inventoryAssessment.totalShortfall > 0" class="alert alert-warning mt-3 mb-0">
                  Purchasing must cover {{ recommendation.inventoryAssessment.totalShortfall }} unit(s) before fulfilment.
                </div>
              </template>
              <div v-else class="enterprise-empty-state py-3">
                <div class="enterprise-empty-state__icon"><i class="fas fa-gears"></i></div>
                <h4 class="h6">No operational recommendation yet</h4>
                <p class="text-muted mb-0">Enter the requirement and generate a suggestion.</p>
              </div>

              <button type="submit" class="btn btn-primary btn-lg w-100 mt-4" :disabled="loading || !recommendation">
                <i class="fas fa-folder-plus me-2" aria-hidden="true"></i>Create project
              </button>
            </div>
          </section>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'CustomProjectForm',
  data() {
    return {
      form: this.emptyForm(),
      recommendation: null,
      statusMessage: '',
      statusType: '',
      loading: false,
      loadingMessage: '',
      redirectTimer: null
    };
  },
  beforeUnmount() {
    if (this.redirectTimer) window.clearTimeout(this.redirectTimer);
  },
  methods: {
    emptyForm() {
      return {
        name: '', email: '', phone: '', address: '', additionalNotes: '',
        panels: 1, dailyEnergy: 2, peakLoad: 1, quotedPrice: 0
      };
    },
    money(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(finiteNumber(value));
    },
    validateRequirement() {
      if (!Number.isInteger(finiteNumber(this.form.panels)) || finiteNumber(this.form.panels) <= 0) return 'Panel count must be a positive whole number.';
      if (finiteNumber(this.form.dailyEnergy) <= 0) return 'Daily energy must be greater than zero.';
      if (finiteNumber(this.form.peakLoad) < 0) return 'Peak load cannot be negative.';
      return null;
    },
    async generateSuggestion() {
      this.statusMessage = '';
      const validationError = this.validateRequirement();
      if (validationError) {
        this.statusMessage = validationError;
        this.statusType = 'error';
        return;
      }

      this.loading = true;
      this.loadingMessage = 'Generating the protected operational recommendation…';
      try {
        const payload = await authenticatedJsonRequest('/.netlify/functions/recommendSystem', {
          method: 'POST',
          body: JSON.stringify({
            mode: 'staff',
            unitPerDay: this.form.dailyEnergy,
            peakLoad: this.form.peakLoad,
            panelCount: this.form.panels
          })
        });
        if (!payload.recommendation?.recommendationId) throw new Error('No suitable system could be generated.');
        this.recommendation = payload.recommendation;
        this.form.quotedPrice = Math.ceil(finiteNumber(payload.recommendation.offerPrice));
      } catch (error) {
        this.recommendation = null;
        this.statusMessage = error.message;
        this.statusType = 'error';
      } finally {
        this.loading = false;
      }
    },
    async submitCustomProject() {
      this.statusMessage = '';
      if (!this.recommendation) {
        this.statusMessage = 'Generate an operational recommendation before creating the project.';
        this.statusType = 'error';
        return;
      }
      if (!this.form.name || !this.form.email || !this.form.phone || !this.form.address) {
        this.statusMessage = 'Complete all required customer fields.';
        this.statusType = 'error';
        return;
      }
      if (finiteNumber(this.form.quotedPrice) <= 0) {
        this.statusMessage = 'Quoted price must be greater than zero.';
        this.statusType = 'error';
        return;
      }

      this.loading = true;
      this.loadingMessage = 'Creating the managed project…';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/createQuotation', {
          method: 'POST',
          body: JSON.stringify({
            recommendationId: this.recommendation.recommendationId,
            name: this.form.name,
            email: this.form.email,
            phone: this.form.phone,
            address: this.form.address,
            additionalNotes: this.form.additionalNotes,
            suggestedPrice: finiteNumber(this.form.quotedPrice),
            managedProject: true
          })
        });

        this.statusMessage = `Project ${result.projectId} created successfully.`;
        this.statusType = 'success';
        this.redirectTimer = window.setTimeout(() => this.$router.push({ name: 'ProjectManagement' }), 1400);
      } catch (error) {
        this.statusMessage = error.message;
        this.statusType = 'error';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.custom-project { max-width: 1440px; }
.loader-overlay { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 1rem; background: rgba(248, 250, 252, 0.86); backdrop-filter: blur(4px); }
.loader-overlay .card { min-width: min(360px, 100%); }
.loader-overlay span { display: block; margin-top: 0.35rem; }
.sticky-summary { position: sticky; top: 92px; }
.pricing-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.65rem 0; border-bottom: 1px solid var(--ant-slate-100); }
.stock-readiness { display: inline-flex; padding: 0.45rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800; }
.stock-readiness.is-ready { background: #dcfce7; color: #166534; }
.stock-readiness.is-short { background: #fef3c7; color: #92400e; }
@media (max-width: 1199.98px) { .sticky-summary { position: static; } }
</style>
