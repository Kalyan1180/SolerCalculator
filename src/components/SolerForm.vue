<template>
  <div class="marketing-page calculator-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <div class="calculator-heading text-center mx-auto mb-4">
          <span class="marketing-eyebrow"><i class="fas fa-calculator" aria-hidden="true"></i>System estimator</span>
          <h1 class="display-6 mb-3">Solar Calculator</h1>
          <p class="text-muted mb-0">Estimate a suitable solar system from monthly consumption, electricity bill or appliance usage.</p>
        </div>

        <div v-if="errorMessage" class="alert alert-danger calculator-alert" role="alert">
          <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ errorMessage }}
        </div>
        <div v-if="loading" class="alert alert-info calculator-alert" role="status">
          <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading equipment data and preparing your recommendation…
        </div>

        <section v-if="showResults && !loading" class="result-card card calculator-card">
          <div class="card-header calculator-result-header">
            <div>
              <small class="text-white-50 d-block">Recommended system</small>
              <h2 class="h3 text-white mb-0">Your solar estimate</h2>
            </div>
            <button type="button" class="btn btn-light btn-sm" @click="resetResults">
              <i class="fas fa-rotate-left me-2" aria-hidden="true"></i>Recalculate
            </button>
          </div>

          <div class="card-body p-4 p-lg-5">
            <div class="row g-3 mb-4">
              <div class="col-md-4">
                <div class="summary-box">
                  <span class="summary-icon"><i class="fas fa-solar-panel" aria-hidden="true"></i></span>
                  <small>Panels required</small>
                  <strong>{{ panelCount }}</strong>
                </div>
              </div>
              <div class="col-md-4">
                <div class="summary-box">
                  <span class="summary-icon"><i class="fas fa-bolt" aria-hidden="true"></i></span>
                  <small>Daily energy</small>
                  <strong>{{ unitPerDay.toFixed(2) }} kWh</strong>
                </div>
              </div>
              <div class="col-md-4">
                <div class="summary-box">
                  <span class="summary-icon"><i class="fas fa-gauge-high" aria-hidden="true"></i></span>
                  <small>Peak load</small>
                  <strong>{{ computedPeakLoad.toFixed(2) }} kW</strong>
                </div>
              </div>
            </div>

            <div class="row g-4">
              <div class="col-lg-7">
                <section class="details-section mb-3">
                  <div class="d-flex align-items-start gap-3">
                    <span class="detail-icon"><i class="fas fa-plug-circle-bolt" aria-hidden="true"></i></span>
                    <div>
                      <small class="text-muted d-block">Recommended inverter</small>
                      <h3 class="h5 mb-1">{{ selectedInverter?.name || 'Not available' }}</h3>
                      <span v-if="selectedInverter" class="text-muted">{{ selectedInverter.peakLoad }} KVA · Rs {{ formatMoney(selectedInverter.cost) }}</span>
                    </div>
                  </div>
                </section>

                <section class="details-section">
                  <div class="d-flex align-items-start gap-3">
                    <span class="detail-icon"><i class="fas fa-car-battery" aria-hidden="true"></i></span>
                    <div>
                      <small class="text-muted d-block">Battery recommendation</small>
                      <template v-if="batteryInfo?.selectedBattery">
                        <h3 class="h5 mb-1">{{ batteryInfo.selectedBattery.name }}</h3>
                        <span class="text-muted">{{ batteryInfo.selectedBattery.capacity }} AH · {{ batteryInfo.quantity }} unit(s)</span>
                      </template>
                      <h3 v-else class="h5 mb-0">No battery required</h3>
                    </div>
                  </div>
                </section>
              </div>

              <div class="col-lg-5">
                <aside class="price-panel h-100">
                  <small class="text-muted d-block">Estimated installed cost</small>
                  <strong class="price-panel__total">Rs {{ formatMoney(costResults.totalCostWithMarkup) }}</strong>

                  <div v-if="canCreateProjects" class="price-panel__internal">
                    <div><span>Equipment/material</span><strong>Rs {{ formatMoney(costBreakdown.materialCost) }}</strong></div>
                    <div><span>Installation/labour</span><strong>Rs {{ formatMoney(costBreakdown.laborCost) }}</strong></div>
                    <div><span>Cost before profit</span><strong>Rs {{ formatMoney(costResults.totalCostWithoutMarkup) }}</strong></div>
                    <div><span>Markup</span><strong>{{ profitPercentage.toFixed(2) }}%</strong></div>
                  </div>

                  <div class="offer-section mt-4">
                    <small>Special offer price</small>
                    <strong>Rs {{ formatMoney(offerPrice) }}</strong>
                  </div>
                </aside>
              </div>
            </div>

            <div class="alert alert-warning mt-4 mb-4">
              <i class="fas fa-circle-info me-2" aria-hidden="true"></i>
              Actual cost can change after a site survey or when the supplied consumption and load information is inaccurate.
            </div>

            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-primary flex-grow-1" @click="openQuotation">
                <i class="fas fa-paper-plane me-2" aria-hidden="true"></i>
                {{ canCreateProjects ? 'Generate quotation' : 'Send this requirement' }}
              </button>
              <button class="btn btn-outline-secondary flex-grow-1" @click="resetResults">Change calculation</button>
            </div>
          </div>
        </section>

        <form v-else-if="!loading" @submit.prevent="submitForm" class="solar-form card calculator-card">
          <div class="card-body p-4 p-lg-5">
            <fieldset class="mb-4">
              <legend class="form-label mb-3">Choose how you want to calculate</legend>
              <div class="method-grid">
                <label class="method-option" :class="{ active: inputMethodType === 'monthly' }">
                  <input type="radio" v-model="inputMethodType" value="monthly" />
                  <span class="method-option__icon"><i class="fas fa-chart-column" aria-hidden="true"></i></span>
                  <span><strong>Monthly units</strong><small>Use kWh from your electricity bill.</small></span>
                </label>
                <label class="method-option" :class="{ active: inputMethodType === 'bill' }">
                  <input type="radio" v-model="inputMethodType" value="bill" />
                  <span class="method-option__icon"><i class="fas fa-indian-rupee-sign" aria-hidden="true"></i></span>
                  <span><strong>Electricity bill</strong><small>Estimate usage from average monthly cost.</small></span>
                </label>
                <label class="method-option" :class="{ active: inputMethodType === 'appliances' }">
                  <input type="radio" v-model="inputMethodType" value="appliances" />
                  <span class="method-option__icon"><i class="fas fa-house-signal" aria-hidden="true"></i></span>
                  <span><strong>Appliances</strong><small>Build demand from household equipment.</small></span>
                </label>
              </div>
            </fieldset>

            <div class="calculator-input-panel">
              <div v-if="inputMethodType === 'monthly'" class="row align-items-end g-3">
                <div class="col-md-8">
                  <label for="monthlyConsumption" class="form-label">Monthly consumption (kWh)</label>
                  <input
                    v-model.number="monthlyConsumption"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="form-control"
                    id="monthlyConsumption"
                    placeholder="Example: 180"
                    required
                  />
                </div>
                <div class="col-md-4"><div class="input-help"><i class="fas fa-receipt"></i><span>Find this value on your latest electricity bill.</span></div></div>
              </div>

              <div v-else-if="inputMethodType === 'bill'">
                <div class="row g-3">
                  <div class="col-md-5">
                    <label class="form-label">Bill type</label>
                    <div class="segmented-control">
                      <label :class="{ active: billType === 'domestic' }"><input type="radio" v-model="billType" value="domestic" />Domestic</label>
                      <label :class="{ active: billType === 'commercial' }"><input type="radio" v-model="billType" value="commercial" />Commercial</label>
                    </div>
                  </div>
                  <div class="col-md-7">
                    <label for="electricityBill" class="form-label">Average monthly bill (Rs)</label>
                    <input
                      v-model.number="activeElectricityBill"
                      type="number"
                      min="0.01"
                      step="0.01"
                      class="form-control"
                      id="electricityBill"
                      placeholder="Example: 1500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div v-else>
                <label class="form-label mb-3">Appliance quantities</label>
                <div class="row g-3">
                  <div v-for="(label, key) in applianceLabels" :key="key" class="col-sm-6 col-lg-4">
                    <label class="appliance-control">
                      <span>{{ label }}</span>
                      <input
                        v-model.number="appliances[key]"
                        type="number"
                        min="0"
                        :max="maxApplianceCount"
                        step="1"
                        class="form-control"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div v-if="inputMethodType !== 'appliances'" class="mt-4">
                <label for="peakLoad" class="form-label">Peak load in ampere <span class="text-muted fw-normal">(optional)</span></label>
                <input
                  v-model.number="peakLoad"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control"
                  id="peakLoad"
                  placeholder="Leave empty when unknown"
                />
                <div class="form-text">Adding peak load improves inverter matching. The calculator estimates it automatically when using appliances.</div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-100 mt-4">
              Calculate solar requirement <i class="fas fa-arrow-right ms-2" aria-hidden="true"></i>
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';
import { COST_CONFIG, ELECTRICITY_RATES, VALIDATION_CONFIG } from '@/constants/calculationConstants';

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'SolerCalculator',
  mixins: [rbacMixin],
  data() {
    return {
      currentUser: null,
      unsubscribeAuth: null,
      showResults: false,
      loading: false,
      errorMessage: '',
      inputMethodType: 'monthly',
      monthlyConsumption: null,
      billType: 'domestic',
      domesticElectricityBill: null,
      commercialElectricityBill: null,
      peakLoad: null,
      appliances: {
        ledBulb: 0,
        tubeLight: 0,
        fan: 0,
        refrigerator: 0,
        ledTV: 0,
        pump: 0,
        ac: 0
      },
      applianceLabels: {
        ledBulb: 'LED bulb',
        tubeLight: 'Tube light',
        fan: 'Fan',
        refrigerator: 'Refrigerator',
        ledTV: 'LED TV',
        pump: 'Pump (1 kW)',
        ac: 'AC (1 ton)'
      },
      wattagePerHour: {
        ledBulb: 9,
        tubeLight: 20,
        fan: 70,
        refrigerator: 100,
        ledTV: 40,
        pump: 1000,
        ac: 1000
      },
      runningHours: {
        ledBulb: 5,
        tubeLight: 4,
        fan: 8,
        refrigerator: 8,
        ledTV: 4,
        pump: 0.5,
        ac: 6
      },
      peakWattage: {
        ledBulb: 9,
        tubeLight: 20,
        fan: 70,
        refrigerator: 120,
        ledTV: 40,
        pump: 1000,
        ac: 1500
      },
      inverterList: [],
      batteryList: []
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
        return this.billType === 'domestic'
          ? this.domesticElectricityBill
          : this.commercialElectricityBill;
      },
      set(value) {
        if (this.billType === 'domestic') this.domesticElectricityBill = value;
        else this.commercialElectricityBill = value;
      }
    },
    unitPerDay() {
      if (this.inputMethodType === 'monthly') {
        return finiteNumber(this.monthlyConsumption) / 30;
      }
      if (this.inputMethodType === 'bill') {
        const bill = finiteNumber(this.activeElectricityBill);
        const rate = this.billType === 'domestic'
          ? ELECTRICITY_RATES.DOMESTIC_RATE
          : ELECTRICITY_RATES.COMMERCIAL_RATE;
        return rate > 0 ? ((bill * 12) / 365) / rate : 0;
      }

      const wattHours = Object.keys(this.appliances).reduce((total, key) => {
        return total + this.wattagePerHour[key] * this.runningHours[key] * finiteNumber(this.appliances[key]);
      }, 0);
      return wattHours / 1000;
    },
    computedPeakLoad() {
      if (this.inputMethodType === 'appliances') {
        const watts = Object.keys(this.appliances).reduce((total, key) => {
          return total + this.peakWattage[key] * finiteNumber(this.appliances[key]);
        }, 0);
        return watts / 1000;
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
    selectedInverter() {
      if (!this.inverterList.length || this.panelCount <= 0) return null;
      const candidates = this.inverterList.filter(inverter => {
        return this.computedPeakLoad <= finiteNumber(inverter.peakLoad)
          && this.panelCount <= finiteNumber(inverter.maxPanels);
      });
      return candidates.reduce((best, item) => {
        if (!best || finiteNumber(item.cost) < finiteNumber(best.cost)) return item;
        return best;
      }, null);
    },
    batteryInfo() {
      if (!this.selectedInverter) return null;
      const supportedVoltage = finiteNumber(this.selectedInverter.batterySupported);
      if (supportedVoltage <= 0) return { selectedBattery: null, quantity: 0 };
      if (!this.batteryList.length) return null;

      const requiredEnergy = (this.unitPerDay * 3) / 5;
      const seriesFactor = supportedVoltage / 12;
      if (!Number.isInteger(seriesFactor) || seriesFactor <= 0) return null;

      let bestCombination = null;
      let bestCost = Infinity;
      this.batteryList.forEach(battery => {
        for (let parallelStrings = 1; parallelStrings <= VALIDATION_CONFIG.MAX_BATTERY_COMBINATIONS; parallelStrings += 1) {
          const quantity = seriesFactor * parallelStrings;
          const totalEnergy = finiteNumber(battery.energy) * quantity;
          if (totalEnergy >= requiredEnergy) {
            const totalCost = finiteNumber(battery.price) * quantity;
            if (totalCost < bestCost) {
              bestCost = totalCost;
              bestCombination = { selectedBattery: battery, quantity };
            }
            break;
          }
        }
      });
      return bestCombination;
    },
    costBreakdown() {
      if (!this.selectedInverter) {
        return { materialCost: 0, laborCost: 0, totalWithoutMarkup: 0, totalWithMarkup: 0 };
      }

      const panelCost = this.panelCount * COST_CONFIG.PANEL_COST_PER_PIECE;
      const inverterCost = finiteNumber(this.selectedInverter.cost);
      const batteryCost = this.batteryInfo?.selectedBattery
        ? this.batteryInfo.quantity * finiteNumber(this.batteryInfo.selectedBattery.price)
        : 0;
      const materialCost = panelCost + inverterCost + batteryCost;

      const highLabourTier = materialCost > COST_CONFIG.COST_THRESHOLD && this.panelCount > 3;
      const labourDays = highLabourTier ? COST_CONFIG.LABOR_DAYS_HIGH : COST_CONFIG.LABOR_DAYS_LOW;
      const laborCost = this.panelCount * COST_CONFIG.LABOR_COST_PER_PANEL * labourDays;
      const totalWithoutMarkup = materialCost + laborCost;

      let markupRate = COST_CONFIG.MARKUP_RATE_HIGH;
      if (materialCost <= COST_CONFIG.COST_THRESHOLD) markupRate = COST_CONFIG.MARKUP_RATE_LOW;
      else if (this.panelCount > 3) markupRate = COST_CONFIG.MARKUP_RATE_MEDIUM;

      return {
        materialCost,
        laborCost,
        totalWithoutMarkup,
        totalWithMarkup: totalWithoutMarkup * markupRate
      };
    },
    costResults() {
      return {
        totalCostWithMarkup: this.costBreakdown.totalWithMarkup,
        totalCostWithoutMarkup: this.costBreakdown.totalWithoutMarkup
      };
    },
    profitPercentage() {
      if (this.costBreakdown.totalWithoutMarkup <= 0) return 0;
      return ((this.costBreakdown.totalWithMarkup - this.costBreakdown.totalWithoutMarkup)
        / this.costBreakdown.totalWithoutMarkup) * 100;
    },
    offerPrice() {
      const discountFactor = this.profitPercentage < COST_CONFIG.PROFIT_THRESHOLD_FOR_DISCOUNT ? 0.9 : 0.8;
      return this.costBreakdown.totalWithMarkup * discountFactor;
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      await this.loadUserAccess(true);
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    formatMoney(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(finiteNumber(value));
    },
    validateInputs() {
      if (this.inputMethodType === 'monthly' && finiteNumber(this.monthlyConsumption) <= 0) {
        return 'Monthly consumption must be greater than zero.';
      }
      if (this.inputMethodType === 'bill' && finiteNumber(this.activeElectricityBill) <= 0) {
        return 'Electricity bill must be greater than zero.';
      }
      if (finiteNumber(this.peakLoad) < 0) return 'Peak load cannot be negative.';

      const quantities = Object.values(this.appliances).map(finiteNumber);
      if (quantities.some(value => value < 0 || !Number.isInteger(value))) {
        return 'Appliance quantities must be non-negative whole numbers.';
      }
      if (quantities.some(value => value > VALIDATION_CONFIG.MAX_APPLIANCE_COUNT)) {
        return `Appliance quantity cannot exceed ${VALIDATION_CONFIG.MAX_APPLIANCE_COUNT}.`;
      }
      if (this.inputMethodType === 'appliances' && quantities.reduce((sum, value) => sum + value, 0) === 0) {
        return 'Enter at least one appliance.';
      }
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('/.netlify/functions/getData', { signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load equipment data.');
        if (!Array.isArray(payload.inverters) || !Array.isArray(payload.batteries)) {
          throw new Error('Equipment data returned an invalid format.');
        }

        this.inverterList = payload.inverters.map(item => ({
          ...item,
          peakLoad: finiteNumber(item.peakLoad),
          maxPanels: finiteNumber(item.maxPanels),
          batterySupported: finiteNumber(item.batterySupported),
          cost: finiteNumber(item.cost)
        }));
        this.batteryList = payload.batteries.map(item => ({
          ...item,
          energy: finiteNumber(item.energy),
          capacity: finiteNumber(item.capacity),
          price: finiteNumber(item.price)
        }));

        if (!this.selectedInverter) throw new Error('No inverter supports the calculated panel count and peak load.');
        if (finiteNumber(this.selectedInverter.batterySupported) > 0 && !this.batteryInfo) {
          throw new Error('No battery combination can meet the calculated energy requirement.');
        }
        this.showResults = true;
      } catch (error) {
        this.errorMessage = error.name === 'AbortError'
          ? 'Equipment data request timed out. Please try again.'
          : error.message || 'Unable to calculate the system.';
      } finally {
        clearTimeout(timeoutId);
        this.loading = false;
      }
    },
    openQuotation() {
      this.$store.dispatch('updateSolerResults', {
        costWith: this.costResults.totalCostWithMarkup,
        costWithout: this.costResults.totalCostWithoutMarkup,
        materialCost: this.costBreakdown.materialCost,
        laborCost: this.costBreakdown.laborCost,
        profit: this.profitPercentage,
        special: this.offerPrice,
        panelCount: this.panelCount,
        inverter: this.selectedInverter,
        battery: this.batteryInfo
      });
      this.$router.push({ name: 'SubmitQuotation' });
    },
    resetResults() {
      this.showResults = false;
      this.errorMessage = '';
      this.inverterList = [];
      this.batteryList = [];
    }
  }
};
</script>

<style scoped>
.calculator-heading,
.calculator-alert,
.calculator-card { max-width: 980px; margin-inline: auto; }
.calculator-result-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; border: 0; background: linear-gradient(120deg, var(--ant-navy-900), var(--ant-blue-700)) !important; }
.method-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
.method-option { position: relative; display: flex; align-items: center; gap: 0.8rem; min-height: 96px; padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 12px; background: #fff; cursor: pointer; transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease; }
.method-option:hover, .method-option.active { border-color: #84adff; background: #f5f8ff; box-shadow: 0 0 0 3px rgba(41,112,255,.08); }
.method-option input { position: absolute; opacity: 0; pointer-events: none; }
.method-option__icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 10px; color: var(--ant-blue-700); background: #eff4ff; }
.method-option strong, .method-option small { display: block; }
.method-option small { margin-top: 0.2rem; color: var(--ant-slate-500); font-size: 0.75rem; }
.calculator-input-panel { padding: 1.25rem; border: 1px solid var(--ant-slate-200); border-radius: 12px; background: var(--ant-slate-50); }
.segmented-control { display: grid; grid-template-columns: repeat(2, 1fr); padding: 0.25rem; border: 1px solid var(--ant-slate-300); border-radius: 10px; background: #fff; }
.segmented-control label { padding: 0.55rem; border-radius: 7px; text-align: center; cursor: pointer; }
.segmented-control label.active { color: #fff; background: var(--ant-blue-700); }
.segmented-control input { position: absolute; opacity: 0; }
.input-help { display: flex; align-items: center; gap: 0.65rem; padding: 0.75rem; border-radius: 10px; color: var(--ant-slate-600); background: #eff4ff; font-size: 0.8rem; }
.input-help i { color: var(--ant-blue-700); }
.appliance-control { display: block; padding: 0.8rem; border: 1px solid var(--ant-slate-200); border-radius: 10px; background: #fff; }
.appliance-control span { display: block; margin-bottom: 0.45rem; color: var(--ant-slate-700); font-size: 0.82rem; font-weight: 650; }
.summary-box { position: relative; display: flex; flex-direction: column; height: 100%; padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 12px; background: var(--ant-slate-50); }
.summary-box small { color: var(--ant-slate-500); }
.summary-box strong { margin-top: 0.35rem; color: var(--ant-slate-950); font-size: 1.45rem; }
.summary-icon { display: grid; place-items: center; width: 38px; height: 38px; margin-bottom: 0.75rem; border-radius: 10px; color: var(--ant-blue-700); background: #eff4ff; }
.details-section { padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 12px; background: #fff; }
.detail-icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 10px; color: var(--ant-blue-700); background: #eff4ff; }
.price-panel { padding: 1.25rem; border: 1px solid #b2ccff; border-radius: 14px; background: linear-gradient(180deg, #f8faff, #eef4ff); }
.price-panel__total { display: block; margin-top: 0.3rem; color: var(--ant-blue-700); font-size: 1.85rem; }
.price-panel__internal { display: grid; gap: 0.55rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #b2ccff; }
.price-panel__internal div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.8rem; }
.price-panel__internal span { color: var(--ant-slate-500); }
.offer-section { padding: 1rem; border-radius: 10px; color: #fff; background: linear-gradient(120deg, var(--ant-teal-600), var(--ant-green-600)); text-align: center; }
.offer-section small, .offer-section strong { display: block; }
.offer-section strong { margin-top: 0.2rem; font-size: 1.45rem; }
@media (max-width: 767.98px) { .method-grid { grid-template-columns: 1fr; } }
</style>
