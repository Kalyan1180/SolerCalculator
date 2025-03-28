<template>
  <div class="container admin-container">
    <h2 class="form-title">Admin Control Dashboard</h2>

    <!-- Message Display -->
    <div v-if="message" class="alert alert-info message">{{ message }}</div>

    <!-- Refresh Button -->
    <div class="refresh-btn">
      <button class="btn btn-secondary" @click="fetchData">Refresh Data</button>
    </div>

    <!-- Inverters Section -->
    <div class="data-section">
      <h3>Inverters</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Peak Load (KVA)</th>
            <th>Max Panels</th>
            <th>Battery Supported (V)</th>
            <th>Cost (Rs)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in inverters" :key="inv.id">
            <td v-if="!isEditing(inv.id, 'inverter')">{{ inv.name }}</td>
            <td v-else>
              <input v-model="editingItem.name" class="form-control" type="text" />
            </td>
            <td v-if="!isEditing(inv.id, 'inverter')">{{ inv.peakLoad }}</td>
            <td v-else>
              <input v-model.number="editingItem.peakLoad" class="form-control" type="number" />
            </td>
            <td v-if="!isEditing(inv.id, 'inverter')">{{ inv.maxPanels }}</td>
            <td v-else>
              <input v-model.number="editingItem.maxPanels" class="form-control" type="number" />
            </td>
            <td v-if="!isEditing(inv.id, 'inverter')">{{ inv.batterySupported }}</td>
            <td v-else>
              <input v-model.number="editingItem.batterySupported" class="form-control" type="number" />
            </td>
            <td v-if="!isEditing(inv.id, 'inverter')">{{ inv.cost }}</td>
            <td v-else>
              <input v-model.number="editingItem.cost" class="form-control" type="number" />
            </td>
            <td>
              <div v-if="!isEditing(inv.id, 'inverter')">
                <button class="btn btn-sm btn-warning" @click="startEdit(inv, 'inverter')">Edit</button>
                <button class="btn btn-sm btn-danger" @click="deleteInverter(inv.id)">Delete</button>
              </div>
              <div v-else>
                <button class="btn btn-sm btn-primary" @click="submitEdit(inv.id, 'inverter')">Save</button>
                <button class="btn btn-sm btn-secondary" @click="cancelEdit()">Cancel</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Batteries Section -->
    <div class="data-section">
      <h3>Batteries</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Energy (KWh)</th>
            <th>Capacity (AH)</th>
            <th>Price (Rs)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bat in batteries" :key="bat.id">
            <td v-if="!isEditing(bat.id, 'battery')">{{ bat.name }}</td>
            <td v-else>
              <input v-model="editingItem.name" class="form-control" type="text" />
            </td>
            <td v-if="!isEditing(bat.id, 'battery')">{{ bat.energy }}</td>
            <td v-else>
              <input v-model.number="editingItem.energy" class="form-control" type="number" />
            </td>
            <td v-if="!isEditing(bat.id, 'battery')">{{ bat.capacity }}</td>
            <td v-else>
              <input v-model.number="editingItem.capacity" class="form-control" type="number" />
            </td>
            <td v-if="!isEditing(bat.id, 'battery')">{{ bat.price }}</td>
            <td v-else>
              <input v-model.number="editingItem.price" class="form-control" type="number" />
            </td>
            <td>
              <div v-if="!isEditing(bat.id, 'battery')">
                <button class="btn btn-sm btn-warning" @click="startEdit(bat, 'battery')">Edit</button>
                <button class="btn btn-sm btn-danger" @click="deleteBattery(bat.id)">Delete</button>
              </div>
              <div v-else>
                <button class="btn btn-sm btn-primary" @click="submitEdit(bat.id, 'battery')">Save</button>
                <button class="btn btn-sm btn-secondary" @click="cancelEdit()">Cancel</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="back-link">
      <router-link to="/" class="btn btn-secondary">Back to Calculator</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: "AdminControl",
  data() {
    return {
      inverters: [],
      batteries: [],
      editingItem: null,
      editingId: null,
      editingType: "", // "inverter" or "battery"
      message: ""
    };
  },
  methods: {
    async fetchData() {
      try {
        const response = await fetch("/.netlify/functions/getData");
        if (!response.ok) throw new Error("Network response not ok");
        const { inverters, batteries } = await response.json();
        // Attach document IDs if not present
        this.inverters = inverters.map(doc => ({ id: doc.id, ...doc }));
        this.batteries = batteries.map(doc => ({ id: doc.id, ...doc }));
      } catch (error) {
        console.error("Error fetching data:", error);
        this.message = "Error fetching data. Please try again.";
      }
    },
    startEdit(item, type) {
      this.editingType = type;
      this.editingId = item.id;
      // Make a deep copy to avoid modifying the original data until save
      this.editingItem = JSON.parse(JSON.stringify(item));
    },
    cancelEdit() {
      this.editingItem = null;
      this.editingId = null;
      this.editingType = "";
    },
    isEditing(id, type) {
      return this.editingItem && this.editingId === id && this.editingType === type;
    },
    async submitEdit(id, type) {
      if (type === "inverter") {
        try {
          const response = await fetch("/.netlify/functions/updateInverter", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, updateData: this.editingItem })
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
      } else if (type === "battery") {
        try {
          const response = await fetch("/.netlify/functions/updateBattery", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, updateData: this.editingItem })
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
.refresh-btn {
  text-align: right;
  margin-bottom: 10px;
}
.edit-form {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
}
.back-link {
  text-align: center;
  margin-top: 20px;
}
</style>
