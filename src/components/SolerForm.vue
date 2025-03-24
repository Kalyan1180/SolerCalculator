<template>
  <div class="container mt-5">
    <!-- Display global error message if present -->
    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <!-- Results view -->
    <div v-if="showResults">
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

          <!-- Cost Calculation -->
          <p>
            <strong>Estimated Cost with installation:</strong>
            Rs: {{ costResults.totalCostWithMarkup.toFixed(2) }}
          </p>
          <p>
            <strong>Estimated Cost without profit:</strong>
            Rs: {{ costResults.totalCostWithoutMarkup.toFixed(2) }}
          </p>
          <p>
            <strong>Profit Percentage (%):</strong>
            {{ profitPercentage.toFixed(2) }}
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

      <!-- Monthly Consumption Input -->
      <div class="form-group">
        <label for="monthlyConsumption" class="form-label">
          Monthly Consumption (KWH):
        </label>
        <input v-model.number="monthlyConsumption" type="number" class="form-control" id="monthlyConsumption" />
      </div>

      <!-- Electricity Bill Type -->
      <div class="form-group">
        <label class="form-label">Electricity Bill Type:</label>
        <div class="row">
          <div class="col">
            <div class="form-check">
              <input v-model="billType" class="form-check-input" type="radio" id="domesticBill" value="domestic" />
              <label class="form-check-label" for="domesticBill">Domestic</label>
            </div>
          </div>
          <div class="col">
            <div class="form-check">
              <input v-model="billType" class="form-check-input" type="radio" id="commercialBill" value="commercial" />
              <label class="form-check-label" for="commercialBill">Commercial</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Bill Inputs -->
      <div class="form-group" v-if="billType === 'domestic'">
        <label for="domesticElectricityBill" class="form-label">Monthly Domestic Bill:</label>
        <input v-model.number="domesticElectricityBill" type="number" class="form-control" id="domesticElectricityBill" />
      </div>
      <div class="form-group" v-if="billType === 'commercial'">
        <label for="commercialElectricityBill" class="form-label">Monthly Commercial Bill:</label>
        <input v-model.number="commercialElectricityBill" type="number" class="form-control" id="commercialElectricityBill" />
      </div>

      <!-- Input Method Selection -->
      <div class="form-group">
        <label class="form-label d-block">Choose Input Method:</label>
        <div class="row">
          <div class="col">
            <div class="form-check form-check-inline">
              <input v-model="inputMethod" class="form-check-input" type="radio" id="peakLoadMethod" value="peakLoad" />
              <label class="form-check-label" for="peakLoadMethod">Enter Peak Load</label>
            </div>
          </div>
          <div class="col">
            <div class="form-check form-check-inline">
              <input v-model="inputMethod" class="form-check-input" type="radio" id="appliancesMethod" value="appliances" />
              <label class="form-check-label" for="appliancesMethod">Enter Number of Appliances</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Peak Load Input -->
      <div class="form-group" v-if="inputMethod === 'peakLoad'">
        <label for="peakLoad" class="form-label">Peak Load Amp:</label>
        <input v-model.number="peakLoad" type="number" class="form-control" id="peakLoad" />
      </div>

      <!-- Appliances Input -->
      <div class="form-group" v-if="inputMethod === 'appliances'">
        <label class="form-label">Number of Appliances:</label>
        <div class="input-group" v-for="(value, key) in appliances" :key="key">
          <div class="input-group-prepend">
            <span class="input-group-text">{{ applianceLabels[key] }}</span>
          </div>
          <input v-model.number="appliances[key]" type="number" class="form-control" />
        </div>
      </div>

      <!-- Calculate Button -->
      <button type="submit" class="btn btn-primary btn-block">Calculate</button>
    </form>
  </div>
</template>

