<template>
  <div class="custom-project container my-5">
    <div v-if="loading" class="loader-overlay" role="status"><div class="loader">Please wait...</div></div>

    <div class="card">
      <div class="card-header bg-primary text-white"><h4 class="mb-0">Add Custom Project</h4></div>
      <div class="card-body">
        <div v-if="statusMessage" :class="['alert', statusType === 'success' ? 'alert-success' : 'alert-danger']">
          {{ statusMessage }}
        </div>

        <form @submit.prevent="submitCustomProject">
          <h5>Customer</h5>
          <div class="row g-3 mb-4">
            <div class="col-md-6"><label class="form-label">Name</label><input v-model.trim="form.name" class="form-control" maxlength="100" required /></div>
            <div class="col-md-6"><label class="form-label">Email</label><input v-model.trim="form.email" type="email" class="form-control" required /></div>
            <div class="col-md-6"><label class="form-label">Phone</label><input v-model.trim="form.phone" type="tel" class="form-control" maxlength="20" required /></div>
            <div class="col-md-6"><label class="form-label">Address</label><input v-model.trim="form.address" class="form-control" maxlength="500" required /></div>
          </div>

          <h5>System and Pricing</h5>
          <div class="row g-3 mb-4">
            <div class="col-md-3"><label class="form-label">Panels</label><input v-model.number="form.panels" type="number" min="1" step="1" class="form-control" required /></div>
            <div class="col-md-3"><label class="form-label">Equipment Cost (Rs)</label><input v-model.number="form.materialCost" type="number" min="0" step="1" class="form-control" required /></div>
            <div class="col-md-3"><label class="form-label">Labour Cost (Rs)</label><input v-model.number="form.laborCost" type="number" min="0" step="1" class="form-control" required /></div>
            <div class="col-md-3"><label class="form-label">Quoted Price (Rs)</label><input v-model.number="form.quotedPrice" type="number" min="1" step="1" class="form-control" required /></div>
          </div>

          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Inverter</h5>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleManual('inverter')">
                {{ manual.inverter ? 'Choose from inventory list' : 'Enter manually' }}
              </button>
            </div>
            <select v-if="!manual.inverter" v-model="form.selectedInverterId" class="form-select" required>
              <option value="" disabled>Select inverter</option>
              <option v-for="inverter in inverters" :key="inverter.id" :value="inverter.id">
                {{ inverter.name }} - {{ inverter.peakLoad }} KVA
              </option>
            </select>
            <div v-else class="row g-2">
              <div class="col-md-4"><input v-model.trim="form.invName" placeholder="Name" class="form-control" required /></div>
              <div class="col-md-2"><input v-model.number="form.invPeakLoad" type="number" min="0" step="0.01" placeholder="KVA" class="form-control" required /></div>
              <div class="col-md-2"><input v-model.number="form.invMaxPanels" type="number" min="1" step="1" placeholder="Max panels" class="form-control" required /></div>
              <div class="col-md-2"><input v-model.number="form.invBatteryVolt" type="number" min="0" step="12" placeholder="Battery V" class="form-control" required /></div>
              <div class="col-md-2"><input v-model.number="form.invCost" type="number" min="0" step="1" placeholder="Cost" class="form-control" required /></div>
            </div>
          </div>

          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Battery <small class="text-muted">(optional for grid-tie systems)</small></h5>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleManual('battery')">
                {{ manual.battery ? 'Choose from inventory list' : 'Enter manually' }}
              </button>
            </div>
            <div v-if="!manual.battery" class="row g-2">
              <div class="col-md-9">
                <select v-model="form.selectedBatteryId" class="form-select">
                  <option value="">No battery</option>
                  <option v-for="battery in batteries" :key="battery.id" :value="battery.id">
                    {{ battery.name }} - {{ battery.capacity }} AH
                  </option>
                </select>
              </div>
              <div class="col-md-3"><input v-model.number="form.batteryQuantity" type="number" min="0" step="1" class="form-control" placeholder="Quantity" /></div>
            </div>
            <div v-else class="row g-2">
              <div class="col-md-3"><input v-model.trim="form.batName" placeholder="Name" class="form-control" /></div>
              <div class="col-md-2"><input v-model.number="form.batCapacity" type="number" min="0" placeholder="AH" class="form-control" /></div>
              <div class="col-md-2"><input v-model.number="form.batPrice" type="number" min="0" placeholder="Price" class="form-control" /></div>
              <div class="col-md-2"><input v-model.number="form.batEnergy" type="number" min="0" step="0.01" placeholder="kWh" class="form-control" /></div>
              <div class="col-md-3"><input v-model.number="form.batteryQuantity" type="number" min="0" step="1" placeholder="Quantity" class="form-control" /></div>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Customer Notes</label>
            <textarea v-model.trim="form.additionalNotes" class="form-control" rows="3" maxlength="1000"></textarea>
          </div>

          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="loading">Create Project</button>
            <router-link to="/admin/projects" class="btn btn-secondary">Cancel</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { createProject } from '@/models/projectModel';

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'CustomProjectForm',
  data() {
    return {
      inverters: [],
      batteries: [],
      form: this.emptyForm(),
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
    emptyForm() {
      return {
        name: '', email: '', phone: '', address: '', additionalNotes: '',
        panels: 1, materialCost: 0, laborCost: 0, quotedPrice: 0,
        selectedInverterId: '', invName: '', invPeakLoad: null, invMaxPanels: null, invBatteryVolt: 0, invCost: 0,
        selectedBatteryId: '', batteryQuantity: 0, batName: '', batCapacity: null, batPrice: 0, batEnergy: null
      };
    },
    async fetchData() {
      this.loading = true;
      this.statusMessage = '';
      try {
        const response = await fetch('/.netlify/functions/getData');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load equipment list');
        this.inverters = Array.isArray(payload.inverters) ? payload.inverters : [];
        this.batteries = Array.isArray(payload.batteries) ? payload.batteries : [];
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
      else {
        this.form.selectedBatteryId = '';
        this.form.batteryQuantity = 0;
      }
    },
    selectedInverter() {
      if (this.manual.inverter) {
        return {
          name: this.form.invName,
          peakLoad: numberValue(this.form.invPeakLoad),
          maxPanels: numberValue(this.form.invMaxPanels),
          batterySupported: numberValue(this.form.invBatteryVolt),
          cost: numberValue(this.form.invCost)
        };
      }
      return this.inverters.find(item => item.id === this.form.selectedInverterId) || null;
    },
    selectedBattery() {
      const quantity = numberValue(this.form.batteryQuantity);
      if (quantity <= 0) return null;
      const battery = this.manual.battery
        ? {
            name: this.form.batName,
            capacity: numberValue(this.form.batCapacity),
            price: numberValue(this.form.batPrice),
            energy: numberValue(this.form.batEnergy)
          }
        : this.batteries.find(item => item.id === this.form.selectedBatteryId);
      return battery ? { selectedBattery: battery, quantity } : null;
    },
    validate() {
      if (!this.selectedInverter()) return 'Select or enter an inverter.';
      if (numberValue(this.form.panels) <= 0 || !Number.isInteger(numberValue(this.form.panels))) return 'Panel count must be a positive whole number.';
      if ([this.form.materialCost, this.form.laborCost, this.form.quotedPrice].some(value => numberValue(value) < 0)) return 'Costs cannot be negative.';
      if (numberValue(this.form.quotedPrice) <= 0) return 'Quoted price must be greater than zero.';
      if (numberValue(this.form.quotedPrice) < numberValue(this.form.materialCost) + numberValue(this.form.laborCost)) {
        return 'Quoted price cannot be lower than equipment plus labour cost.';
      }
      if (numberValue(this.form.batteryQuantity) > 0 && !this.selectedBattery()) return 'Select or enter valid battery details.';
      return null;
    },
    async submitCustomProject() {
      this.statusMessage = '';
      const validationError = this.validate();
      if (validationError) {
        this.statusMessage = validationError;
        this.statusType = 'error';
        return;
      }

      this.loading = true;
      try {
        const materialCost = numberValue(this.form.materialCost);
        const laborCost = numberValue(this.form.laborCost);
        const quotedPrice = numberValue(this.form.quotedPrice);
        const calculatorResults = {
          panelCount: numberValue(this.form.panels),
          inverter: this.selectedInverter(),
          battery: this.selectedBattery(),
          materialCost,
          laborCost,
          costWithout: materialCost + laborCost,
          costWith: quotedPrice,
          special: quotedPrice
        };
        const projectData = {
          name: this.form.name,
          email: this.form.email,
          phone: this.form.phone,
          address: this.form.address,
          additionalNotes: this.form.additionalNotes,
          suggestedPrice: quotedPrice
        };
        const result = await createProject(null, projectData, calculatorResults);
        if (!result.success) throw new Error(result.error || 'Unable to create project');

        this.statusMessage = `Project ${result.projectId} created successfully.`;
        this.statusType = 'success';
        this.form = this.emptyForm();
        this.redirectTimer = setTimeout(() => this.$router.push('/admin/projects'), 1500);
      } catch (error) {
        this.statusMessage = error.message;
        this.statusType = 'error';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.custom-project { max-width: 1000px; }
.card { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1); }
.loader-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.82);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loader { font-size: 1.2rem; color: #0d6efd; }
</style>
