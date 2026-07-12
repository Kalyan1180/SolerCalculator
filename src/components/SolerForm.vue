<template>
  <div class="marketing-page calculator-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <header class="calculator-heading text-center mx-auto mb-4">
          <span class="marketing-eyebrow"><i class="fas fa-calculator" aria-hidden="true"></i>Solar requirement estimator</span>
          <h1 class="display-6 mb-3">Solar System Calculator</h1>
          <p class="text-muted mb-0">Estimate the panels, inverter capacity and battery configuration suitable for your electricity use.</p>
        </header>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ errorMessage }}
        </div>

        <section v-if="showResults && recommendation" class="card calculator-card border-0 shadow-lg">
          <div class="card-body p-4 p-lg-5">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
              <div>
                <span class="marketing-eyebrow mb-2"><i class="fas fa-solar-panel" aria-hidden="true"></i>Recommended system</span>
                <h2 class="h3 mb-1">{{ recommendation.panelCount }}-panel solar configuration</h2>
                <p class="text-muted mb-0">A practical starting point based on the electricity information you provided.</p>
              </div>
            </div>

            <div class="row g-3 mb-4">
              <div v-for="metric in resultMetrics" :key="metric.label" class="col-md-4">
                <div class="summary-box h-100"><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></div>
              </div>
            </div>

            <div class="row g-3 mb-4">
              <div v-for="equipment in equipmentSummary" :key="equipment.label" class="col-lg-4">
                <article class="equipment-result h-100">
                  <span class="equipment-result__icon"><i :class="equipment.icon" aria-hidden="true"></i></span>
                  <small>{{ equipment.label }}</small>
                  <strong>{{ equipment.name }}</strong>
                  <span>{{ equipment.detail }}</span>
                </article>
              </div>
            </div>

            <section class="requirement-section mb-4">
              <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <h3 class="h5 mb-1">System requirements</h3>
                  <p class="small text-muted mb-0">Equipment quantities included in this recommendation.</p>
                </div>
              </div>
              <div class="table-responsive">
                <table class="table align-middle requirement-table mb-0">
                  <thead><tr><th>Equipment</th><th class="text-end">Required quantity</th></tr></thead>
                  <tbody>
                    <tr v-for="line in recommendation.requirements" :key="`${line.type}-${line.name}`">
                      <td><strong>{{ line.name }}</strong><br /><small class="text-muted">{{ typeLabel(line.type) }}</small></td>
                      <td class="text-end"><strong>{{ line.requiredQuantity }}</strong> {{ line.unit }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div class="price-panel mb-4">
              <div><span>Estimated installed price</span><strong>Rs {{ formatMoney(recommendation.estimatedInstalledPrice) }}</strong></div>
              <div><span>Estimated offer</span><strong class="text-success">Rs {{ formatMoney(recommendation.offerPrice) }}</strong></div>
            </div>

            <div class="alert alert-info">
              The final equipment selection, installation scope and price will be confirmed after reviewing your site and electrical requirements.
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-primary flex-grow-1" @click="openQuotation">
                <i class="fas fa-file-signature me-2" aria-hidden="true"></i>Request a quotation
              </button>
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
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>{{ loading ? 'Calculating…' : 'Calculate my requirement' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script>
import { ELECTRICITY_RATES, VALIDATION_CONFIG } from '@/constants/calculationConstants';

const APPLIANCE_CONFIG = Object.freeze({
  ledBulb: { label: 'LED bulb', watts: 9, hours: 5, peak: 9 },
  tubeLight: { label: 'Tube light', watts: 20, hours: 4, peak: 20 },
  fan: { label: 'Fan', watts: 70, hours: 8, peak: 70 },
  refrigerator: { label: 'Refrigerator', watts: 100, hours: 8, peak: 120 },
  ledTV: { label: 'LED TV', watts: 40, hours: 4, peak: 40 },
  pump: { label: 'Pump (1 kW)', watts: 1000, hours: 0.5, peak: 1000 },
  ac: { label: 'AC (1 ton)', watts: 1000, hours: 6, peak: 1500 }
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'SolerCalculator',
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
      return Object.entries(APPLIANCE_CONFIG).reduce((total, [key, config]) => {
        return total + config.watts * config.hours * finiteNumber(this.appliances[key]);
      }, 0) / 1000;
    },
    computedPeakLoad() {
      if (this.inputMethodType === 'appliances') {
        return Object.entries(APPLIANCE_CONFIG).reduce((total, [key, config]) => {
          return total + config.peak * finiteNumber(this.appliances[key]);
        }, 0) / 1000;
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
    resultMetrics() {
      return [
        { label: 'Daily energy', value: `${this.unitPerDay.toFixed(2)} kWh` },
        { label: 'Peak load', value: `${this.computedPeakLoad.toFixed(2)} kW` },
        { label: 'Estimated offer', value: `Rs ${this.formatMoney(this.recommendation.offerPrice)}` }
      ];
    },
    equipmentSummary() {
      const battery = this.recommendation.battery;
      return [
        {
          label: 'Solar panels',
          icon: 'fas fa-solar-panel',
          name: this.recommendation.panel.name,
          detail: `${finiteNumber(this.recommendation.panel.wattage)} W · ${this.recommendation.panelCount} units`
        },
        {
          label: 'Inverter',
          icon: 'fas fa-bolt',
          name: this.recommendation.inverter.name,
          detail: `${finiteNumber(this.recommendation.inverter.peakLoad)} KVA`
        },
        {
          label: 'Battery',
          icon: 'fas fa-car-battery',
          name: battery.selectedBattery?.name || 'Not required',
          detail: battery.selectedBattery ? `${battery.quantity} unit(s)` : 'Grid-tie configuration'
        }
      ];
    }
  },
  methods: {
    formatMoney(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(finiteNumber(value));
    },
    typeLabel(type) {
      return {
        panel: 'Solar panel',
        inverter: 'Solar inverter',
        battery: 'Battery',
        wiring: 'Wiring and cable',
        mounting: 'Mounting structure',
        other: 'System accessory'
      }[type] || 'Equipment';
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
        const response = await fetch('/.netlify/functions/recommendSystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'customer',
            unitPerDay: this.unitPerDay,
            peakLoad: this.computedPeakLoad,
            panelCount: this.panelCount
          }),
          signal: controller.signal,
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to calculate a suitable system.');
        if (!payload.recommendation?.recommendationId) throw new Error('The calculation could not be completed. Please try again.');
        this.recommendation = payload.recommendation;
        this.showResults = true;
      } catch (error) {
        this.errorMessage = error.name === 'AbortError'
          ? 'The calculation took too long. Please try again.'
          : error.message || 'Unable to calculate the system.';
      } finally {
        window.clearTimeout(timeoutId);
        this.loading = false;
      }
    },
    openQuotation() {
      if (!this.recommendation) return;
      this.$store.dispatch('updateSolerResults', {
        recommendationId: this.recommendation.recommendationId,
        costWith: this.recommendation.estimatedInstalledPrice,
        special: this.recommendation.offerPrice,
        panelCount: this.recommendation.panelCount,
        panel: this.recommendation.panel,
        inverter: this.recommendation.inverter,
        battery: this.recommendation.battery,
        requirements: this.recommendation.requirements,
        calculationInput: this.recommendation.calculationInput
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
.summary-box, .equipment-result, .price-panel, .requirement-section { border: 1px solid var(--ant-slate-200); border-radius: 12px; background: var(--ant-slate-50); }
.summary-box, .equipment-result { padding: 1rem; }
.summary-box strong { color: var(--ant-blue-700); font-size: 1.45rem; }
.equipment-result { gap: 0.25rem; }
.equipment-result__icon { color: var(--ant-blue-700); margin-bottom: 0.4rem; }
.price-panel { padding: 1rem 1.25rem; display: grid; gap: 0.7rem; }
.price-panel > div { display: flex; justify-content: space-between; gap: 1rem; }
.requirement-section { padding: 1rem 1.25rem; }
.requirement-table th { white-space: nowrap; }
@media (max-width: 767.98px) {
  .method-grid { grid-template-columns: 1fr; }
  .price-panel > div { align-items: flex-start; flex-direction: column; gap: 0.1rem; }
}
</style>
