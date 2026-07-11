<template>
  <div class="solar-calculator container my-5">
    <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
    <div v-if="loading" class="alert alert-info" role="status">Loading equipment data...</div>

    <section v-if="showResults && !loading" class="result-card card shadow-sm">
      <div class="card-body">
        <h2 class="form-title">Solar Calculator Results</h2>

        <div class="row g-3">
          <div class="col-md-4">
            <div class="summary-box">
              <small>Panels required</small>
              <strong>{{ panelCount }}</strong>
            </div>
          </div>
          <div class="col-md-4">
            <div class="summary-box">
              <small>Daily energy</small>
              <strong>{{ unitPerDay.toFixed(2) }} kWh</strong>
            </div>
          </div>
          <div class="col-md-4">
            <div class="summary-box">
              <small>Peak load</small>
              <strong>{{ computedPeakLoad.toFixed(2) }} kW</strong>
            </div>
          </div>
        </div>

        <div class="details-section mt-4">
          <h5>Inverter</h5>
          <div v-if="selectedInverter">
            <p class="mb-1"><strong>{{ selectedInverter.name }}</strong></p>
            <p class="mb-1">Capacity: {{ selectedInverter.peakLoad }} KVA</p>
            <p class="mb-0">Cost: Rs {{ formatMoney(selectedInverter.cost) }}</p>
          </div>
        </div>

        <div class="details-section mt-3">
          <h5>Battery</h5>
          <div v-if="batteryInfo && batteryInfo.selectedBattery">
            <p class="mb-1"><strong>{{ batteryInfo.selectedBattery.name }}</strong></p>
            <p class="mb-1">Capacity: {{ batteryInfo.selectedBattery.capacity }} AH</p>
            <p class="mb-0">Quantity: {{ batteryInfo.quantity }}</p>
          </div>
          <p v-else class="mb-0 text-muted">No battery required for the selected inverter.</p>
        </div>

        <hr />
        <p><strong>Estimated installed cost:</strong> Rs {{ formatMoney(costResults.totalCostWithMarkup) }}</p>
        <div v-if="userRole === 'admin'">
          <p><strong>Equipment cost:</strong> Rs {{ formatMoney(costBreakdown.materialCost) }}</p>
          <p><strong>Installation/labour:</strong> Rs {{ formatMoney(costBreakdown.laborCost) }}</p>
          <p><strong>Cost before profit:</strong> Rs {{ formatMoney(costResults.totalCostWithoutMarkup) }}</p>
          <p><strong>Markup:</strong> {{ profitPercentage.toFixed(2) }}%</p>
        </div>

        <div class="offer-section text-center my-4">
          <div>Special offer price</div>
          <strong>Rs {{ formatMoney(offerPrice) }}</strong>
        </div>

        <p class="small text-muted">
          Actual cost may change after a site survey or when the supplied consumption/load information is inaccurate.
        </p>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-success flex-grow-1" @click="openQuotation">
            {{ userRole === 'admin' ? 'Generate Quotation' : 'Send This Requirement' }}
          </button>
          <button class="btn btn-secondary flex-grow-1" @click="resetResults">Regenerate</button>
        </div>
      </div>
    </section>

    <form v-else-if="!loading" @submit.prevent="submitForm" class="solar-form card shadow-sm">
      <div class="card-body">
        <div class="brand-logo text-center">
          <img :src="logo" alt="ANT Solar" />
        </div>
        <h2 class="form-title">Solar Calculator</h2>

        <fieldset class="mb-4">
          <legend class="form-label">Choose input method</legend>
          <div class="radio-grid">
            <label><input type="radio" v-model="inputMethodType" value="monthly" /> Monthly units</label>
            <label><input type="radio" v-model="inputMethodType" value="bill" /> Electricity bill</label>
            <label><input type="radio" v-model="inputMethodType" value="appliances" /> Appliances</label>
          </div>
        </fieldset>

        <div v-if="inputMethodType === 'monthly'" class="mb-3">
          <label for="monthlyConsumption" class="form-label">Monthly consumption (kWh)</label>
          <input
            v-model.number="monthlyConsumption"
            type="number"
            min="0.01"
            step="0.01"
            class="form-control"
            id="monthlyConsumption"
            required
          />
        </div>

        <div v-else-if="inputMethodType === 'bill'">
          <div class="mb-3">
            <label class="form-label">Bill type</label>
            <div class="d-flex gap-4">
              <label><input type="radio" v-model="billType" value="domestic" /> Domestic</label>
              <label><input type="radio" v-model="billType" value="commercial" /> Commercial</label>
            </div>
          </div>
          <div class="mb-3">
            <label for="electricityBill" class="form-label">Average monthly bill (Rs)</label>
            <input
              v-model.number="activeElectricityBill"
              type="number"
              min="0.01"
              step="0.01"
              class="form-control"
              id="electricityBill"
              required
            />
          </div>
        </div>

        <div v-else class="mb-3">
          <label class="form-label">Appliance quantities</label>
          <div class="row g-2">
            <div v-for="(label, key) in applianceLabels" :key="key" class="col-sm-6">
              <div class="input-group">
                <span class="input-group-text appliance-label">{{ label }}</span>
                <input
                  v-model.number="appliances[key]"
                  type="number"
                  min="0"
                  :max="maxApplianceCount"
                  step="1"
                  class="form-control"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="inputMethodType !== 'appliances'" class="mb-3">
          <label for="peakLoad" class="form-label">Peak load in ampere <span class="text-muted">(optional)</span></label>
          <input
            v-model.number="peakLoad"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
            id="peakLoad"
          />
        </div>

        <button type="submit" class="btn btn-primary w-100">Calculate</button>
      </div>
    </form>
  </div>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { getUserRole } from '@/utils/firebaseHelpers';
import { COST_CONFIG, ELECTRICITY_RATES, VALIDATION_CONFIG } from '@/constants/calculationConstants';

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'SolerCalculator',
  data() {
    return {
      currentUser: null,
      userRole: null,
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
      batteryList: [],
      logo: require('@/assets/logo.png')
    };
  },
  computed: {
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
      this.userRole = user ? await getUserRole(user.uid) : null;
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
.solar-calculator {
  max-width: 850px;
}
.form-title {
  text-align: center;
  margin-bottom: 1.5rem;
}
.brand-logo img {
  width: 110px;
  height: auto;
  margin-bottom: 1rem;
}
.radio-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
}
.summary-box,
.details-section,
.offer-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}
.summary-box {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.summary-box strong,
.offer-section strong {
  font-size: 1.45rem;
  color: #0d6efd;
}
.appliance-label {
  min-width: 125px;
}
</style>
