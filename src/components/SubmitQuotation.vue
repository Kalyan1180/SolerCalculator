<template>
  <div class="quotation-container container my-5">
    <h2 class="text-center mb-4">Generate Quotation</h2>
    
    <!-- Loader: shown when loading is true; hides all other content -->
    <div v-if="loading" class="loader-overlay">
      <div class="loader">Submitting quotation, please wait...</div>
    </div>
    
    <!-- Success Message: shown when message exists (and loading is false) -->
    <div v-else-if="message" class="success-message">
      <div class="alert alert-info text-center">
        {{ message }}
      </div>
    </div>
    
    
    <!-- Main Form: only shown when not loading and no success message -->
    <div v-else>
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
    </div>
    
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
      message: "",
      loading: false,
      redirectCountdown: 5,
      countdownInterval: null
    };
  },
  computed: {
    ...mapGetters(['solerResults'])
  },
  created() {
    const auth = getAuth();
    if (auth.currentUser) {
      this.formData.email = auth.currentUser.email;
    }
  },
  methods: {
    async submitQuotation() {
      this.loading = true;
      // Build project record
      const projectId = Date.now();
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
        note: ""
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
        // Set success message along with a countdown
        this.message = result.message + " Redirecting to home page in " + this.redirectCountdown + " seconds...";
        // Clear form data, preserving email
        this.formData = { name: "", address: "", phone: "", suggestedPrice: 0, email: this.formData.email };

        // Start countdown timer
        this.countdownInterval = setInterval(() => {
          this.redirectCountdown--;
          this.message = result.message + " Redirecting to home page in " + this.redirectCountdown + " seconds...";
          if (this.redirectCountdown <= 0) {
            clearInterval(this.countdownInterval);
            this.message = "";
            this.$router.push("/");
          }
        }, 1000);
      } catch (error) {
        console.error("Error creating project:", error);
        this.message = "Error creating project: " + error.message;
      } finally {
        this.loading = false;
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
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loader {
  font-size: 20px;
  color: #007bff;
}
.success-message {
  text-align: center;
  font-size: 18px;
  color: #28a745;
}
</style>
