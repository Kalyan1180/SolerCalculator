<template>
  <div class="container admin-container">
    <h2 class="form-title">Admin Management</h2>
    
    <!-- Inverters List -->
    <div class="data-section">
      <h3>Inverters</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Peak Load</th>
            <th>Max Panels</th>
            <th>Battery Supported</th>
            <th>Cost</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inverter in inverters" :key="inverter.id">
            <td>{{ inverter.name }}</td>
            <td>{{ inverter.peakLoad }}</td>
            <td>{{ inverter.maxPanels }}</td>
            <td>{{ inverter.batterySupported }}</td>
            <td>{{ inverter.cost }}</td>
            <td>
              <button class="btn btn-sm btn-warning" @click="editInverter(inverter)">Edit</button>
              <button class="btn btn-sm btn-danger" @click="deleteInverter(inverter.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Batteries List -->
    <div class="data-section">
      <h3>Batteries</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Energy</th>
            <th>Capacity</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="battery in batteries" :key="battery.id">
            <td>{{ battery.name }}</td>
            <td>{{ battery.energy }}</td>
            <td>{{ battery.capacity }}</td>
            <td>{{ battery.price }}</td>
            <td>
              <button class="btn btn-sm btn-warning" @click="editBattery(battery)">Edit</button>
              <button class="btn btn-sm btn-danger" @click="deleteBattery(battery.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Edit Form Modal (simplified inline for demonstration) -->
    <div v-if="editingItem" class="edit-form">
      <h3>Edit {{ editingType }}</h3>
      <form @submit.prevent="submitEdit">
        <div class="form-group">
          <label>Name</label>
          <input v-model="editingItem.name" type="text" class="form-control" required />
        </div>
        <div v-if="editingType === 'Inverter'">
          <div class="form-group">
            <label>Peak Load (KVA)</label>
            <input v-model.number="editingItem.peakLoad" type="number" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Max Panels Supported</label>
            <input v-model.number="editingItem.maxPanels" type="number" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Battery Supported (Volt)</label>
            <input v-model.number="editingItem.batterySupported" type="number" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Cost (Rs)</label>
            <input v-model.number="editingItem.cost" type="number" class="form-control" required />
          </div>
        </div>
        <div v-else>
          <div class="form-group">
            <label>Energy (KWh)</label>
            <input v-model.number="editingItem.energy" type="number" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Capacity (AH)</label>
            <input v-model.number="editingItem.capacity" type="number" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Price (Rs)</label>
            <input v-model.number="editingItem.price" type="number" class="form-control" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn btn-secondary" @click="cancelEdit">Cancel</button>
      </form>
    </div>

    <div class="back-link">
      <router-link to="/" class="btn btn-secondary">Back to Calculator</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: "AdminManagement",
  data() {
    return {
      inverters: [],
      batteries: [],
      editingItem: null,
      editingType: "", // "Inverter" or "Battery"
      message: ""
    };
  },
  methods: {
    async fetchData() {
      // Fetch current inverters and batteries from your backend API
      try {
        const response = await fetch("/.netlify/functions/getData");
        if (!response.ok) throw new Error("Network response not ok");
        const { inverters, batteries } = await response.json();
        // Assume each document now includes an "id" field. If not, you can map over results.
        this.inverters = inverters.map(doc => ({ ...doc, id: doc.id }));
        this.batteries = batteries.map(doc => ({ ...doc, id: doc.id }));
      } catch (error) {
        console.error("Error fetching data:", error);
        this.message = "Error fetching data. Please try again.";
      }
    },
    editInverter(item) {
      this.editingType = "Inverter";
      // Make a copy to avoid direct mutation
      this.editingItem = { ...item };
    },
    editBattery(item) {
      this.editingType = "Battery";
      this.editingItem = { ...item };
    },
    cancelEdit() {
      this.editingItem = null;
      this.editingType = "";
    },
    async submitEdit() {
      if (this.editingType === "Inverter") {
        try {
          const response = await fetch("/.netlify/functions/updateInverter", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: this.editingItem.id, updateData: this.editingItem })
          });
          if (!response.ok) throw new Error("Network response not ok");
          const result = await response.json();
          this.message = result.message;
          this.cancelEdit();
          this.fetchData();
        } catch (error) {
          console.error("Error updating inverter:", error);
          this.message = "Error updating inverter. Please try again.";
        }
      } else if (this.editingType === "Battery") {
        try {
          const response = await fetch("/.netlify/functions/updateBattery", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: this.editingItem.id, updateData: this.editingItem })
          });
          if (!response.ok) throw new Error("Network response not ok");
          const result = await response.json();
          this.message = result.message;
          this.cancelEdit();
          this.fetchData();
        } catch (error) {
          console.error("Error updating battery:", error);
          this.message = "Error updating battery. Please try again.";
        }
      }
    },
    async deleteInverter(id) {
      if (!confirm("Are you sure you want to delete this inverter?")) return;
      try {
        const response = await fetch("/.netlify/functions/deleteInverter", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error("Network response not ok");
        const result = await response.json();
        this.message = result.message;
        this.fetchData();
      } catch (error) {
        console.error("Error deleting inverter:", error);
        this.message = "Error deleting inverter. Please try again.";
      }
    },
    async deleteBattery(id) {
      if (!confirm("Are you sure you want to delete this battery?")) return;
      try {
        const response = await fetch("/.netlify/functions/deleteBattery", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error("Network response not ok");
        const result = await response.json();
        this.message = result.message;
        this.fetchData();
      } catch (error) {
        console.error("Error deleting battery:", error);
        this.message = "Error deleting battery. Please try again.";
      }
    }
  },
  mounted() {
    this.fetchData();
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
.form-title {
  text-align: center;
  color: #007bff;
  margin-bottom: 20px;
}
.data-section {
  margin-bottom: 30px;
}
.data-section h3 {
  margin-bottom: 15px;
  color: #0056b3;
  text-align: center;
}
.table {
  width: 100%;
  margin-bottom: 20px;
  border-collapse: collapse;
}
.table th,
.table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}
.table th {
  background-color: #007bff;
  color: #fff;
}
.btn {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-sm {
  font-size: 0.875rem;
}
.btn-warning {
  background-color: #ffc107;
  color: #212529;
}
.btn-warning:hover {
  background-color: #e0a800;
}
.btn-danger {
  background-color: #dc3545;
  color: #fff;
}
.btn-danger:hover {
  background-color: #c82333;
}
.edit-form {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
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
  border: 1px solid #ccc;
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
