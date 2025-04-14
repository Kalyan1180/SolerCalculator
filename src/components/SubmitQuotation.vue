<template>
    <div class="quotation-container container my-5">
      <h2 class="text-center mb-4">Generate Quotation</h2>
      <form @submit.prevent="submitQuotation" class="quotation-form border p-4 rounded">
        <!-- Editable Fields -->
        <div class="mb-3">
          <label for="custName" class="form-label">Customer Name</label>
          <input v-model="formData.name" type="text" id="custName" class="form-control" placeholder="Enter customer name" required />
        </div>
        <div class="mb-3">
          <label for="custAddress" class="form-label">Address</label>
          <input v-model="formData.address" type="text" id="custAddress" class="form-control" placeholder="Enter customer address" required />
        </div>
        <div class="mb-3">
          <label for="custPhone" class="form-label">Phone Number</label>
          <input v-model="formData.phone" type="tel" id="custPhone" class="form-control" placeholder="Enter phone number" required />
        </div>
        <div class="mb-3">
          <label for="suggestedPrice" class="form-label">Suggested Price (Rs)</label>
          <input v-model.number="formData.suggestedPrice" type="number" id="suggestedPrice" class="form-control" placeholder="Enter suggested price" required />
        </div>
        
        <!-- Read-Only Prefilled Fields -->
        <div class="prefilled-fields border p-3 mb-3 rounded">
          <h4>Prefilled Calculation Data</h4>
          <p><strong>Estimated Cost with installation:</strong> Rs: {{ prefill.costWith.toFixed(0) }}</p>
          <p><strong>Estimated Cost without profit:</strong> Rs: {{ prefill.costWithout.toFixed(0) }}</p>
          <p><strong>Profit Percentage (%):</strong> {{ prefill.profit.toFixed(2) }}</p>
          <p><strong>Special Offer Price:</strong> Rs: {{ prefill.special.toFixed(0) }}</p>
          <p><strong>Required Inverter Details:</strong></p>
          <pre>{{ JSON.stringify(prefill.inverter, null, 2) }}</pre>
          <p><strong>Required Battery Details:</strong></p>
          <pre>{{ JSON.stringify(prefill.battery, null, 2) }}</pre>
        </div>

        
        <button type="submit" class="btn btn-primary w-100">Submit Quotation</button>
      </form>
      <div v-if="message" class="alert alert-info mt-3">{{ message }}</div>
    </div>
  </template>
  
  <script>
  import { getAuth } from "firebase/auth";
  
  export default {
    name: "SubmitQuotation",
    data() {

      return {
        formData: {
          name: "",
          address: "",
          phone: "",
          suggestedPrice: null
        },
        prefill: {
          costWith: 0,
          costWithout: 0,
          profit: 0,
          special: 0,
          inverter: {},
          battery: {}
        },
        message: ""
      };
    },
    created() {
      // Retrieve data from router state
      const stateData = this.$router.history.state;
      if (stateData) {
        this.prefill.costWith = stateData.costWith || 0;
        this.prefill.costWithout = stateData.costWithout || 0;
        this.prefill.profit = stateData.profit || 0;
        this.prefill.special = stateData.special || 0;
        this.prefill.inverter = stateData.inverter || {};
        this.prefill.battery = stateData.battery || {};
      }
      // Optionally, auto fill customer's email if needed using auth:
      const auth = getAuth();
      if (auth.currentUser) {
        this.formData.email = auth.currentUser.email;
      }
    },
    methods: {
      async submitQuotation() {
        // Build project data
        // Generate a unique project id (here using timestamp; consider more robust methods in production)
        const projectId = Date.now();
        
        const projectData = {
          name: this.formData.name,
          address: this.formData.address,
          phone: this.formData.phone,
          email: this.formData.email || "", // fetched from login details if available
          projectId: projectId,
          cost: this.formData.suggestedPrice,
          advancePrice: 0,
          requiredInverter: this.prefill.inverter,
          requiredBattery: this.prefill.battery,
          percentCompletion: 0,
          systemIssues: "",
          note: ""
        };
        
        try {
          const response = await fetch("/.netlify/functions/addProject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(projectData)
          });
          if (!response.ok) throw new Error("Network response was not ok");
          const result = await response.json();
          this.message = result.message || "Project created successfully!";
        } catch (error) {
          console.error("Error creating project:", error);
          this.message = "Error creating project: " + error.message;
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .quotation-container {
    max-width: 600px;
    margin: auto;
    padding: 20px;
  }
  .quotation-form {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
  .prefilled-fields {
    background-color: #fef9e7;
    border: 1px dashed #f39c12;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .prefilled-fields pre {
    background-color: #fff;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }
  </style>
  