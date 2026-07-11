<template>
  <div class="custom-project container my-5">
    <div v-if="loading" class="loader-overlay">
      <div class="loader">Please wait...</div>
    </div>

    <div class="card" :class="{ 'opacity-50': loading }">
      <div class="card-header bg-primary text-white">
        <h4 class="mb-0">Add Custom Project</h4>
      </div>
      <div class="card-body">
        <div v-if="statusMessage" :class="['alert', statusType === 'success' ? 'alert-success' : 'alert-danger']">
          {{ statusMessage }}
        </div>

        <form @submit.prevent="submitCustomProject">
          <h5>Customer Information</h5>
          <div class="row mb-3">
            <div class="col-md-6 mb-3">
              <label class="form-label">Customer Name</label>
              <input v-model.trim="form.name" :disabled="loading" type="text" maxlength="150" class="form-control" required>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Email</label>
              <input v-model.trim="form.email" :disabled="loading" type="email" maxlength="254" class="form-control" required>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Phone</label>
              <input v-model.trim="form.phone" :disabled="loading" type="tel" maxlength="30" pattern="[0-9+() -]{8,30}" class="form-control" required>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Address</label>
              <textarea v-model.trim="form.address" :disabled="loading" maxlength="500" rows="2" class="form-control" required></textarea>
            </div>
          </div>

          <h5>Project Pricing</h5>
          <div class="row mb-3">
            <div class="col-md-6 mb-3">
              <label class="form-label">Number of Panels</label>
              <input v-model.number="form.panels" :disabled="loading" type="number" class="form-control" min="1" max="1000" required>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Quoted Price (Rs)</label>
              <input v-model.number="form.quotedPrice" :disabled="loading" type="number" class="form-control" min="0" step="1" required>
            </div>
          </div>

          <h5>Inverter</h5>
          <div class="mb-3">
            <div class="input-group">
              <select v-model="form.selectedInverterId" :disabled="loading || manual.inverter" class="form-select" :required="!manual.inverter">
                <option value="">-- choose from list --</option>
                <option v-for="inv in inverters" :key="inv.id" :value="inv.id">
                  {{ inv.name }} ({{ inv.peakLoad }} KVA)
                </option>
              </select>
              <button class="btn btn-outline-secondary" type="button" :disabled="loading" @click="toggleManual('inverter')">
                {{ manual.inverter ? 'Use List' : 'Manual' }}
              </button>
            </div>
            <div v-if="manual.inverter" class="mt-2 row g-2">
              <div class="col-md"><input v-model.trim="form.invName" placeholder="Name" maxlength="150" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.invPeakLoad" type="number" min="0" placeholder="Peak Load" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.invMaxPanels" type="number" min="1" placeholder="Max Panels" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.invBatteryVolt" type="number" min="0" placeholder="Battery V" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.invCost" type="number" min="0" placeholder="Cost" class="form-control" required></div>
            </div>
          </div>

          <h5>Battery</h5>
          <div class="mb-3">
            <div class="input-group">
              <select v-model="form.selectedBatteryId" :disabled="loading || manual.battery" class="form-select" :required="!manual.battery">
                <option value="">-- choose from list --</option>
                <option v-for="bat in batteries" :key="bat.id" :value="bat.id">
                  {{ bat.name }} ({{ bat.capacity }} AH)
                </option>
              </select>
              <button class="btn btn-outline-secondary" type="button" :disabled="loading" @click="toggleManual('battery')">
                {{ manual.battery ? 'Use List' : 'Manual' }}
              </button>
            </div>
            <div v-if="manual.battery" class="mt-2 row g-2">
              <div class="col-md"><input v-model.trim="form.batName" placeholder="Name" maxlength="150" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.batCapacity" type="number" min="0" placeholder="Capacity AH" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.batPrice" type="number" min="0" placeholder="Price" class="form-control" required></div>
              <div class="col-md"><input v-model.number="form.batEnergy" type="number" min="0" placeholder="Energy kWh" class="form-control" required></div>
            </div>
            <div class="mt-2">
              <label class="form-label">Battery Quantity</label>
              <input v-model.number="form.batteryQuantity" type="number" min="1" max="1000" class="form-control" required>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="loading">Add Project</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { authorizedFetch } from '@/utils/apiClient';
