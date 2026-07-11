<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">Calculator Equipment Catalog</h2>
        <p class="text-muted mb-0">These inverter and battery records are used by the solar calculator.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadCatalog">
        <i class="fas fa-sync-alt me-1"></i> Refresh
      </button>
    </div>

    <div v-if="!accessLoading && !canWriteEquipment" class="alert alert-info">
      Read-only access: your role can view calculator equipment but cannot add, edit or delete records.
    </div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
    <div v-if="loading" class="text-center my-4" role="status"><div class="spinner-border text-primary"></div></div>

    <div class="row g-4">
      <div class="col-xl-6">
        <section class="card h-100">
          <div class="card-header bg-primary text-white"><h4 class="mb-0">Inverters</h4></div>
          <div class="card-body">
            <form v-if="canWriteEquipment" @submit.prevent="saveInverter" class="border rounded p-3 mb-4">
              <h5>{{ editingInverterId ? 'Edit Inverter' : 'Add Inverter' }}</h5>
              <div class="row g-2">
                <div class="col-12"><label class="form-label">Name</label><input v-model.trim="inverterForm.name" class="form-control" maxlength="120" required /></div>
                <div class="col-sm-6"><label class="form-label">Peak Load (KVA)</label><input v-model.number="inverterForm.peakLoad" type="number" min="0.01" step="0.01" class="form-control" required /></div>
                <div class="col-sm-6"><label class="form-label">Maximum Panels</label><input v-model.number="inverterForm.maxPanels" type="number" min="1" step="1" class="form-control" required /></div>
                <div class="col-sm-6"><label class="form-label">Battery Voltage</label><input v-model.number="inverterForm.batterySupported" type="number" min="0" step="12" class="form-control" required /></div>
                <div class="col-sm-6"><label class="form-label">Cost (Rs)</label><input v-model.number="inverterForm.cost" type="number" min="0" step="1" class="form-control" required /></div>
              </div>
              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-success" :disabled="busy">{{ editingInverterId ? 'Update' : 'Add' }} Inverter</button>
                <button v-if="editingInverterId" type="button" class="btn btn-secondary" @click="resetInverterForm">Cancel</button>
              </div>
            </form>

            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead><tr><th>Name</th><th>KVA</th><th>Panels</th><th>Battery V</th><th>Cost</th><th v-if="canWriteEquipment"></th></tr></thead>
                <tbody>
                  <tr v-for="item in inverters" :key="item.id">
                    <td>{{ item.name }}</td><td>{{ item.peakLoad }}</td><td>{{ item.maxPanels }}</td><td>{{ item.batterySupported }}</td><td>Rs {{ money(item.cost) }}</td>
                    <td v-if="canWriteEquipment" class="text-nowrap">
                      <button class="btn btn-sm btn-outline-warning me-1" :disabled="busy" aria-label="Edit inverter" @click="editInverter(item)"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete inverter" @click="removeEquipment('inverter', item)"><i class="fas fa-trash"></i></button>
                    </td>
                  </tr>
                  <tr v-if="!inverters.length"><td :colspan="canWriteEquipment ? 6 : 5" class="text-center text-muted">No inverters configured.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div class="col-xl-6">
        <section class="card h-100">
          <div class="card-header bg-success text-white"><h4 class="mb-0">Batteries</h4></div>
          <div class="card-body">
            <form v-if="canWriteEquipment" @submit.prevent="saveBattery" class="border rounded p-3 mb-4">
              <h5>{{ editingBatteryId ? 'Edit Battery' : 'Add Battery' }}</h5>
              <div class="row g-2">
                <div class="col-12"><label class="form-label">Name</label><input v-model.trim="batteryForm.name" class="form-control" maxlength="120" required /></div>
                <div class="col-sm-4"><label class="form-label">Capacity (AH)</label><input v-model.number="batteryForm.capacity" type="number" min="0.01" step="0.01" class="form-control" required /></div>
                <div class="col-sm-4"><label class="form-label">Usable Energy (kWh)</label><input v-model.number="batteryForm.energy" type="number" min="0.01" step="0.01" class="form-control" required /></div>
                <div class="col-sm-4"><label class="form-label">Price (Rs)</label><input v-model.number="batteryForm.price" type="number" min="0" step="1" class="form-control" required /></div>
              </div>
              <button type="button" class="btn btn-sm btn-link px-0 mt-1" @click="calculateBatteryEnergy">Estimate energy from 12 V / 80% DoD</button>
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-success" :disabled="busy">{{ editingBatteryId ? 'Update' : 'Add' }} Battery</button>
                <button v-if="editingBatteryId" type="button" class="btn btn-secondary" @click="resetBatteryForm">Cancel</button>
              </div>
            </form>

            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead><tr><th>Name</th><th>AH</th><th>kWh</th><th>Price</th><th v-if="canWriteEquipment"></th></tr></thead>
                <tbody>
                  <tr v-for="item in batteries" :key="item.id">
                    <td>{{ item.name }}</td><td>{{ item.capacity }}</td><td>{{ item.energy }}</td><td>Rs {{ money(item.price) }}</td>
                    <td v-if="canWriteEquipment" class="text-nowrap">
                      <button class="btn btn-sm btn-outline-warning me-1" :disabled="busy" aria-label="Edit battery" @click="editBattery(item)"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete battery" @click="removeEquipment('battery', item)"><i class="fas fa-trash"></i></button>
                    </td>
                  </tr>
                  <tr v-if="!batteries.length"><td :colspan="canWriteEquipment ? 5 : 4" class="text-center text-muted">No batteries configured.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'EquipmentCatalog',
  mixins: [rbacMixin],
  data() {
    return {
      inverters: [],
      batteries: [],
      inverterForm: this.emptyInverter(),
      batteryForm: this.emptyBattery(),
      editingInverterId: '',
      editingBatteryId: '',
      loading: false,
      busy: false,
      error: '',
      successMessage: ''
    };
  },
  computed: {
    canWriteEquipment() {
      return this.can(PERMISSIONS.EQUIPMENT_WRITE);
    }
  },
  created() {
    this.loadCatalog();
  },
  methods: {
    emptyInverter() {
      return { name: '', peakLoad: null, maxPanels: null, batterySupported: 0, cost: 0 };
    },
    emptyBattery() {
      return { name: '', capacity: null, energy: null, price: 0 };
    },
    money(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numberValue(value));
    },
    notify(message) {
      this.successMessage = message;
      window.setTimeout(() => { this.successMessage = ''; }, 3000);
    },
    async loadCatalog() {
      this.loading = true;
      this.error = '';
      try {
        const response = await fetch('/.netlify/functions/getData');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load equipment catalog');
        this.inverters = Array.isArray(payload.inverters) ? payload.inverters : [];
        this.batteries = Array.isArray(payload.batteries) ? payload.batteries : [];
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    resetInverterForm() {
      this.inverterForm = this.emptyInverter();
      this.editingInverterId = '';
    },
    resetBatteryForm() {
      this.batteryForm = this.emptyBattery();
      this.editingBatteryId = '';
    },
    editInverter(item) {
      if (!this.canWriteEquipment) return;
      this.editingInverterId = item.id;
      this.inverterForm = {
        name: item.name || '',
        peakLoad: numberValue(item.peakLoad),
        maxPanels: numberValue(item.maxPanels),
        batterySupported: numberValue(item.batterySupported),
        cost: numberValue(item.cost)
      };
    },
    editBattery(item) {
      if (!this.canWriteEquipment) return;
      this.editingBatteryId = item.id;
      this.batteryForm = {
        name: item.name || '',
        capacity: numberValue(item.capacity),
        energy: numberValue(item.energy),
        price: numberValue(item.price)
      };
    },
    calculateBatteryEnergy() {
      if (!this.canWriteEquipment) return;
      const capacity = numberValue(this.batteryForm.capacity);
      if (capacity > 0) this.batteryForm.energy = Number(((capacity * 12 * 0.8) / 1000).toFixed(3));
    },
    async saveInverter() {
      if (!this.canWriteEquipment) {
        this.error = 'Your role does not allow equipment changes.';
        return;
      }
      this.busy = true;
      this.error = '';
      try {
        const endpoint = this.editingInverterId ? 'updateInverter' : 'addInverter';
        const body = this.editingInverterId
          ? { id: this.editingInverterId, updateData: this.inverterForm }
          : this.inverterForm;
        const result = await authenticatedJsonRequest(`/.netlify/functions/${endpoint}`, {
          method: this.editingInverterId ? 'PUT' : 'POST',
          body: JSON.stringify(body)
        });
        this.notify(result.message || 'Inverter saved.');
        this.resetInverterForm();
        await this.loadCatalog();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    async saveBattery() {
      if (!this.canWriteEquipment) {
        this.error = 'Your role does not allow equipment changes.';
        return;
      }
      this.busy = true;
      this.error = '';
      try {
        const endpoint = this.editingBatteryId ? 'updateBattery' : 'addBattery';
        const body = this.editingBatteryId
          ? { id: this.editingBatteryId, updateData: this.batteryForm }
          : this.batteryForm;
        const result = await authenticatedJsonRequest(`/.netlify/functions/${endpoint}`, {
          method: this.editingBatteryId ? 'PUT' : 'POST',
          body: JSON.stringify(body)
        });
        this.notify(result.message || 'Battery saved.');
        this.resetBatteryForm();
        await this.loadCatalog();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    async removeEquipment(type, item) {
      if (!this.canWriteEquipment) return;
      if (!window.confirm(`Delete ${item.name}? Existing project snapshots will remain unchanged.`)) return;
      this.busy = true;
      this.error = '';
      try {
        const endpoint = type === 'inverter' ? 'deleteInverter' : 'deleteBattery';
        const result = await authenticatedJsonRequest(`/.netlify/functions/${endpoint}`, {
          method: 'DELETE',
          body: JSON.stringify({ id: item.id })
        });
        this.notify(result.message || 'Equipment deleted.');
        await this.loadCatalog();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.card { border: 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
table td, table th { vertical-align: middle; }
</style>