<script>
export default {
  name: "SolerCalculator",
  data() {
    return {
      showResults: false,
      errorMessage: "",
      // Inputs
      monthlyConsumption: null,
      billType: "domestic",
      inputMethod: "peakLoad",
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
      // Logo import (adjust the path as needed)
      logo: require("@/assets/logo.png"),
      // Appliance labels
      applianceLabels: {
        ledBulb: "LED Bulb",
        tubeLight: "Tube Light",
        fan: "Fan",
        refrigerator: "Refrigerator",
        ledTV: "LED TV",
        pump: "Pump (1kW)",
        ac: "AC (1Ton)",
      },
      // Constants
      panelCostPerPiece: 15000,
      // These lists will be fetched from the backend
      inverterList: [],
      batteryList: [],
      // Wattage constants (in watts)
      wattagePerHour: {
        ledBulb: 9,
        tubeLight: 20,
        fan: 70,
        refrigerator: 150,
        ledTV: 50,
        pump: 1000,
        ac: 1000,
      },
      runningHours: {
        ledBulb: 10,
        tubeLight: 8,
        fan: 12,
        refrigerator: 24,
        ledTV: 6,
        pump: 1,
        ac: 8,
      },
      // Wattage for peak load (values may differ)
      peakWattage: {
        ledBulb: 9,
        tubeLight: 20,
        fan: 70,
        refrigerator: 200,
        ledTV: 50,
        pump: 1000,
        ac: 1500,
      },
    };
  },
  computed: {
    // Compute daily unit consumption
    unitPerDay() {
      if (this.monthlyConsumption != null && this.monthlyConsumption > 0) {
        return this.monthlyConsumption / 30;
      } else if (this.domesticElectricityBill != null && this.domesticElectricityBill > 0) {
        return ((this.domesticElectricityBill * 12) / 365) / 6.5;
      } else if (this.commercialElectricityBill != null && this.commercialElectricityBill > 0) {
        return ((this.commercialElectricityBill * 12) / 365) / 10;
      } else {
        // Calculate from appliances
        let total = 0;
        for (let key in this.appliances) {
          total += this.wattagePerHour[key] * this.runningHours[key] * this.appliances[key];
        }
        return Math.round((total / 1000) * 100) / 100;
      }
    },
    // Compute peak load in kW
    computedPeakLoad() {
      if (this.peakLoad != null && this.peakLoad > 0) {
        return (this.peakLoad * 220) / 1000;
      } else {
        let total = 0;
        for (let key in this.appliances) {
          total += this.peakWattage[key] * this.appliances[key];
        }
        return Math.round((total / 1000) * 100) / 100;
      }
    },
    // Number of panels needed based on daily unit consumption
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
    // Select the inverter with the lowest cost that meets requirements
    selectedInverter() {
      const filtered = this.inverterList.filter(
        (inv) => this.computedPeakLoad <= inv.peakLoad && this.panelCount <= inv.maxPanels
      );
      if (filtered.length === 0 || this.panelCount === 0) return null;
      return filtered.reduce((prev, curr) => (curr.cost < prev.cost ? curr : prev));
    },
    // Select battery info based on required energy
    batteryInfo() {
      if (!this.selectedInverter) return null;
      // Calculate required energy (kWh) based on 3 days autonomy with a 40% depth-of-discharge
      const energyRequired = (this.unitPerDay * 3) / 5;
      if (this.selectedInverter.batterySupported === 0 || energyRequired === 0) return null;
      const batteryVoltageFactor = this.selectedInverter.batterySupported / 12;
      const energyRequiredPerBattery = energyRequired / batteryVoltageFactor;
      let selectedBattery, quantity;
      // Try to find a battery that meets or exceeds the required energy per battery
      const suitableBatteries = this.batteryList.filter(bat => bat.energy >= energyRequiredPerBattery);
      if (suitableBatteries.length > 0) {
        selectedBattery = suitableBatteries.reduce((prev, curr) => (curr.price < prev.price ? curr : prev));
        quantity = batteryVoltageFactor; // e.g., for 24V support, use 2 batteries
      } else {
        // If none meet the criteria, pick the battery with maximum energy
        selectedBattery = this.batteryList.reduce((prev, curr) => (curr.energy > prev.energy ? curr : prev));
        quantity = Math.ceil(energyRequired / selectedBattery.energy);
      }
      return { selectedBattery, quantity };
    },
    // Cost calculations: with and without markup
    costResults() {
      const panelCost = this.panelCount * this.panelCostPerPiece;
      const inverterCost = this.selectedInverter ? this.selectedInverter.cost : 0;
      const batteryCost = this.batteryInfo ? this.batteryInfo.quantity * this.batteryInfo.selectedBattery.price : 0;
      const totalWithoutTax = panelCost + inverterCost + batteryCost;
      let totalWithMarkup = 0,
        totalWithoutMarkup = 0;
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
    // Profit percentage calculation
    profitPercentage() {
      const { totalCostWithMarkup, totalCostWithoutMarkup } = this.costResults;
      if (totalCostWithoutMarkup === 0) return 0;
      return ((totalCostWithMarkup - totalCostWithoutMarkup) / totalCostWithoutMarkup) * 100;
    },
  },
  methods: {
    // Validate inputs and fetch data from the backend before calculation
    async submitForm() {
      this.errorMessage = "";
      // Validate negative values
      if (
        (this.peakLoad != null && this.peakLoad < 0) ||
        (this.domesticElectricityBill != null && this.domesticElectricityBill < 0) ||
        (this.commercialElectricityBill != null && this.commercialElectricityBill < 0) ||
        Object.values(this.appliances).some((val) => val < 0)
      ) {
        this.errorMessage = "Please enter valid positive values.";
        return;
      }
      // Ensure at least one consumption or load input is provided
      const totalAppliances = Object.values(this.appliances).reduce((acc, val) => acc + val, 0);
      if (
        this.monthlyConsumption == null &&
        this.domesticElectricityBill == null &&
        this.commercialElectricityBill == null &&
        totalAppliances === 0 &&
        (this.peakLoad == null || this.peakLoad === 0)
      ) {
        this.errorMessage = "Please provide some consumption or load input.";
        return;
      }
      // Fetch inverter and battery data from the backend API
      try {
        const response = await fetch("/.netlify/functions/getData");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const { inverters, batteries } = await response.json();
        this.inverterList = inverters;
        this.batteryList = batteries;
      } catch (error) {
        console.error("Error fetching backend data:", error);
        this.errorMessage = "Error fetching data from backend. Please try again.";
        return;
      }
      // Check if a suitable inverter and battery are found
      if (!this.selectedInverter || !this.batteryInfo) {
        this.errorMessage = "No suitable inverter or battery found for the provided input. Please adjust your values.";
        return;
      }
      // All validations passed – show results
      this.showResults = true;
    },
    // Reset form inputs for new calculations
    goBack() {
      this.showResults = false;
      this.errorMessage = "";
      this.monthlyConsumption = null;
      this.billType = "domestic";
      this.inputMethod = "peakLoad";
      this.domesticElectricityBill = null;
      this.commercialElectricityBill = null;
      this.peakLoad = null;
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
  // Optionally, you could fetch backend data on component mount
  // mounted() {
  //   this.fetchBackendData();
  // }
};
</script>

<style scoped>
.container {
  max-width: 400px;
  margin: auto;
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
.form-check-label {
  margin-left: 8px;
}
.form-control {
  border-radius: 5px;
  margin-top: 5px;
}
.input-group {
  margin-bottom: 10px;
}
.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
}
.btn-primary:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}
.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}
.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #5a6268;
}
.alert {
  margin-bottom: 20px;
}
</style>