import { COST_CONFIG } from '@/constants/calculationConstants';

function initialForm() {
  return {
    name: '',
    email: '',
    phone: '',
    address: '',
    panels: 1,
    quotedPrice: 0,
    selectedInverterId: '',
    invName: '',
    invPeakLoad: null,
    invMaxPanels: null,
    invBatteryVolt: null,
    invCost: null,
    selectedBatteryId: '',
    batName: '',
    batCapacity: null,
    batPrice: null,
    batEnergy: null,
    batteryQuantity: 1
  };
}

export default {
  name: 'CustomProjectForm',
  data() {
    return {
      inverters: [],
      batteries: [],
      form: initialForm(),
      manual: { inverter: false, battery: false },
      statusMessage: '',
      statusType: '',
      loading: false,
      redirectTimer: null
    };
  },
  mounted() {
    this.fetchData();
  },
  beforeUnmount() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  methods: {
    async fetchData() {
      this.loading = true;
      this.statusMessage = '';
      try {
        const response = await fetch('/.netlify/functions/getData');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load product data.');
        this.inverters = data.inverters || [];
        this.batteries = data.batteries || [];
      } catch (error) {
        this.statusMessage = error.message;
        this.statusType = 'error';
      } finally {
        this.loading = false;
      }
    },
    toggleManual(type) {
      this.manual[type] = !this.manual[type];
      if (type === 'inverter') this.form.selectedInverterId = '';
      if (type === 'battery') this.form.selectedBatteryId = '';
    },
    getSelectedInverter() {
      if (this.manual.inverter) {
        return {
          name: this.form.invName,
          peakLoad: this.form.invPeakLoad,
          maxPanels: this.form.invMaxPanels,
          batterySupported: this.form.invBatteryVolt,
          cost: this.form.invCost
        };
      }
      return this.inverters.find((item) => item.id === this.form.selectedInverterId);
    },
    getSelectedBattery() {
      if (this.manual.battery) {
        return {
          name: this.form.batName,
          capacity: this.form.batCapacity,
          price: this.form.batPrice,
          energy: this.form.batEnergy
        };
      }
      return this.batteries.find((item) => item.id === this.form.selectedBatteryId);
    },
    async submitCustomProject() {
      this.loading = true;
      this.statusMessage = '';
      this.statusType = '';

      try {
        const inverter = this.getSelectedInverter();
        const selectedBattery = this.getSelectedBattery();
        if (!inverter || !selectedBattery) throw new Error('Select or enter both inverter and battery details.');
        if (Number(this.form.panels) > Number(inverter.maxPanels)) {
          throw new Error('Selected inverter does not support the requested panel count.');
        }

        const materialCost =
          Number(this.form.panels) * COST_CONFIG.PANEL_COST_PER_PIECE +
          Number(inverter.cost || 0) +
          Number(this.form.batteryQuantity) * Number(selectedBattery.price || 0);

        const result = await authorizedFetch('/.netlify/functions/addProject', {
          method: 'POST',
          body: JSON.stringify({
            name: this.form.name,
            email: this.form.email,
            phone: this.form.phone,
            address: this.form.address,
            panelCount: this.form.panels,
            inverter,
            battery: {
              selectedBattery,
              quantity: this.form.batteryQuantity
            },
            costWithout: materialCost,
            costWith: this.form.quotedPrice,
            quotedPrice: this.form.quotedPrice
          })
        });

        this.statusMessage = `${result.message} Project ID: ${result.projectId}`;
        this.statusType = 'success';
        this.form = initialForm();
        this.manual = { inverter: false, battery: false };
        this.redirectTimer = setTimeout(() => this.$router.push('/admin/projects'), 1500);
      } catch (error) {
        console.error('Error creating custom project:', error);
        this.statusMessage = error.message || 'Failed to add project.';
        this.statusType = 'error';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.custom-project {
  max-width: 1000px;
}
.card {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
}
.loader-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.loader {
  font-size: 1.25rem;
  color: #007bff;
}
</style>
