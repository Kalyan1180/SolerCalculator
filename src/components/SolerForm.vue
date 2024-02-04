<template>
  <div class="container mt-5">
    <!-- Check if showResults is true to display results, otherwise display the input form -->
    <div v-if="showResults">
      <!-- Display calculation results -->
      <div class="result-container">
        <h2 class="form-title">Solar Calculator Results</h2>
        <div class="result-info">
    <p>No of Panels Required: {{ calculatePannel() }}</p>
    <!-- Displaying Inverter Details -->
    <div v-if="showResults && selectedInverter" class="details-section">
      <p class="section-title">Inverter Details:</p>
      <ul class="details-list">
        <li><strong>Name:</strong> {{ selectedInverter.name }}</li>
        <li><strong>Peak Load:</strong> {{ selectedInverter.peakLoad }} KVA</li>
        <li><strong>Max Panels Supported:</strong> {{ selectedInverter.maxPanels }}</li>
        <li><strong>Battery Supported:</strong> {{ selectedInverter.batterySupported }} Volt</li>
        <!-- <li><strong>Inverter Cost:</strong> Rs {{ selectedkInverter.cost }}</li> -->
      </ul>
    </div>
    <div v-else>
      <p>Inverter Details: N/A</p>
    </div>
    <!-- Displaying Battery Details -->
    <div v-if="showResults && selectedBatteryInfo" class="details-section">
      <p class="section-title">Battery Details:</p>
      <ul class="details-list">
        <li><strong>Name:</strong> {{ selectedBatteryInfo.selectedBattery.name }}</li>
        <li><strong>Capacity:</strong> {{ selectedBatteryInfo.selectedBattery.capacity }} AH</li>
        <li><strong>Quantity:</strong> {{ selectedBatteryInfo.quantity }}</li>
        <!-- <li><strong>Battery Cost:</strong> Rs {{ selectedBatteryInfo.selectedBattery.price * selectedBatteryInfo.quantity }}</li> -->
      </ul>
    </div>
    <div v-else>
      <p>Battery Details: N/A</p>
    </div>
    <p>Extimated Cost: Rs {{ calculatePrice() }}</p>
  </div>
  <!-- Back button to go back to the input form -->
  <button @click="goBack" class="btn btn-secondary btn-block">Back</button>
