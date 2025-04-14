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
      
      <!-- Read-Only Prefilled Fields from Vuex store -->
      <div class="prefilled-fields border p-3 mb-3 rounded">
        <h4>Calculation Data</h4>
        <p><strong>Estimated Cost with installation:</strong> Rs: {{ solerResults.costWith.toFixed(0) }}</p>
        <p><strong>Estimated Cost without profit:</strong> Rs: {{ solerResults.costWithout.toFixed(0) }}</p>
        <p><strong>Profit Percentage (%):</strong> {{ solerResults.profit.toFixed(2) }}</p>
        <p><strong>Special Offer Price:</strong> Rs: {{ solerResults.special.toFixed(0) }}</p>
        <p><strong>Required Inverter Details:</strong></p>
        <pre>{{ JSON.stringify(solerResults.inverter, null, 2) }}</pre>
        <p><strong>Required Battery Details:</strong></p>
        <pre>{{ JSON.stringify(solerResults.battery, null, 2) }}</pre>
      </div>
      
      <button type="submit" class="btn btn-primary w-100">Submit Quotation</button>
    </form>
    <div v-if="message" class="alert alert-info mt-3">{{ message }}</div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { getAuth } from 'firebase/auth';

export default {
  name: "SubmitQuotation",
  data() {
    
    return {
      formData: {
        name: "",
        address: "",
        phone: "",
        suggestedPrice: 0,
        email: "" // will be auto-filled if available
      },
      message: ""
    };
  },
  computed: {
    ...mapGetters(['solerResults'])
  },
  created() {
    // Optionally auto fill customer's email from Firebase Auth:
    const auth = getAuth();
    if (auth.currentUser) {
      this.formData.email = auth.currentUser.email;
    }
  },
  methods: {
    async submitQuotation() {
      // Build a project record using formData and prefilled data from store.
      const projectId = Date.now(); // Use a timestamp for unique project ID (consider more robust method)
      const projectData = {
        name: this.formData.name,
        address: this.formData.address,
        phone: this.formData.phone,
        email: this.formData.email,
        projectId: projectId,
        cost: this.formData.suggestedPrice,
        advancePrice: 0,
        requiredInverter: this.solerResults.inverter,
        requiredBattery: this.solerResults.battery,
        percentCompletion: 0,
        systemIssues: "",
        note: "",
      };

      try {
        const response = await fetch("/.netlify/functions/addProject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData)
        });
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
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
