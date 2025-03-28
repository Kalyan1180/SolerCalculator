<template>
    <div class="container admin-container">
      <h2 class="form-title">Admin Dashboard</h2>
      <!-- Flex container for forms -->
      <div class="form-sections">
        <div class="form-section">
          <h3>Add Inverter</h3>
          <form @submit.prevent="submitInverter">
            <div class="form-group">
              <label for="invName" class="form-label">Name</label>
              <input v-model="inverter.name" type="text" id="invName" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="invPeakLoad" class="form-label">Peak Load (KVA)</label>
              <input v-model.number="inverter.peakLoad" type="number" id="invPeakLoad" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="invMaxPanels" class="form-label">Max Panels Supported</label>
              <input v-model.number="inverter.maxPanels" type="number" id="invMaxPanels" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="invBatterySupported" class="form-label">Battery Supported (Volt)</label>
              <input v-model.number="inverter.batterySupported" type="number" id="invBatterySupported" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="invCost" class="form-label">Cost (Rs)</label>
              <input v-model.number="inverter.cost" type="number" id="invCost" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Inverter</button>
          </form>
        </div>
  
        <div class="form-section">
          <h3>Add Battery</h3>
          <form @submit.prevent="submitBattery">
            <div class="form-group">
              <label for="batName" class="form-label">Name</label>
              <input v-model="battery.name" type="text" id="batName" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="batEnergy" class="form-label">Energy (KWh)</label>
              <input v-model.number="battery.energy" type="number" id="batEnergy" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="batCapacity" class="form-label">Capacity (AH)</label>
              <input v-model.number="battery.capacity" type="number" id="batCapacity" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="batPrice" class="form-label">Price (Rs)</label>
              <input v-model.number="battery.price" type="number" id="batPrice" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Battery</button>
          </form>
        </div>
      </div>
  
      <div v-if="message" class="alert alert-info message">{{ message }}</div>
      <div class="back-link">
        <router-link to="/" class="btn btn-secondary">Back to Calculator</router-link>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "AdminEntry",
    data() {
      return {
        inverter: {
          name: "",
          peakLoad: null,
          maxPanels: null,
          batterySupported: null,
          cost: null
        },
        battery: {
          name: "",
          energy: null,
          capacity: null,
          price: null
        },
        message: ""
      };
    },
    methods: {
      async submitInverter() {
        try {
          const response = await fetch("/.netlify/functions/addInverter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.inverter)
          });
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const result = await response.json();
          this.message = result.message;
          this.inverter = { name: "", peakLoad: null, maxPanels: null, batterySupported: null, cost: null };
        } catch (error) {
          console.error("Error adding inverter:", error);
          this.message = "Error adding inverter. Please try again.";
        }
      },
      async submitBattery() {
        try {
          const response = await fetch("/.netlify/functions/addBattery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.battery)
          });
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const result = await response.json();
          this.message = result.message;
          this.battery = { name: "", energy: null, capacity: null, price: null };
        } catch (error) {
          console.error("Error adding battery:", error);
          this.message = "Error adding battery. Please try again.";
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .admin-container {
    max-width: 90%;
    margin: auto;
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
  
  /* Responsive flex container for the two form sections */
  .form-sections {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }
  
  .form-section {
    flex: 1;
    min-width: 300px;
    background-color: #fff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  }
  
  /* On mobile, stack the sections vertically */
  @media (max-width: 768px) {
    .form-sections {
      flex-direction: column;
    }
  }
  
  .form-title {
    text-align: center;
    color: #007bff;
    margin-bottom: 20px;
  }
  
  .form-section h3 {
    margin-bottom: 15px;
    color: #0056b3;
    text-align: center;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-label {
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
  }
  
  .form-control {
    width: 100%;
    padding: 8px;
    border-radius: 5px;
    margin-top: 5px;
    border: 1px solid #ccc;
  }
  
  .btn {
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-block {
    width: 100%;
  }
  
  .btn-primary {
    background-color: #007bff;
    color: #fff;
  }
  
  .btn-primary:hover {
    background-color: #0056b3;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: #fff;
  }
  
  .btn-secondary:hover {
    background-color: #5a6268;
  }
  
  .alert {
    margin-top: 15px;
  }
  
  .message {
    margin-top: 20px;
    text-align: center;
  }
  
  .back-link {
    text-align: center;
    margin-top: 20px;
  }
  </style>
  