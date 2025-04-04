<template>
  <div class="container mt-5">
    <!-- Global error message -->
    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <!-- Loader indicator -->
    <div v-if="loading" class="loader">
      Loading data, please wait...
    </div>

    <!-- Results view -->
    <div v-else-if="showResults">
      <div class="result-container">
        <h2 class="form-title">Solar Calculator Results</h2>
        <div class="result-info">
          <p>
            <strong>No. of Panels Required:</strong>
            <span v-if="panelCount > 0">{{ panelCount }}</span>
            <span v-else>No panels required (check your input)</span>
          </p>

          <!-- Inverter Details -->
          <div class="details-section">
            <p class="section-title">Inverter Details:</p>
            <ul class="details-list" v-if="selectedInverter">
              <li><strong>Name:</strong> {{ selectedInverter.name }}</li>
              <li><strong>Peak Load:</strong> {{ selectedInverter.peakLoad }} KVA</li>
              <li><strong>Max Panels Supported:</strong> {{ selectedInverter.maxPanels }}</li>
              <li><strong>Battery Supported:</strong> {{ selectedInverter.batterySupported }} Volt</li>
              <li><strong>Inverter Cost:</strong> Rs: {{ selectedInverter.cost }}</li>
            </ul>
            <p v-else>No suitable inverter found. Please adjust your input.</p>
          </div>

          <!-- Battery Details -->
          <div class="details-section">
            <p class="section-title">Battery Details:</p>
            <ul class="details-list" v-if="batteryInfo">
              <li><strong>Name:</strong> {{ batteryInfo.selectedBattery.name }}</li>
              <li><strong>Capacity:</strong> {{ batteryInfo.selectedBattery.capacity }} AH</li>
              <li><strong>Quantity:</strong> {{ batteryInfo.quantity }}</li>
              <li><strong>Price (each):</strong> Rs: {{ batteryInfo.selectedBattery.price }}</li>
            </ul>
            <p v-else>No suitable battery found. Please adjust your input.</p>
          </div>

          <!-- Cost Calculations -->
          <p>
            <strong>Estimated Cost with installation:</strong>
            <span class="actual-price">Rs: {{ costResults.totalCostWithMarkup.toFixed(0) }}</span>
          </p>
          <!-- These lines show only if the user is an admin -->
      <div v-if="userRole === 'admin'">
        <p>
          <strong>Estimated Cost without profit:</strong>
          Rs: {{ costResults.totalCostWithoutMarkup.toFixed(0) }}
        </p>
        <p>
          <strong>Profit Percentage (%):</strong>
          {{ profitPercentage.toFixed(2) }}
        </p>
      </div>
          
          <!-- Special Offer Section -->
          <div class="offer-section">
            <p class="offer-title">Special Offer Price</p>
            <p class="offer-display">
              <span class="special-price">Rs: {{ offerPrice.toFixed(0) }}</span>
            </p>
          </div>
          <!-- Disclaimer -->
          <p class="offer-disclaimer">
            * Actual cost may occasionally differ after site survey by ANT team or in case of any wrong input.
          </p>
        </div>
        <button @click="goBack" class="btn btn-secondary btn-block">Back</button>
      </div>
    </div>
    
    <!-- Input Form view -->
    <form v-else @submit.prevent="submitForm" class="solar-form">
      <div class="brand-logo">
        <img :src="logo" alt="Ant Soler" />
      </div>
      <h2 class="form-title">Solar Calculator</h2>

      <!-- Choose Input Method -->
      <div class="form-group">
        <label class="form-label">Choose Input Method:</label>
        <div class="radio-group main-radio">
          <label class="radio-option">
            <input type="radio" v-model="inputMethodType" value="monthly" />
            <span>Monthly Unit Consumption (KWH)</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="inputMethodType" value="bill" />
            <span>Electricity Bill</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="inputMethodType" value="appliances" />
            <span>Enter Number of Appliances</span>
          </label>
        </div>
      </div>

      <!-- Monthly Consumption Inputs -->
      <div v-if="inputMethodType === 'monthly'">
        <div class="form-group">
          <label for="monthlyConsumption" class="form-label">
            Monthly Unit Consumption (KWH):
          </label>
          <input v-model.number="monthlyConsumption" type="number" class="form-control" id="monthlyConsumption" />
        </div>
        <div class="form-group">
          <label for="peakLoad" class="form-label">
            Peak Load Amp: <span class="optional">(Optional)</span>
          </label>
          <input v-model.number="peakLoad" type="number" class="form-control" id="peakLoad" placeholder="Leave blank if unknown" />
        </div>
      </div>

      <!-- Electricity Bill Inputs -->
      <div v-else-if="inputMethodType === 'bill'">
        <div class="form-group">
          <label class="form-label">Electricity Bill Type:</label>
          <div class="radio-group secondary-radio">
            <label class="radio-option">
              <input type="radio" v-model="billType" value="domestic" />
              <span>Domestic</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="billType" value="commercial" />
              <span>Commercial</span>
            </label>
          </div>
        </div>
        <div class="form-group" v-if="billType === 'domestic'">
          <label for="domesticElectricityBill" class="form-label">
            Monthly Domestic Bill:
          </label>
          <input v-model.number="domesticElectricityBill" type="number" class="form-control" id="domesticElectricityBill" />
        </div>
        <div class="form-group" v-if="billType === 'commercial'">
          <label for="commercialElectricityBill" class="form-label">
            Monthly Commercial Bill:
          </label>
          <input v-model.number="commercialElectricityBill" type="number" class="form-control" id="commercialElectricityBill" />
        </div>
        <div class="form-group">
          <label for="peakLoad" class="form-label">
            Peak Load Amp: <span class="optional">(Optional)</span>
          </label>
          <input v-model.number="peakLoad" type="number" class="form-control" id="peakLoad" placeholder="Leave blank if unknown" />
        </div>
      </div>

      <!-- Appliances Inputs -->
      <div v-else-if="inputMethodType === 'appliances'">
        <p class="form-label">Enter Number of Appliances:</p>
        <div v-for="(value, key) in appliances" :key="key" class="appliance-group">
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text">
                {{ key === "pump" ? "Submersible Pump (1kw)" : applianceLabels[key] }}
              </span>
            </div>
            <input v-model.number="appliances[key]" type="number" class="form-control" />
          </div>
        </div>
      </div>

      <!-- Calculate Button -->
      <button type="submit" class="btn btn-primary btn-block">Calculate</button>
    </form>
  </div>
