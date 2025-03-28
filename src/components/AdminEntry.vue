<template>
  <div class="container admin-container">
    <h2 class="form-title">Admin Control Dashboard</h2>
    
    <!-- Global Loader -->
    <div v-if="loading" class="loader-overlay">
      <div class="loader">Loading data, please wait...</div>
    </div>
    
    <!-- Global Message -->
    <div v-if="message" class="alert alert-info message">{{ message }}</div>
    
    <!-- Refresh Button -->
    <div class="refresh-btn">
      <button class="btn btn-secondary" @click="fetchData">Refresh Data</button>
    </div>
    
    <!-- Add New Sections -->
    <div class="add-section">
      <!-- Add Inverter Form -->
      <div class="add-form">
        <h3>Add New Inverter</h3>
        <form @submit.prevent="openAddInverterModal">
          <div class="form-group">
            <label for="newInvName" class="form-label">Name</label>
            <input v-model="newInverter.name" type="text" id="newInvName" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="newInvPeakLoad" class="form-label">Peak Load (KVA)</label>
            <input v-model.number="newInverter.peakLoad" type="number" id="newInvPeakLoad" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="newInvMaxPanels" class="form-label">Max Panels Supported</label>
            <input v-model.number="newInverter.maxPanels" type="number" id="newInvMaxPanels" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="newInvBatterySupported" class="form-label">Battery Supported (Volt)</label>
            <input v-model.number="newInverter.batterySupported" type="number" id="newInvBatterySupported" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="newInvCost" class="form-label">Cost (Rs)</label>
            <input v-model.number="newInverter.cost" type="number" id="newInvCost" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Add Inverter</button>
        </form>
      </div>
      
      <!-- Add Battery Form -->
      <div class="add-form">
        <h3>Add New Battery</h3>
        <form @submit.prevent="openAddBatteryModal">
          <div class="form-group">
            <label for="newBatName" class="form-label">Name</label>
            <input v-model="newBattery.name" type="text" id="newBatName" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="newBatCapacity" class="form-label">Capacity (AH)</label>
            <input v-model.number="newBattery.capacity" type="number" id="newBatCapacity" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="newBatPrice" class="form-label">Price (Rs)</label>
            <input v-model.number="newBattery.price" type="number" id="newBatPrice" class="form-control" required />
          </div>
          <!-- Display computed energy (read-only) -->
          <div class="form-group" v-if="newBattery.capacity">
            <label class="form-label">Computed Energy (KWh)</label>
            <input type="text" class="form-control" :value="computedNewBatteryEnergy" readonly />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Add Battery</button>
        </form>
      </div>
    </div>
    
    <!-- Data Listing: Only show if data exists and not loading -->
    <div v-if="(inverters.length || batteries.length) && !loading">
      <!-- Inverters List -->
      <div class="data-section">
        <h3>Inverters</h3>
        <div class="table-responsive">
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
                    <button class="btn btn-sm btn-danger" @click="openDeleteModal(inv, 'inverter')">Delete</button>
                  </div>
                  <div v-else>
                    <button class="btn btn-sm btn-primary" @click="openEditModal()">Save</button>
                    <button class="btn btn-sm btn-secondary" @click="cancelEdit()">Cancel</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Batteries List -->
      <div class="data-section">
        <h3>Batteries</h3>
        <div class="table-responsive">
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
                <!-- Energy column: computed and read-only -->
                <td>{{ computeEnergy(bat.capacity) }}</td>
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
                    <button class="btn btn-sm btn-danger" @click="openDeleteModal(bat, 'battery')">Delete</button>
                  </div>
                  <div v-else>
                    <button class="btn btn-sm btn-primary" @click="openEditModal()">Save</button>
                    <button class="btn btn-sm btn-secondary" @click="cancelEdit()">Cancel</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this {{ deleteType }}?</p>
        <div v-if="deleteItem">
          <pre>{{ formatItem(deleteItem) }}</pre>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-danger" @click="confirmDelete">Yes, Delete</button>
          <button class="btn btn-secondary" @click="cancelDelete">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- Edit Confirmation Modal -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Confirm Update</h3>
        <p>Please confirm the updated details for the {{ editingType }}:</p>
        <div v-if="editingItem">
          <pre>{{ formatItem(editingItem) }}</pre>
        </div>
        <div class="modal-buttons">
          <!-- Close modal immediately -->
          <button class="btn btn-primary" @click="confirmEditNow">Confirm Update</button>
          <button class="btn btn-secondary" @click="cancelEdit">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- Add Inverter Confirmation Modal -->
    <div v-if="showAddInverterModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Confirm New Inverter Details</h3>
        <div v-if="newInverter">
          <pre>{{ formatItem(newInverter) }}</pre>
        </div>
        <div class="modal-buttons">
          <!-- Close modal immediately -->
          <button class="btn btn-primary" @click="confirmAddInverter">Confirm Add</button>
          <button class="btn btn-secondary" @click="cancelAddInverter">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- Add Battery Confirmation Modal -->
    <div v-if="showAddBatteryModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Confirm New Battery Details</h3>
        <div v-if="newBattery">
          <pre>{{ formatItem({ ...newBattery, energy: computedNewBatteryEnergy }) }}</pre>
        </div>
        <div class="modal-buttons">
          <!-- Close modal immediately -->
          <button class="btn btn-primary" @click="confirmAddBattery">Confirm Add</button>
          <button class="btn btn-secondary" @click="cancelAddBattery">Cancel</button>
        </div>
      </div>
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
      newInverter: {
        name: "",
        peakLoad: null,
        maxPanels: null,
        batterySupported: null,
        cost: null
      },
      newBattery: {
        name: "",
        capacity: null,
        price: null
      },
      editingItem: null,
      editingId: null,
      editingType: "", // "inverter" or "battery"
      showDeleteModal: false,
      deleteItem: null,
      deleteType: "", // "inverter" or "battery"
      showEditModal: false,
      showAddInverterModal: false,
      showAddBatteryModal: false,
      message: "",
      loading: false
    };
  },
  computed: {
    computedNewBatteryEnergy() {
      if (this.newBattery.capacity) {
        return ((this.newBattery.capacity * 12) / 1000 * 0.8).toFixed(2);
      }
      return "";
    }
  },
  methods: {
    computeEnergy(capacity) {
      if (!capacity) return "";
      return ((capacity * 12) / 1000 * 0.8).toFixed(2);
    },
    clearMessageAfterDelay() {
      setTimeout(() => {
        this.message = "";
      }, 10000);
    },
    async fetchData() {
      this.loading = true;
      try {
        const response = await fetch("/.netlify/functions/getData");
        if (!response.ok) throw new Error("Network response not ok");
        const { inverters, batteries } = await response.json();
        this.inverters = inverters.map(doc => ({ id: doc.id, ...doc }));
        this.batteries = batteries.map(doc => ({ id: doc.id, ...doc }));
        this.loading = false;
      } catch (error) {
        console.error("Error fetching data:", error);
        this.message = "Error fetching data. Please try again.";
        this.loading = false;
        this.clearMessageAfterDelay();
      }
    },
    openAddInverterModal() {
      this.showAddInverterModal = true;
    },
    cancelAddInverter() {
      this.showAddInverterModal = false;
    },
    async confirmAddInverter() {
      this.showAddInverterModal = false; // Close instantly
      try {
        this.loading = true;
        const response = await fetch("/.netlify/functions/addInverter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.newInverter)
        });
        if (!response.ok) throw new Error("Network response not ok");
        const result = await response.json();
        this.message = result.message;
        this.newInverter = { name: "", peakLoad: null, maxPanels: null, batterySupported: null, cost: null };
        this.fetchData();
      } catch (error) {
        console.error("Error adding inverter:", error);
        this.message = "Error adding inverter. Please try again.";
      } finally {
        this.loading = false;
        this.clearMessageAfterDelay();
      }
    },
    openAddBatteryModal() {
      this.showAddBatteryModal = true;
    },
    cancelAddBattery() {
      this.showAddBatteryModal = false;
    },
    async confirmAddBattery() {
      this.showAddBatteryModal = false; // Close instantly
      try {
        this.loading = true;
        const computedEnergy = (this.newBattery.capacity * 12) / 1000 * 0.8;
        const batteryData = {
          name: this.newBattery.name,
          capacity: this.newBattery.capacity,
          price: this.newBattery.price,
          energy: computedEnergy
        };
        const response = await fetch("/.netlify/functions/addBattery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batteryData)
        });
        if (!response.ok) throw new Error("Network response not ok");
        const result = await response.json();
        this.message = result.message;
        this.newBattery = { name: "", capacity: null, price: null };
        this.fetchData();
      } catch (error) {
        console.error("Error adding battery:", error);
        this.message = "Error adding battery. Please try again.";
      } finally {
        this.loading = false;
        this.clearMessageAfterDelay();
      }
    },
    startEdit(item, type) {
      this.editingType = type;
      this.editingId = item.id;
      this.editingItem = JSON.parse(JSON.stringify(item));
    },
    openEditModal() {
      this.showEditModal = true;
    },
    cancelEdit() {
      this.editingItem = null;
      this.editingId = null;
      this.editingType = "";
      this.showEditModal = false;
    },
    isEditing(id, type) {
      return this.editingItem && this.editingId === id && this.editingType === type;
    },
    async confirmEditNow() {
      // Immediately close the modal
      this.showEditModal = false;
      await this.submitEdit(this.editingId, this.editingType);
    },
    async submitEdit(id, type) {
      if (type === "inverter") {
        try {
          this.loading = true;
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
        } finally {
          this.loading = false;
          this.clearMessageAfterDelay();
        }
      } else if (type === "battery") {
        try {
          this.loading = true;
          const computedEnergy = (this.editingItem.capacity * 12) / 1000 * 0.8;
          const updateData = {
            ...this.editingItem,
            energy: computedEnergy
          };
          const response = await fetch("/.netlify/functions/updateBattery", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, updateData })
          });
          if (!response.ok) throw new Error("Network response not ok");
          const result = await response.json();
          this.message = result.message;
          this.cancelEdit();
          this.fetchData();
        } catch (error) {
          console.error("Error updating battery:", error);
          this.message = "Error updating battery. Please try again.";
        } finally {
          this.loading = false;
          this.clearMessageAfterDelay();
        }
      }
    },
    openDeleteModal(item, type) {
      this.deleteType = type;
      this.deleteItem = item;
      this.showDeleteModal = true;
    },
    cancelDelete() {
      this.deleteItem = null;
      this.deleteType = "";
      this.showDeleteModal = false;
    },
    async confirmDelete() {
      // Immediately close delete modal
      this.showDeleteModal = false;
      if (this.deleteType === "inverter") {
        await this.deleteInverter(this.deleteItem.id);
      } else if (this.deleteType === "battery") {
        await this.deleteBattery(this.deleteItem.id);
      }
    },
    async deleteInverter(id) {
      try {
        this.loading = true;
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
      } finally {
        this.loading = false;
        this.clearMessageAfterDelay();
      }
    },
    async deleteBattery(id) {
      try {
        this.loading = true;
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
      } finally {
        this.loading = false;
        this.clearMessageAfterDelay();
      }
    },
    formatItem(item) {
      return Object.entries(item)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    }
  },
  mounted() {
    this.fetchData();
  }
};
</script>

<style scoped>
.admin-container {
  max-width: 100%;
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
.add-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}
.add-form {
  flex: 1;
  min-width: 300px;
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}
.data-section {
  margin-bottom: 30px;
}
.data-section h3 {
  margin-bottom: 15px;
  color: #0056b3;
  text-align: center;
}
.table-responsive {
  overflow-x: auto;
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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  padding: 20px;
  max-width: 400px;
  width: 90%;
  border-radius: 8px;
  text-align: center;
}
.modal-buttons {
  margin-top: 15px;
  display: flex;
  justify-content: space-around;
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
.back-link {
  text-align: center;
  margin-top: 20px;
}
@media (max-width: 768px) {
  .add-section {
    flex-direction: column;
  }
  .admin-container {
    padding: 10px;
  }
}
</style>
