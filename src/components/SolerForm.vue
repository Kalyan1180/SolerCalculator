<template>
  <div class="marketing-page calculator-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <header class="calculator-heading text-center mx-auto mb-4">
          <span class="marketing-eyebrow"><i class="fas fa-calculator" aria-hidden="true"></i>Inventory-aware estimator</span>
          <h1 class="display-6 mb-3">Solar System Calculator</h1>
          <p class="text-muted mb-0">Get a technically suitable system using panels, inverters, batteries and accessories from live stock.</p>
        </header>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ errorMessage }}
        </div>

        <section v-if="showResults && recommendation" class="card calculator-card border-0 shadow-lg">
          <div class="card-body p-4 p-lg-5">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
              <div>
                <span class="marketing-eyebrow mb-2"><i class="fas fa-solar-panel" aria-hidden="true"></i>Recommended system</span>
                <h2 class="h3 mb-1">{{ recommendation.panelCount }}-panel inventory configuration</h2>
                <p class="text-muted mb-0">Compatibility first, then stock availability and cost.</p>
              </div>
              <span :class="['stock-readiness', recommendation.inventoryAssessment.status === 'ready' ? 'is-ready' : 'is-short']">
                <i :class="recommendation.inventoryAssessment.status === 'ready' ? 'fas fa-circle-check' : 'fas fa-triangle-exclamation'" aria-hidden="true"></i>
                {{ readinessLabel }}
              </span>
            </div>

            <div class="row g-3 mb-4">
              <div v-for="metric in resultMetrics" :key="metric.label" class="col-md-4">
                <div class="summary-box h-100"><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></div>
              </div>
            </div>

            <div v-if="recommendation.warnings.length" class="alert alert-warning">
              <strong class="d-block mb-1">Technically suitable, but restocking is required:</strong>
              <ul class="mb-0 ps-3"><li v-for="warning in recommendation.warnings" :key="warning">{{ warning }}</li></ul>
              <small class="d-block mt-2">The quotation can still be created and the restock planner will rank the shortage.</small>
            </div>

            <div class="table-responsive mb-4">
              <table class="table align-middle inventory-bom-table">
                <thead><tr><th>Equipment</th><th>Required</th><th>Available</th><th>Shortfall</th><th>Status</th></tr></thead>
                <tbody>
                  <tr v-for="line in recommendation.billOfMaterials" :key="line.itemId">
                    <td><strong>{{ line.name }}</strong><br /><small class="text-muted">{{ line.sku || 'No SKU' }} · {{ typeLabel(line.type) }}</small></td>
                    <td>{{ line.requiredQuantity }} {{ line.unit }}</td>
                    <td>{{ line.availableQuantity }} {{ line.unit }}</td>
                    <td><strong :class="line.shortfall > 0 ? 'text-danger' : 'text-success'">{{ line.shortfall }}</strong></td>
                    <td><span :class="['badge', line.shortfall > 0 ? 'bg-danger-subtle text-danger-emphasis' : 'bg-success-subtle text-success-emphasis']">{{ line.shortfall > 0 ? 'Restock required' : 'Ready' }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="row g-3 mb-4">
              <div v-for="equipment in equipmentSummary" :key="equipment.label" class="col-lg-4">
                <article class="equipment-result h-100">
                  <span class="equipment-result__icon"><i :class="equipment.icon" aria-hidden="true"></i></span>
                  <small>{{ equipment.label }}</small><strong>{{ equipment.name }}</strong><span>{{ equipment.detail }}</span>
                </article>
              </div>
            </div>

            <div class="price-panel mb-4">
              <div><span>Estimated installed price</span><strong>Rs {{ formatMoney(recommendation.totalCostWithMarkup) }}</strong></div>
              <div><span>Special offer estimate</span><strong class="text-success">Rs {{ formatMoney(recommendation.offerPrice) }}</strong></div>
              <template v-if="canCreateProjects">
                <div><span>Material cost</span><strong>Rs {{ formatMoney(recommendation.materialCost) }}</strong></div>
                <div><span>Labour cost</span><strong>Rs {{ formatMoney(recommendation.laborCost) }}</strong></div>
                <div><span>Cost before markup</span><strong>Rs {{ formatMoney(recommendation.totalCostWithoutMarkup) }}</strong></div>
              </template>
            </div>

            <p class="small text-muted">Availability is calculated after committed demand. Pending and sent quotations contribute to projected shortage and restock priority.</p>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-primary flex-grow-1" @click="openQuotation"><i class="fas fa-file-signature me-2" aria-hidden="true"></i>{{ canCreateProjects ? 'Create quotation from this system' : 'Submit this requirement' }}</button>
              <button class="btn btn-outline-secondary" @click="resetResults">Change calculation</button>
            </div>
          </div>
        </section>

        <form v-else class="card calculator-card border-0 shadow-lg" @submit.prevent="submitForm">
          <div class="card-body p-4 p-lg-5">
            <div class="text-center mb-4">
              <img :src="logo" alt="ANT Solar" class="calculator-logo" />
              <h2 class="h3 mb-2">Tell us about your electricity use</h2>
              <p class="text-muted mb-0">Choose the input method that is easiest for you.</p>
            </div>

            <fieldset class="mb-4">
              <legend class="form-label">Input method</legend>
              <div class="method-grid">
                <label v-for="method in inputMethods" :key="method.value" :class="['method-option', { active: inputMethodType === method.value }]">
                  <input v-model="inputMethodType" type="radio" :value="method.value" />
                  <i :class="method.icon" aria-hidden="true"></i>
                  <span><strong>{{ method.label }}</strong><small>{{ method.help }}</small></span>
                </label>
              </div>
            </fieldset>

            <div v-if="inputMethodType === 'monthly'" class="mb-4">
              <label for="monthlyConsumption" class="form-label">Average monthly consumption (kWh)</label>
              <input id="monthlyConsumption" v-model.number="monthlyConsumption" type="number" min="0.01" step="0.01" class="form-control form-control-lg" required />
            </div>

            <div v-else-if="inputMethodType === 'bill'" class="mb-4">
              <label class="form-label">Bill type</label>
              <div class="d-flex gap-4 mb-3">
                <label class="form-check"><input v-model="billType" class="form-check-input" type="radio" value="domestic" /> Domestic</label>
                <label class="form-check"><input v-model="billType" class="form-check-input" type="radio" value="commercial" /> Commercial</label>
              </div>
              <label for="electricityBill" class="form-label">Average monthly bill (Rs)</label>
              <input id="electricityBill" v-model.number="activeElectricityBill" type="number" min="0.01" step="0.01" class="form-control form-control-lg" required />
            </div>

            <div v-else class="mb-4">
              <label class="form-label">Appliance quantities</label>
              <div class="row g-3">
                <div v-for="(label, key) in applianceLabels" :key="key" class="col-sm-6">
                  <label class="small text-muted mb-1" :for="`appliance-${key}`">{{ label }}</label>
                  <input :id="`appliance-${key}`" v-model.number="appliances[key]" type="number" min="0" :max="maxApplianceCount" step="1" class="form-control" />
                </div>
              </div>
            </div>

            <div v-if="inputMethodType !== 'appliances'" class="mb-4">
              <label for="peakLoad" class="form-label">Peak current in ampere <span class="text-muted">(optional)</span></label>
              <input id="peakLoad" v-model.number="peakLoad" type="number" min="0" step="0.01" class="form-control" />
              <div class="form-text">Add this when high-power appliances may run together.</div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>{{ loading ? 'Checking inventory…' : 'Recommend a system' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script>
import { ELECTRICITY_RATES, VALIDATION_CONFIG } from '@/constants/calculationConstants';
import { PERMISSIONS } from '@/constants/rbac';
import rbacMixin from '@/mixins/rbacMixin';
import { buildSystemRecommendation, finiteNumber } from '@/utils/inventoryRecommendation';

const APPLIANCE_CONFIG = Object.freeze({
  ledBulb: { label: 'LED bulb', watts: 9, hours: 5, peak: 9 },
  tubeLight: { label: 'Tube light', watts: 20, hours: 4, peak: 20 },
  fan: { label: 'Fan', watts: 70, hours: 8, peak: 70 },
  refrigerator: { label: 'Refrigerator', watts: 100, hours: 8, peak: 120 },
  ledTV: { label: 'LED TV', watts: 40, hours: 4, peak: 40 },
  pump: { label: 'Pump (1 kW)', watts: 1000, hours: 0.5, peak: 1000 },
  ac: { label: 'AC (1 ton)', watts: 1000, hours: 6, peak: 1500 }
});

export default {
  name: 'SolerCalculator',
  mixins: [rbacMixin],
  data() {
    return {
      showResults: false,
      loading: false,
      errorMessage: '',
      recommendation: null,
      inputMethodType: 'monthly',
      monthlyConsumption: null,
      billType: 'domestic',
      domesticElectricityBill: null,
      commercialElectricityBill: null,
      peakLoad: null,
      appliances: Object.fromEntries(Object.keys(APPLIANCE_CONFIG).map(key => [key, 0])),
      applianceLabels: Object.fromEntries(Object.entries(APPLIANCE_CONFIG).map(([key, value]) => [key, value.label])),
      inputMethods: [
        { value: 'monthly', label: 'Monthly units', help: 'Use kWh from your bill', icon: 'fas fa-gauge-high' },
        { value: 'bill', label: 'Bill amount', help: 'Estimate from rupees paid', icon: 'fas fa-receipt' },
        { value: 'appliances', label: 'Appliances', help: 'Count household loads', icon: 'fas fa-plug-circle-bolt' }
      ],
      logo: require('@/assets/logo.png')
    };
  },
  computed: {
    canCreateProjects() {
      return this.can(PERMISSIONS.PROJECTS_CREATE);
    },
    maxApplianceCount() {
      return VALIDATION_CONFIG.MAX_APPLIANCE_COUNT;
    },
    activeElectricityBill: {
      get() {
        return this.billType === 'domestic' ? this.domesticElectricityBill : this.commercialElectricityBill;
      },
      set(value) {
        if (this.billType === 'domestic') this.domesticElectricityBill = value;
        else this.commercialElectricityBill = value;
      }
    },
    unitPerDay() {
      if (this.inputMethodType === 'monthly') return finiteNumber(this.monthlyConsumption) / 30;
      if (this.inputMethodType === 'bill') {
        const rate = this.billType === 'domestic' ? ELECTRICITY_RATES.DOMESTIC_RATE : ELECTRICITY_RATES.COMMERCIAL_RATE;
        return rate > 0 ? ((finiteNumber(this.activeElectricityBill) * 12) / 365) / rate : 0;
      }
      return Object.entries(APPLIANCE_CONFIG).reduce((total, [key, config]) => total + config.watts * config.hours * finiteNumber(this.appliances[key]), 0) / 1000;
    },
    computedPeakLoad() {
      if (this.inputMethodType === 'appliances') {
        return Object.entries(APPLIANCE_CONFIG).reduce((total, [key, config]) => total + config.peak * finiteNumber(this.appliances[key]), 0) / 1000;
      }
      return finiteNumber(this.peakLoad) > 0 ? (finiteNumber(this.peakLoad) * 220) / 1000 : 0;
    },
    panelCount() {
      const units = this.unitPerDay;
      if (units <= 0) return 0;
      if (units <= 2) return 1;
      if (units <= 5) return 2;
      if (units <= 7) return 3;
      if (units <= 12) return 4;
      if (units <= 18) return 6;
      if (units <= 24) return 8;
      return Math.ceil(units / 3);
    },
    readinessLabel() {
      return this.recommendation.inventoryAssessment.status === 'ready'
        ? 'Stock ready'
        : `${this.recommendation.inventoryAssessment.shortItemCount} short item(s)`;
    },
    resultMetrics() {
      return [
        { label: 'Daily energy', value: `${this.unitPerDay.toFixed(2)} kWh` },
        { label: 'Peak load', value: `${this.computedPeakLoad.toFixed(2)} kW` },
        { label: 'Offer estimate', value: `Rs ${this.formatMoney(this.recommendation.offerPrice)}` }
      ];
    },
    equipmentSummary() {
      const battery = this.recommendation.battery;
      return [
        { label: 'Panel', icon: 'fas fa-solar-panel', name: this.recommendation.panel.name, detail: `${finiteNumber(this.recommendation.panel.wattage || this.recommendation.panel.specs?.wattage)} W · ${this.recommendation.panelCount} units` },
        { label: 'Inverter', icon: 'fas fa-bolt', name: this.recommendation.inverter.name, detail: `${finiteNumber(this.recommendation.inverter.peakLoad || this.recommendation.inverter.specs?.peakLoad)} KVA` },
        { label: 'Battery', icon: 'fas fa-car-battery', name: battery.selectedBattery?.name || 'Not required', detail: battery.selectedBattery ? `${battery.quantity} unit(s)` : 'Grid-tie configuration' }
      ];
    }
  },
  methods: {
    formatMoney(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(finiteNumber(value));
    },
    typeLabel(type) {
      return { panel: 'Panel', inverter: 'Inverter', battery: 'Battery', wiring: 'Wiring', mounting: 'Mounting', other: 'Accessory' }[type] || 'Equipment';
    },
    validateInputs() {
      if (this.inputMethodType === 'monthly' && finiteNumber(this.monthlyConsumption) <= 0) return 'Monthly consumption must be greater than zero.';
      if (this.inputMethodType === 'bill' && finiteNumber(this.activeElectricityBill) <= 0) return 'Electricity bill must be greater than zero.';
      if (finiteNumber(this.peakLoad) < 0) return 'Peak current cannot be negative.';
      const quantities = Object.values(this.appliances).map(finiteNumber);
      if (quantities.some(value => value < 0 || !Number.isInteger(value))) return 'Appliance quantities must be non-negative whole numbers.';
      if (quantities.some(value => value > VALIDATION_CONFIG.MAX_APPLIANCE_COUNT)) return `Appliance quantity cannot exceed ${VALIDATION_CONFIG.MAX_APPLIANCE_COUNT}.`;
      if (this.inputMethodType === 'appliances' && quantities.reduce((sum, value) => sum + value, 0) === 0) return 'Enter at least one appliance.';
      return null;
    },
    async submitForm() {
      this.errorMessage = '';
      const validationError = this.validateInputs();
      if (validationError) {
        this.errorMessage = validationError;
        return;
      }

      this.loading = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch('/.netlify/functions/getData', { signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load live inventory.');
        const result = buildSystemRecommendation({
          unitPerDay: this.unitPerDay,
          peakLoad: this.computedPeakLoad,
          panelCount: this.panelCount,
          panels: Array.isArray(payload.panels) ? payload.panels : [],
          inverters: Array.isArray(payload.inverters) ? payload.inverters : [],
          batteries: Array.isArray(payload.batteries) ? payload.batteries : [],
          accessories: Array.isArray(payload.accessories) ? payload.accessories : []
        });
        if (!result.success) throw new Error(result.error || 'No suitable system could be built from inventory.');
        this.recommendation = result;
        this.showResults = true;
      } catch (error) {
        this.errorMessage = error.name === 'AbortError' ? 'The inventory request timed out. Please try again.' : error.message || 'Unable to calculate the system.';
      } finally {
        window.clearTimeout(timeoutId);
        this.loading = false;
      }
    },
    openQuotation() {
      if (!this.recommendation) return;
      this.$store.dispatch('updateSolerResults', {
        costWith: this.recommendation.totalCostWithMarkup,
        costWithout: this.recommendation.totalCostWithoutMarkup,
        materialCost: this.recommendation.materialCost,
        laborCost: this.recommendation.laborCost,
        profit: this.recommendation.profitPercentage,
        special: this.recommendation.offerPrice,
        panelCount: this.recommendation.panelCount,
        panel: this.recommendation.panel,
        inverter: this.recommendation.inverter,
        battery: this.recommendation.battery,
        billOfMaterials: this.recommendation.billOfMaterials,
        inventoryAssessment: this.recommendation.inventoryAssessment,
        calculationInput: { unitPerDay: this.unitPerDay, peakLoad: this.computedPeakLoad, inputMethod: this.inputMethodType }
      });
      this.$router.push({ name: 'SubmitQuotation' });
    },
    resetResults() {
      this.showResults = false;
      this.errorMessage = '';
      this.recommendation = null;
    }
  }
};
</script>

<style scoped>
.calculator-heading { max-width: 720px; }
.calculator-card { max-width: 980px; margin: 0 auto; }
.calculator-logo { width: 82px; height: auto; margin-bottom: 1rem; }
.method-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
.method-option { position: relative; display: flex; align-items: center; gap: 0.8rem; padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 12px; cursor: pointer; transition: 0.2s ease; }
.method-option input { position: absolute; opacity: 0; pointer-events: none; }
.method-option i { color: var(--ant-blue-700); font-size: 1.25rem; }
.method-option span, .summary-box, .equipment-result { display: flex; flex-direction: column; }
.method-option small, .summary-box small, .equipment-result small, .price-panel span { color: var(--ant-slate-500); }
.method-option.active { border-color: var(--ant-blue-600); background: rgba(37, 99, 235, 0.06); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08); }
.summary-box, .equipment-result, .price-panel { border: 1px solid var(--ant-slate-200); border-radius: 12px; background: var(--ant-slate-50); }
.summary-box, .equipment-result { padding: 1rem; }
.summary-box strong { color: var(--ant-blue-700); font-size: 1.45rem; }
.equipment-result { gap: 0.25rem; }
.equipment-result__icon { color: var(--ant-blue-700); margin-bottom: 0.4rem; }
.stock-readiness { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.55rem 0.8rem; border-radius: 999px; font-weight: 700; }
.stock-readiness.is-ready { background: #dcfce7; color: #166534; }
.stock-readiness.is-short { background: #fef3c7; color: #92400e; }
.price-panel { padding: 1rem 1.25rem; display: grid; gap: 0.7rem; }
.price-panel > div { display: flex; justify-content: space-between; gap: 1rem; }
.inventory-bom-table th { white-space: nowrap; }
@media (max-width: 767.98px) {
  .method-grid { grid-template-columns: 1fr; }
  .price-panel > div { align-items: flex-start; flex-direction: column; gap: 0.1rem; }
}
</style>