</template>

<script>
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import { getUserRole } from "@/utils/firebaseHelpers";

export default {
  name: "SolerCalculator",
  data() {
    return {
      currentUser: null,
      userRole: null,
      showResults: false,
      loading: false,
      errorMessage: "",
      inputMethodType: "monthly", // "monthly", "bill", or "appliances"
      monthlyConsumption: null,
      billType: "domestic",
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
        ac: 0,
      },
      logo: require("@/assets/logo.png"),
      applianceLabels: {
        ledBulb: "LED Bulb",
        tubeLight: "Tube Light",
        fan: "Fan",
        refrigerator: "Refrigerator",
        ledTV: "LED TV",
        pump: "Pump (1kW)",
        ac: "AC (1Ton)",
      },
      panelCostPerPiece: 15000,
      inverterList: [],
      batteryList: [],
      wattagePerHour: {
        ledBulb: 9,
        tubeLight: 20,
        fan: 70,
        refrigerator: 100,
        ledTV: 40,
        pump: 1000,
        ac: 1000,
      },
      runningHours: {
        ledBulb: 5,
        tubeLight: 4,
        fan: 8,
        refrigerator: 8,
        ledTV: 4,
        pump: 0.5,
        ac: 6,
      },
      peakWattage: {
        ledBulb: 9,
        tubeLight: 20,
        fan: 70,
        refrigerator: 120,
        ledTV: 40,
        pump: 1000,
        ac: 1500,
      },
    };
  },
  created() {
      const authInstance = getAuth();
      onAuthStateChanged(authInstance, async (user) => {
        this.currentUser = user;
        if (user) {
          await this.fetchUserRole(user.uid);
        }
      });
    },
  computed: {
    unitPerDay() {
      if (this.inputMethodType === "monthly") {
        return this.monthlyConsumption != null && this.monthlyConsumption > 0
          ? this.monthlyConsumption / 30
          : 0;
      } else if (this.inputMethodType === "bill") {
        if (this.billType === "domestic") {
          return this.domesticElectricityBill != null && this.domesticElectricityBill > 0
            ? ((this.domesticElectricityBill * 12) / 365) / 6.5
            : 0;
        } else if (this.billType === "commercial") {
          return this.commercialElectricityBill != null && this.commercialElectricityBill > 0
            ? ((this.commercialElectricityBill * 12) / 365) / 10
            : 0;
        }
      } else if (this.inputMethodType === "appliances") {
        let total = 0;
        for (let key in this.appliances) {
          total += this.wattagePerHour[key] * this.runningHours[key] * this.appliances[key];
        }
        return Math.round((total / 1000) * 100) / 100;
      }
      return 0;
    },
    computedPeakLoad() {
      if (this.inputMethodType === "appliances") {
        let total = 0;
        for (let key in this.appliances) {
          total += this.peakWattage[key] * this.appliances[key];
        }
        return Math.round((total / 1000) * 100) / 100;
      } else {
        return this.peakLoad != null && this.peakLoad > 0
          ? (this.peakLoad * 220) / 1000
          : 0;
      }
    },
    panelCount() {
      const units = this.unitPerDay;
      if (units > 0 && units <= 2) return 1;
      else if (units > 2 && units <= 5) return 2;
      else if (units > 5 && units <= 7) return 3;
      else if (units > 7 && units <= 12) return 4;
      else if (units > 12 && units <= 18) return 6;
      else if (units > 18 && units <= 24) return 8;
      else return 0;
    },
    selectedInverter() {
      if (!this.inverterList.length) return null;
      const filtered = this.inverterList.filter(
        (inv) => this.computedPeakLoad <= inv.peakLoad && this.panelCount <= inv.maxPanels
      );
      if (filtered.length === 0 || this.panelCount === 0) return null;
      return filtered.reduce((prev, curr) => (curr.cost < prev.cost ? curr : prev));
    },
    batteryInfo() {
      if (!this.selectedInverter || !this.batteryList.length) return null;
      const energyRequired = (this.unitPerDay * 3) / 5;
      if (this.selectedInverter.batterySupported === 0 || energyRequired === 0) return null;
      const factor = this.selectedInverter.batterySupported / 12;
      let bestCost = Infinity;
      let bestCombo = null;
      this.batteryList.forEach(battery => {
        for (let k = 1; k <= 10; k++) {
          const quantity = factor * k;
          const totalEnergy = battery.energy * quantity;
          if (totalEnergy >= energyRequired) {
            const totalCost = battery.price * quantity;
            if (totalCost < bestCost) {
              bestCost = totalCost;
              bestCombo = { selectedBattery: battery, quantity: quantity };
            }
            break;
          }
        }
      });
      return bestCombo;
    },
    costResults() {
      if (!this.selectedInverter) return { totalCostWithMarkup: 0, totalCostWithoutMarkup: 0 };
      const panelCost = this.panelCount * this.panelCostPerPiece;
      const inverterCost = this.selectedInverter ? this.selectedInverter.cost : 0;
      const batteryCost = this.batteryInfo ? this.batteryInfo.quantity * this.batteryInfo.selectedBattery.price : 0;
      const totalWithoutTax = panelCost + inverterCost + batteryCost;
      let totalWithMarkup = 0, totalWithoutMarkup = 0;
      if (totalWithoutTax < 50000) {
        totalWithMarkup = (totalWithoutTax + this.panelCount * 500 * 8) * 1.15;
        totalWithoutMarkup = totalWithoutTax + this.panelCount * 500 * 8;
      } else if (this.panelCount > 3 && totalWithoutTax > 50000) {
        totalWithMarkup = (totalWithoutTax + this.panelCount * 500 * 12) * 1.4;
        totalWithoutMarkup = totalWithoutTax + this.panelCount * 500 * 12;
      } else {
        totalWithMarkup = (totalWithoutTax + this.panelCount * 500 * 8) * 1.5;
        totalWithoutMarkup = totalWithoutTax + this.panelCount * 500 * 8;
      }
      return { totalCostWithMarkup: totalWithMarkup, totalCostWithoutMarkup: totalWithoutMarkup };
    },
    profitPercentage() {
      const { totalCostWithMarkup, totalCostWithoutMarkup } = this.costResults;
      if (totalCostWithoutMarkup === 0) return 0;
      return ((totalCostWithMarkup - totalCostWithoutMarkup) / totalCostWithoutMarkup) * 100;
    },
    // Offer price: 10% discount if profit < 30%, else 20%
    offerPrice() {
      const discountFactor = this.profitPercentage < 30 ? 0.9 : 0.8;
      return this.costResults.totalCostWithMarkup * discountFactor;
    },
  },
  methods: {
    async fetchUserRole(uid) {
        const role = await getUserRole(uid);
        this.userRole = role;
      },
    async submitForm() {
      this.errorMessage = "";
      this.loading = true;
      if (
        (this.domesticElectricityBill != null && this.domesticElectricityBill < 0) ||
        (this.commercialElectricityBill != null && this.commercialElectricityBill < 0) ||
        Object.values(this.appliances).some(val => val < 0)
      ) {
        this.errorMessage = "Please enter valid positive values.";
        this.loading = false;
        return;
      }
      if (this.inputMethodType === "monthly") {
        if (this.monthlyConsumption == null) {
          this.errorMessage = "Please provide Monthly Unit Consumption.";
          this.loading = false;
          return;
        }
      } else if (this.inputMethodType === "bill") {
        if (this.billType === "domestic") {
          if (this.domesticElectricityBill == null) {
            this.errorMessage = "Please provide Domestic Bill.";
            this.loading = false;
            return;
          }
        } else if (this.billType === "commercial") {
          if (this.commercialElectricityBill == null) {
            this.errorMessage = "Please provide Commercial Bill.";
            this.loading = false;
            return;
          }
        }
      } else if (this.inputMethodType === "appliances") {
        const totalAppliances = Object.values(this.appliances).reduce((acc, val) => acc + val, 0);
        if (totalAppliances === 0) {
          this.errorMessage = "Please enter at least one appliance quantity.";
          this.loading = false;
          return;
        }
      }
      try {
        const response = await fetch("/.netlify/functions/getData");
        if (!response.ok) throw new Error("Network response was not ok");
        const { inverters, batteries } = await response.json();
        this.inverterList = inverters.map(inv => ({
          ...inv,
          peakLoad: Number(inv.peakLoad),
          maxPanels: Number(inv.maxPanels),
          batterySupported: Number(inv.batterySupported),
          cost: Number(inv.cost)
        }));
        this.batteryList = batteries.map(bat => ({
          ...bat,
          energy: Number(bat.energy),
          capacity: Number(bat.capacity),
          price: Number(bat.price)
        }));
      } catch (error) {
        console.error("Error fetching backend data:", error);
        this.errorMessage = "Error fetching data from backend. Please try again.";
        this.loading = false;
        return;
      }
      if (!this.selectedInverter || !this.batteryInfo) {
        this.errorMessage = "No suitable inverter or battery combination found. Please adjust your input.";
        this.loading = false;
        return;
      }
      this.loading = false;
      this.showResults = true;
    },
    goBack() {
      this.showResults = false;
      this.errorMessage = "";
      this.monthlyConsumption = null;
      this.billType = "domestic";
      this.inputMethodType = "monthly";
      this.peakLoad = null;
      this.domesticElectricityBill = null;
      this.commercialElectricityBill = null;
      this.appliances = {
        ledBulb: 0,
        tubeLight: 0,
        fan: 0,
        refrigerator: 0,
        ledTV: 0,
        pump: 0,
        ac: 0,
      };
    },
  },
};
</script>

