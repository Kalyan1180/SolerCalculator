<template>
  <div class="calculator-container container my-5">
    <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

    <div v-if="loading" class="text-center my-5" aria-live="polite">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading solar product data...</p>
    </div>

    <section v-else-if="showResults" class="result-card">
      <h2 class="form-title">Solar Calculator Results</h2>

      <div class="details-section">
        <p><strong>Daily Energy Requirement:</strong> {{ unitPerDay.toFixed(2) }} kWh</p>
        <p><strong>Estimated Peak Load:</strong> {{ computedPeakLoad.toFixed(2) }} kW</p>
        <p><strong>No. of Panels Required:</strong> {{ panelCount }}</p>
      </div>

      <div class="details-section">
        <h5>Inverter</h5>
        <ul v-if="selectedInverter" class="details-list">
          <li><strong>Name:</strong> {{ selectedInverter.name }}</li>
          <li><strong>Peak Load:</strong> {{ selectedInverter.peakLoad }} KVA</li>
          <li><strong>Max Panels:</strong> {{ selectedInverter.maxPanels }}</li>
          <li><strong>Battery Voltage:</strong> {{ selectedInverter.batterySupported }} V</li>
          <li><strong>Cost:</strong> ₹{{ formatCurrency(selectedInverter.cost) }}</li>
        </ul>
      </div>

      <div class="details-section">
        <h5>Battery</h5>
        <ul v-if="batteryInfo" class="details-list">
          <li><strong>Name:</strong> {{ batteryInfo.selectedBattery.name }}</li>
          <li><strong>Capacity:</strong> {{ batteryInfo.selectedBattery.capacity }} AH</li>
          <li><strong>Quantity:</strong> {{ batteryInfo.quantity }}</li>
          <li><strong>Price Each:</strong> ₹{{ formatCurrency(batteryInfo.selectedBattery.price) }}</li>
        </ul>
      </div>

      <div class="details-section cost-section">
        <p><strong>Estimated Installed Price:</strong> ₹{{ formatCurrency(costResults.totalCostWithMarkup) }}</p>
        <template v-if="userRole === 'admin'">
          <p><strong>Estimated Internal Cost:</strong> ₹{{ formatCurrency(costResults.totalCostWithoutMarkup) }}</p>
          <p><strong>Gross Markup:</strong> {{ profitPercentage.toFixed(2) }}%</p>
        </template>
        <div class="offer-section">
          <span>Special Offer Price</span>
          <strong>₹{{ formatCurrency(offerPrice) }}</strong>
        </div>
      </div>

      <p class="text-muted small">
        Actual price may change after site survey, product availability, wiring distance and installation conditions are verified.
      </p>

      <div class="d-flex gap-2">
        <button type="button" class="btn btn-success flex-fill" @click="continueToQuotation">
          {{ userRole === 'admin' ? 'Generate Quotation' : 'Send This Requirement' }}
        </button>
        <button type="button" class="btn btn-secondary flex-fill" @click="resetResults">Recalculate</button>
      </div>
    </section>

    <form v-else @submit.prevent="submitForm" class="solar-form">
      <div class="brand-logo">
        <img :src="logo" alt="ANT Solar">
      </div>
      <h2 class="form-title">Solar Calculator</h2>

      <fieldset class="form-group">
        <legend class="form-label">Choose Input Method</legend>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" v-model="inputMethodType" value="monthly">
            <span>Monthly Unit Consumption</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="inputMethodType" value="bill">
            <span>Electricity Bill</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="inputMethodType" value="appliances">
            <span>Appliance List</span>
          </label>
        </div>
      </fieldset>

      <div v-if="inputMethodType === 'monthly'">
        <div class="form-group">
          <label for="monthlyConsumption" class="form-label">Monthly Unit Consumption (kWh)</label>
          <input v-model.number="monthlyConsumption" type="number" class="form-control" id="monthlyConsumption" min="0.01" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="monthlyPeakLoad" class="form-label">Peak Load in Amp <span class="optional">(optional)</span></label>
          <input v-model.number="peakLoad" type="number" class="form-control" id="monthlyPeakLoad" min="0" step="0.01">
        </div>
      </div>

      <div v-else-if="inputMethodType === 'bill'">
        <fieldset class="form-group">
          <legend class="form-label">Electricity Bill Type</legend>
          <div class="radio-group secondary-radio">
            <label class="radio-option"><input type="radio" v-model="billType" value="domestic"><span>Domestic</span></label>
            <label class="radio-option"><input type="radio" v-model="billType" value="commercial"><span>Commercial</span></label>
          </div>
        </fieldset>
        <div class="form-group">
          <label for="electricityBill" class="form-label">Monthly Electricity Bill (₹)</label>
          <input v-model.number="electricityBill" type="number" class="form-control" id="electricityBill" min="0.01" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="billPeakLoad" class="form-label">Peak Load in Amp <span class="optional">(optional)</span></label>
          <input v-model.number="peakLoad" type="number" class="form-control" id="billPeakLoad" min="0" step="0.01">
        </div>
      </div>

      <div v-else>
        <p class="form-label">Enter Number of Appliances</p>
        <div v-for="(value, key) in appliances" :key="key" class="form-group appliance-group">
          <label :for="`appliance-${key}`" class="form-label">{{ applianceLabels[key] }}</label>
          <input
            v-model.number="appliances[key]"
            type="number"
            class="form-control"
            :id="`appliance-${key}`"
            min="0"
            :max="maxApplianceCount"
            step="1"
          >
        </div>
      </div>

      <button type="submit" class="btn btn-primary w-100">Calculate</button>
    </form>
  </div>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { getUserRole } from '@/utils/firebaseHelpers';