</div>
    </div>
    <form v-else @submit.prevent="submitForm" class="solar-form">
      <div class="brand-logo">
        <img :src="require('@/assets/logo.png')" alt="Ant Soler" />
      </div>
      <h2 class="form-title">Solar Calculator</h2>
      <div class="form-group">
        <label for="monthlyConsumption" class="form-label">Monthly Consumption (KWH):</label>
        <input v-model="monthlyConsumption" type="number" class="form-control" id="monthlyConsumption" />
      </div>

      <!-- Monthly Electricity Bill Section -->
      <div class="form-group">
        <label class="form-label">Electricity Bill Type:</label>

        <!-- Bootstrap grid for Domestic and Commercial radio buttons -->
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
        <!-- Domestic Electricity Bill Input -->
        <div v-if="billType === 'domestic'" class="form-group">
          <label for="domesticElectricityBill" class="form-label">Monthly Domestic Bill:</label>
          <input v-model="domesticElectricityBill" type="number" class="form-control" id="domesticElectricityBill" />
        </div>
        <!-- Commercial Electricity Bill Input -->
        <div v-if="billType === 'commercial'" class="form-group">
          <label for="commercialElectricityBill" class="form-label">Monthly Commercial Bill:</label>
          <input v-model="commercialElectricityBill" type="number" class="form-control" id="commercialElectricityBill" />
        </div>
      </div>
      <!-- Choose Input Method Section -->
      <div class="form-group">
        <label class="form-label d-block">Choose Input Method:</label>

        <!-- Bootstrap grid for Peak Load and Number of Appliances radio buttons -->
        <div class="row">
          <div class="col">
            <div class="form-check form-check-inline">
              <input v-model="inputMethod" class="form-check-input" type="radio" id="peakLoadMethod" value="peakLoad" />
              <label class="form-check-label" for="peakLoadMethod">Enter Peak Load</label>
            </div>
          </div>
          <div class="col">
            <div class="form-check form-check-inline">
              <input v-model="inputMethod" class="form-check-input" type="radio" id="appliancesMethod"
                value="appliances" />
              <label class="form-check-label" for="appliancesMethod">Enter Number of Appliances</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Input Form based on User's Choice -->
      <div v-if="inputMethod === 'peakLoad'" class="form-group">
        <label for="peakLoad" class="form-label">Peak Load Amp:</label>
        <input v-model="peakLoad" type="number" class="form-control" id="peakLoad" />
      </div>

      <!-- Number of Appliances Inputs -->
      <div v-if="inputMethod === 'appliances'" class="form-group">
        <label class="form-label">Number of Appliances:</label>

        <!-- LED Bulb -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">LED Bulb</span>
          </div>
          <input v-model="appliances.ledBulb" type="number" class="form-control" />
        </div>

        <!-- Tube Light -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">Tube Light</span>
          </div>
          <input v-model="appliances.tubeLight" type="number" class="form-control" />
        </div>

        <!-- Fan -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">Fan</span>
          </div>
          <input v-model="appliances.fan" type="number" class="form-control" />
        </div>

        <!-- Refrigerator -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">Refrigerator</span>
          </div>
          <input v-model="appliances.refrigerator" type="number" class="form-control" />
        </div>

        <!-- LED TV -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">LED TV</span>
          </div>
          <input v-model="appliances.ledTV" type="number" class="form-control" />
        </div>

        <!-- Pump in kW -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">Pump (kW)</span>
          </div>
          <input v-model="appliances.pump" type="number" class="form-control" />
        </div>

        <!-- AC -->
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">AC in KW</span>
          </div>
          <input v-model="appliances.ac" type="number" class="form-control" />
        </div>
      </div>

      <!-- Calculate Button -->
      <button @click="calculate()" class="btn btn-primary btn-block">Calculate</button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showResults: false, // Added data property to manage the display of results or input form
      selectedInverter: null,
    selectedBatteryInfo: null,
      monthlyConsumption: null,
      billType: 'domestic',
      inputMethod: 'peakLoad',
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
    };
  },
  methods: {
    displayErrorMessage() {
      alert('An error occurred. The application is temporarily unavailable. Please try again later.');
      window.location.reload();
    },

    calculate() { try{
    // ... (other calculations)
    this.showResults = true

    // Set the selected inverter and battery info
    this.selectedInverter = this.caculateInvewrter();
    this.selectedBatteryInfo = this.calculateBatteries();
    }catch (error) {
        console.error(error);
        this.displayErrorMessage();
      }
  },
    goBack(){
      try{
      this.showResults = false;
      window.location.reload();
      }  catch (error) {
        console.error(error);
        this.displayErrorMessage();
      }
    },
    submitForm() { try{
      // Check for negative values before processing the form
      if (this.peakLoad < 0 || this.commercialElectricityBill < 0 || this.domesticElectricityBill < 0 || Object.values(this.appliances).some(value => value < 0)) {
        alert('Please enter valid positive values.');
        return;
      }

      console.log('Form submitted:', this.billType, this.peakLoad, this.appliances);
    } catch (error) {
        console.error(error);
        this.displayErrorMessage();
      }
    },
    calculateUnitPerDay() {
      // Constants for wattage and running hours per day
      if ((this.domesticElectricityBill == null) && (this.commercialElectricityBill == null) && (this.monthlyConsumption == null)) {
        const wattagePerHour = {
          ledBulb: 9,
          tubeLight: 20,
          fan: 70,
          refrigerator: 150,
          ledTV: 50,
          pump: 1000,
          ac: 1000,
        };

        const runningHoursPerDay = {
          ledBulb: 10,
          tubeLight: 8,
          fan: 12,
          refrigerator: 24,
          ledTV: 6,
          pump: 1,
          ac: 8,
        };

        // Iterate through all keys (appliance names) in the appliances object
        const totalPowerConsumption = Object.keys(this.appliances).reduce((acc, appliance) => {
          // Get the quantity for each appliance
          const quantity = this.appliances[appliance];

          // Calculate daily power consumption for each appliance
          const dailyPowerConsumption = wattagePerHour[appliance] * runningHoursPerDay[appliance] * quantity;

          // Sum up the total power consumption
          return acc + dailyPowerConsumption;
        }, 0);

        // Convert total power consumption to kilowatt-hours
        const totalPowerConsumptionInKWh = totalPowerConsumption / 1000;

        // Round the result to two decimal places
        return Math.round(totalPowerConsumptionInKWh * 100) / 100;
      }
      else if (this.commercialElectricityBill == null && this.domesticElectricityBill == null) {
        return this.monthlyConsumption / 30
      }
      else {
        if (this.commercialElectricityBill == null) {
          return ((this.domesticElectricityBill * 12) / 365) / 6.5
        }
        else {
          return ((this.commercialElectricityBill * 12) / 365) / 10
        }
      }

    },
    calculatePeakLoad() {
      if (this.peakLoad == null) {
        const wattagePerHour = {
          ledBulb: 9,
          tubeLight: 20,
          fan: 70,
          refrigerator: 200,
          ledTV: 50,
          pump: 1000,
          ac: 1500,
        };
        // Iterate through all keys (appliance names) in the appliances object
        const peakPowerConsumption = Object.keys(this.appliances).reduce((acc, appliance) => {
          // Get the quantity for each appliance
          const quantity = this.appliances[appliance];

          // Calculate daily Peak power consumption for each appliance
          const dailyPowerConsumption = wattagePerHour[appliance] * quantity;

          // Sum up the total power consumption
          return acc + dailyPowerConsumption;
        }, 0);
        // Convert total power consumption to kilowatt-hours
        const peakPowerConsumptionInKW = peakPowerConsumption / 1000;

        // Round the result to two decimal places
        return Math.round(peakPowerConsumptionInKW * 100) / 100;
      }
      else {
        return (this.peakLoad * 220) / 1000
      }
    },
    calculatePannel() {
      var unitPerDay = this.calculateUnitPerDay();
      if (unitPerDay >= 1 && unitPerDay <= 2) {
        return 1;
      } else if (unitPerDay >= 3 && unitPerDay <= 5) {
        return 2;
      } else if (unitPerDay >= 6 && unitPerDay <= 7) {
        return 3;
      } else if (unitPerDay >= 8 && unitPerDay <= 12) {
        return 4;
      } else if (unitPerDay >= 13 && unitPerDay <= 18) {
        return 6;
      } else if (unitPerDay >= 19 && unitPerDay <= 24) {
        return 8;
      } else {
        return 0;
      }
    },
    caculateInvewrter() {
      // Define a list of inverters with their specifications
      var peakLoad = this.calculatePeakLoad();
      var maxPanels = this.calculatePannel();
      const inverters = [
        { name: 'UTL Gamma plus 12V 1K', peakLoad: 1, maxPanels: 2, batterySupported: 12, cost: 14342 },
        { name: 'Gamma Plus MPPT Solar Inverter 2600/24 Volt', peakLoad: 2, maxPanels: 4, batterySupported: 24, cost: 18490 },
        { name: 'Gamma Plus MPPT Solar Inverter 3350/24 Volt', peakLoad: 3, maxPanels: 4, batterySupported: 24, cost: 19999 },
        { name: 'Sigma Plus Solar PCU 4kVA/48V', peakLoad: 4, maxPanels: 8, batterySupported: 48, cost: 55887 },
        { name: '5kVA/48V Alfa+ Solar PCU', peakLoad: 5, maxPanels: 10, batterySupported: 48, cost: 66701 },
      ];

      // Filter inverters that fulfill conditions
      const filteredInverters = inverters.filter((inverter) => {
        return peakLoad <= inverter.peakLoad && maxPanels <= inverter.maxPanels;
      });

      // Find the inverter with the lowest cost among the filtered inverters
      const selectedInverter = filteredInverters.length > 0 ?
        filteredInverters.reduce((minCostInverter, currentInverter) => {
          return currentInverter.cost < minCostInverter.cost ? currentInverter : minCostInverter;
        }) : null;

      return selectedInverter;
    },
    calculateBatteries() {
      var selectedInverter = this.caculateInvewrter();
      var unitPerDay = this.calculateUnitPerDay();
      const supportedBattery = selectedInverter ? selectedInverter.batterySupported : 0;

      // Calculate the energy required from the battery
      const energyRequired = (unitPerDay * 3) / 5;

      // If no supported battery or energyRequired is 0, return null
      if (supportedBattery === 0 || energyRequired === 0) {
        return null;
      }

      // Calculate the energy required per battery
      const energyRequiredPerBattery = energyRequired / (supportedBattery / 12);

      // Define a list of batteries with their specifications and price
      const batteries = [
        { name: 'Exide Battery 100 AH', energy: 1.2, capacity: 100, price: 8000 },
        { name: 'Exide Battery 150 AH', energy: 1.8, capacity: 150, price: 12000 },
        { name: 'Exide Battery 200 AH', energy: 2.4, capacity: 200, price: 15000 },
        { name: 'Exide Battery 260 AH', energy: 3.12, capacity: 260, price: 24000 },
      ];

      // Filter batteries based on capacity and price
      const filteredBatteries = batteries.filter((battery) => {
        return battery.energy >= energyRequiredPerBattery;
      });

      // If no suitable battery is found, return null
      if (filteredBatteries.length === 0) {
        return null;
      }

      // Find the battery with the lowest price among the filtered batteries
      const selectedBattery = filteredBatteries.reduce((minPriceBattery, currentBattery) => {
        return currentBattery.price < minPriceBattery.price ? currentBattery : minPriceBattery;
      });

      // Calculate the quantity of batteries needed
      const quantity = supportedBattery / 12;

      return { selectedBattery, quantity };
    },
    calculatePrice() {
      const selectedInverter = this.caculateInvewrter();
      const selectedBatteryInfo = this.calculateBatteries();
      const noOfPanels = this.calculatePannel();
      const panelCostPerPiece = 15000; // Adjust the panel cost as needed
      const inverterCost = selectedInverter ? selectedInverter.cost : 0;
      const batteryCost = selectedBatteryInfo ? (selectedBatteryInfo.quantity * selectedBatteryInfo.selectedBattery.price) : 0;

      // Calculate the total cost without tax
      const totalCostWithoutTax = (noOfPanels * panelCostPerPiece) + inverterCost + batteryCost;

      // Apply a 40% markup for installation, maintenance, and other factors
      var totalCostWithMarkup = 0;
      if (totalCostWithoutTax<50000){
        totalCostWithMarkup = ((totalCostWithoutTax) + (noOfPanels * 500 * 8))*1.6;
      }
      else if ((noOfPanels > 3) && (totalCostWithoutTax>50000)){
        totalCostWithMarkup = ((totalCostWithoutTax) + (noOfPanels * 500 * 12))*1.4;

      }
      else {
        totalCostWithMarkup = ((totalCostWithoutTax ) + (noOfPanels * 500 * 8))*1.5;
      }
      return totalCostWithMarkup;
    },
  },
};
</script>

<style scoped>
.brand-logo {
  text-align: center;
  margin-bottom: 20px;
}

.brand-logo img {
  max-width: 100px;
  /* Adjust the max-width as needed */
  height: auto;
}

.result-container {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.result-info {
  margin-top: 20px;
}


.container {
  max-width: 400px;
  margin: auto;
}

.solar-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.form-title {
  text-align: center;
  color: #007BFF;
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

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #5a6268;
}

Make sure to c .btn-primary {
  background-color: #007BFF;
  border-color: #007BFF;
}

.btn-primary:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}
</style>