<style scoped>
.container {
  max-width: 400px;
  margin: auto;
  padding: 15px;
}

/* Desktop adjustments */
@media (min-width: 768px) {
  .container {
    max-width: 800px;
  }
  .radio-group.main-radio {
    flex-direction: row;
    align-items: center;
    gap: 20px;
  }
  .radio-group.secondary-radio {
    flex-direction: row;
    align-items: center;
    gap: 20px;
  }
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .radio-group.main-radio {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  .radio-group.secondary-radio {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
}

.solar-form,
.result-container {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.brand-logo {
  text-align: center;
  margin-bottom: 20px;
}
.brand-logo img {
  max-width: 100px;
  height: auto;
}
.form-title {
  text-align: center;
  color: #007bff;
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 20px;
}
.form-label {
  font-weight: bold;
}
.radio-group {
  display: flex;
  margin-top: 10px;
}
.radio-option {
  font-size: 16px;
  display: flex;
  align-items: center;
  margin-right: 10px;
}
.radio-option span {
  margin-left: 5px;
}
.form-control {
  border-radius: 5px;
  margin-top: 5px;
}
.input-group {
  margin-bottom: 10px;
}
.appliance-group .input-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.appliance-group .input-group-prepend {
  flex: 0 0 40%;
  text-align: left;
}
.appliance-group .form-control {
  flex: 1;
}
.optional {
  font-size: 12px;
  color: #7f8c8d;
  margin-left: 5px;
}
.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
  width: 100%;
  padding: 10px;
}
.btn-primary:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}
.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  width: 100%;
  padding: 10px;
}
.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #5a6268;
}
.alert {
  margin-bottom: 20px;
  text-align: center;
}
/* Loader style */
.loader {
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #007bff;
}
/* Offer Price Section Styling */
.offer-section {
  background: #fef9e7;
  border: 2px dashed #f39c12;
  padding: 15px;
  margin-top: 20px;
  border-radius: 8px;
  animation: slideUp 1s ease-in-out;
  text-align: center;
}
@keyframes slideUp {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
.offer-title {
  font-size: 20px;
  font-weight: bold;
  color: #e67e22;
  margin-bottom: 5px;
}
.offer-display {
  font-size: 24px;
  font-weight: bold;
}
.special-price {
  color: #d35400;
  margin-right: 10px;
}
.actual-price {
  color: #e74c3c;
  font-weight: bold;
}
.offer-disclaimer {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 10px;
  text-align: center;
}
.admin-link {
  text-align: center;
  margin-top: 20px;
}
.admin-link a {
  text-decoration: none;
  color: #007bff;
  font-weight: bold;
}
.admin-link a:hover {
  color: #0056b3;
}
</style>