import { COST_CONFIG, ELECTRICITY_RATES, VALIDATION_CONFIG } from '@/constants/calculationConstants';

const PANEL_RANGES = [
  { maxUnits: 2, panels: 1 },
  { maxUnits: 5, panels: 2 },
  { maxUnits: 7, panels: 3 },
  { maxUnits: 12, panels: 4 },
  { maxUnits: 18, panels: 6 },
  { maxUnits: 24, panels: 8 }
];

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
      electricityBill: null,
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
      logo: require('@/assets/logo.png'),
      applianceLabels: {
        ledBulb: 'LED Bulb',
        tubeLight: 'Tube Light',
        fan: 'Fan',
        refrigerator: 'Refrigerator',
        ledTV: 'LED TV',
        pump: 'Submersible Pump (1 kW)',
        ac: 'AC (1 Ton)'
      },
      inverterList: [],
      batteryList: [],
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
      }
    };
  },
  computed: {
    maxApplianceCount() {
      return VALIDATION_CONFIG.MAX_APPLIANCE_COUNT;
    },
    unitPerDay() {
      if (this.inputMethodType === 'monthly') {
        return Number(this.monthlyConsumption) > 0 ? Number(this.monthlyConsumption) / 30 : 0;
      }
      if (this.inputMethodType === 'bill') {
        const rate = this.billType === 'commercial' ? ELECTRICITY_RATES.COMMERCIAL_RATE : ELECTRICITY_RATES.DOMESTIC_RATE;
        return Number(this.electricityBill) > 0 ? ((Number(this.electricityBill) * 12) / 365) / rate : 0;
      }
      return Object.keys(this.appliances).reduce((total, key) => {
        return total + this.wattagePerHour[key] * this.runningHours[key] * (Number(this.appliances[key]) || 0);
      }, 0) / 1000;
    },
    computedPeakLoad() {
      if (this.inputMethodType === 'appliances') {
        return Object.keys(this.appliances).reduce((total, key) => {
          return total + this.peakWattage[key] * (Number(this.appliances[key]) || 0);
        }, 0) / 1000;
      }
      return Number(this.peakLoad) > 0 ? (Number(this.peakLoad) * 220) / 1000 : 0;
    },
    panelCount() {
      const match = PANEL_RANGES.find((range) => this.unitPerDay > 0 && this.unitPerDay <= range.maxUnits);
      return match ? match.panels : 0;
    },
    selectedInverter() {
      if (!this.panelCount) return null;
      const suitable = this.inverterList.filter((inverter) => {
        return Number(inverter.peakLoad) >= this.computedPeakLoad && Number(inverter.maxPanels) >= this.panelCount;
      });
      return suitable.sort((a, b) => Number(a.cost) - Number(b.cost))[0] || null;
    },
    batteryInfo() {
      if (!this.selectedInverter || !this.batteryList.length) return null;
      const energyRequired = (this.unitPerDay * 3) / 5;
      const voltage = Number(this.selectedInverter.batterySupported);
      const seriesFactor = voltage / 12;
      if (!Number.isInteger(seriesFactor) || seriesFactor < 1) return null;

      let bestCombination = null;
      this.batteryList.forEach((battery) => {
        const batteryEnergy = Number(battery.energy);
        const batteryPrice = Number(battery.price);
        if (!(batteryEnergy > 0) || !(batteryPrice >= 0)) return;

        for (let parallelStrings = 1; parallelStrings <= VALIDATION_CONFIG.MAX_BATTERY_COMBINATIONS; parallelStrings += 1) {
          const quantity = seriesFactor * parallelStrings;
          if (batteryEnergy * quantity >= energyRequired) {
            const totalCost = batteryPrice * quantity;
            if (!bestCombination || totalCost < bestCombination.totalCost) {
              bestCombination = { selectedBattery: battery, quantity, totalCost };
            }
            break;
          }
        }
      });
      return bestCombination;
    },
    costResults() {
      if (!this.selectedInverter || !this.batteryInfo) {
        return { totalCostWithMarkup: 0, totalCostWithoutMarkup: 0 };
      }

      const materialCost =
        this.panelCount * COST_CONFIG.PANEL_COST_PER_PIECE +
        Number(this.selectedInverter.cost) +
        this.batteryInfo.totalCost;

      let laborDays = COST_CONFIG.LABOR_DAYS_LOW;
      let markupRate = COST_CONFIG.MARKUP_RATE_LOW;
      if (materialCost > COST_CONFIG.COST_THRESHOLD && this.panelCount > 3) {
        laborDays = COST_CONFIG.LABOR_DAYS_HIGH;
        markupRate = COST_CONFIG.MARKUP_RATE_MEDIUM;
      } else if (materialCost > COST_CONFIG.COST_THRESHOLD) {
        markupRate = COST_CONFIG.MARKUP_RATE_HIGH;
      }

      const laborCost = this.panelCount * COST_CONFIG.LABOR_COST_PER_PANEL * laborDays;
      const totalCostWithoutMarkup = materialCost + laborCost;
      return {
        totalCostWithoutMarkup,
        totalCostWithMarkup: totalCostWithoutMarkup * markupRate
      };
    },
    profitPercentage() {
      const internalCost = this.costResults.totalCostWithoutMarkup;
      return internalCost > 0
        ? ((this.costResults.totalCostWithMarkup - internalCost) / internalCost) * 100
        : 0;
    },
    offerPrice() {
      const discountFactor = this.profitPercentage < COST_CONFIG.PROFIT_THRESHOLD_FOR_DISCOUNT ? 0.9 : 0.8;
      return Math.max(this.costResults.totalCostWithoutMarkup, this.costResults.totalCostWithMarkup * discountFactor);
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      this.userRole = user ? await getUserRole(user.uid) : null;
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    formatCurrency(value) {
      const number = Number(value);
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
    },
    validateInputs() {
      if (this.inputMethodType === 'monthly' && !(Number(this.monthlyConsumption) > 0)) {
        throw new Error('Monthly unit consumption must be greater than zero.');
      }
      if (this.inputMethodType === 'bill' && !(Number(this.electricityBill) > 0)) {
        throw new Error('Monthly electricity bill must be greater than zero.');
      }
      if (Number(this.peakLoad) < 0) throw new Error('Peak load cannot be negative.');

      const quantities = Object.values(this.appliances).map((value) => Number(value) || 0);
      if (quantities.some((value) => value < 0 || !Number.isInteger(value))) {
        throw new Error('Appliance quantities must be whole positive numbers.');
      }
      if (quantities.some((value) => value > VALIDATION_CONFIG.MAX_APPLIANCE_COUNT)) {
        throw new Error(`Appliance quantity cannot exceed ${VALIDATION_CONFIG.MAX_APPLIANCE_COUNT}.`);
      }
      if (this.inputMethodType === 'appliances' && quantities.every((value) => value === 0)) {
        throw new Error('Enter at least one appliance.');
      }
      if (this.unitPerDay > 24) {
        throw new Error('This calculator currently supports up to 24 kWh per day. Please request a custom quotation.');
      }
    },
    async loadProductData() {
      const response = await fetch('/.netlify/functions/getData');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load inverter and battery data.');
      if (!Array.isArray(data.inverters) || !Array.isArray(data.batteries)) {
        throw new Error('Product data returned by the server is invalid.');
      }

      this.inverterList = data.inverters
        .map((item) => ({
          ...item,
          peakLoad: Number(item.peakLoad),
          maxPanels: Number(item.maxPanels),
          batterySupported: Number(item.batterySupported),
          cost: Number(item.cost)
        }))
        .filter((item) => item.name && Number.isFinite(item.peakLoad) && Number.isFinite(item.maxPanels) && Number.isFinite(item.cost));

      this.batteryList = data.batteries
        .map((item) => ({
          ...item,
          energy: Number(item.energy),
          capacity: Number(item.capacity),
          price: Number(item.price)
        }))
        .filter((item) => item.name && Number.isFinite(item.energy) && item.energy > 0 && Number.isFinite(item.price));
    },
    async submitForm() {
      this.errorMessage = '';
      this.loading = true;
      try {
        this.validateInputs();
        await this.loadProductData();
        if (!this.panelCount) throw new Error('No panel recommendation is available for this requirement.');
        if (!this.selectedInverter) throw new Error('No inverter supports the calculated panel count and peak load.');
        if (!this.batteryInfo) throw new Error('No battery combination satisfies the calculated backup requirement.');
        this.showResults = true;
      } catch (error) {
        console.error('Calculator error:', error);
        this.errorMessage = error.message || 'Unable to calculate the solar requirement.';
      } finally {
        this.loading = false;
      }
    },
    continueToQuotation() {
      if (!this.currentUser) {
        this.$router.push({ name: 'LoginPage', query: { redirect: '/submit-quotation' } });
        return;
      }
      this.$store.dispatch('updateSolerResults', {
        costWith: this.costResults.totalCostWithMarkup,
        costWithout: this.costResults.totalCostWithoutMarkup,
        profit: this.profitPercentage,
        special: this.offerPrice,
        panelCount: this.panelCount,
        inverter: this.selectedInverter,
        battery: {
          selectedBattery: this.batteryInfo.selectedBattery,
          quantity: this.batteryInfo.quantity
        }
      });
      this.$router.push({ name: 'SubmitQuotation' });
    },
    resetResults() {
      this.showResults = false;
      this.errorMessage = '';
    }
  }
};
</script>

<style scoped>
.calculator-container { max-width: 540px; }
.solar-form,
.result-card { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.1); }
.brand-logo { text-align: center; margin-bottom: 12px; }
.brand-logo img { max-width: 110px; height: auto; }
.form-title { text-align: center; margin-bottom: 24px; color: #1f4b3f; }
.form-group { margin-bottom: 18px; }
.form-label { font-weight: 600; }
.radio-group { display: grid; gap: 10px; }
.secondary-radio { grid-template-columns: 1fr 1fr; }
.radio-option { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; }
.optional { font-weight: 400; color: #6c757d; }
.details-section { background: #f8f9fa; padding: 16px; margin-bottom: 16px; border-radius: 8px; }
.details-list { margin-bottom: 0; padding-left: 20px; }
.cost-section { border-left: 4px solid #198754; }
.offer-section { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #eaf8ef; border-radius: 8px; font-size: 1.1rem; }
</style>
