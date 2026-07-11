<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Calculator equipment</h2>
        <p class="text-muted mb-0">Maintain inverter and battery options used during system recommendations.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadCatalog">
        <i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }" aria-hidden="true"></i>Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success"><i class="fas fa-circle-check me-2"></i>{{ successMessage }}</div>

    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-xl-3">
        <article class="catalog-metric card h-100"><div class="card-body"><span class="catalog-metric__icon is-blue"><i class="fas fa-plug-circle-bolt"></i></span><div><small>Inverters</small><strong>{{ inverters.length }}</strong></div></div></article>
      </div>
      <div class="col-sm-6 col-xl-3">
        <article class="catalog-metric card h-100"><div class="card-body"><span class="catalog-metric__icon is-green"><i class="fas fa-car-battery"></i></span><div><small>Batteries</small><strong>{{ batteries.length }}</strong></div></div></article>
      </div>
      <div class="col-sm-6 col-xl-3">
        <article class="catalog-metric card h-100"><div class="card-body"><span class="catalog-metric__icon is-teal"><i class="fas fa-bolt"></i></span><div><small>Highest inverter</small><strong>{{ highestInverterCapacity }} KVA</strong></div></div></article>
      </div>
      <div class="col-sm-6 col-xl-3">
        <article class="catalog-metric card h-100"><div class="card-body"><span class="catalog-metric__icon is-amber"><i class="fas fa-database"></i></span><div><small>Total records</small><strong>{{ inverters.length + batteries.length }}</strong></div></div></article>
      </div>
    </div>

    <section class="card">
      <div class="catalog-tabs" role="tablist" aria-label="Equipment type">
        <button type="button" class="catalog-tab" :class="{ active: activeTab === 'inverters' }" @click="activeTab = 'inverters'">
          <i class="fas fa-plug-circle-bolt me-2"></i>Inverters <span>{{ inverters.length }}</span>
        </button>
        <button type="button" class="catalog-tab" :class="{ active: activeTab === 'batteries' }" @click="activeTab = 'batteries'">
          <i class="fas fa-car-battery me-2"></i>Batteries <span>{{ batteries.length }}</span>
        </button>
      </div>

      <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Loading equipment catalog…</p></div>

      <template v-else-if="activeTab === 'inverters'">
        <div class="card-body border-bottom">
          <div class="d-flex flex-wrap justify-content-between align-items-end gap-3">
            <div class="flex-grow-1" style="max-width: 520px;">
              <label for="inverterSearch" class="form-label">Search inverters</label>
              <div class="input-group"><span class="input-group-text bg-white"><i class="fas fa-magnifying-glass text-muted"></i></span><input id="inverterSearch" v-model.trim="inverterSearch" type="search" class="form-control" placeholder="Name or capacity" /></div>
            </div>
            <button v-if="canWriteEquipment" type="button" class="btn btn-primary" @click="showInverterForm = !showInverterForm">
              <i :class="showInverterForm ? 'fas fa-xmark' : 'fas fa-plus'" class="me-2"></i>{{ showInverterForm ? 'Close form' : 'Add inverter' }}
            </button>
          </div>
        </div>

        <div v-if="showInverterForm && canWriteEquipment" class="catalog-form border-bottom">
          <form @submit.prevent="saveInverter">
            <div class="d-flex justify-content-between align-items-center mb-3"><div><h3 class="h5 mb-1">{{ editingInverterId ? 'Edit inverter' : 'Add inverter' }}</h3><p class="small text-muted mb-0">Capacity and panel limits affect calculator matching.</p></div><span v-if="editingInverterId" class="badge bg-warning text-dark">Editing</span></div>
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">Name</label><input v-model.trim="inverterForm.name" class="form-control" maxlength="120" required /></div>
              <div class="col-sm-6 col-md-3"><label class="form-label">Peak load (KVA)</label><input v-model.number="inverterForm.peakLoad" type="number" min="0.01" step="0.01" class="form-control" required /></div>
              <div class="col-sm-6 col-md-3"><label class="form-label">Maximum panels</label><input v-model.number="inverterForm.maxPanels" type="number" min="1" step="1" class="form-control" required /></div>
              <div class="col-sm-6 col-md-3"><label class="form-label">Battery voltage</label><input v-model.number="inverterForm.batterySupported" type="number" min="0" step="12" class="form-control" required /></div>
              <div class="col-sm-6 col-md-3"><label class="form-label">Cost (Rs)</label><input v-model.number="inverterForm.cost" type="number" min="0" step="1" class="form-control" required /></div>
            </div>
            <div class="d-flex gap-2 mt-4"><button class="btn btn-primary" :disabled="busy"><span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>{{ editingInverterId ? 'Update inverter' : 'Add inverter' }}</button><button type="button" class="btn btn-outline-secondary" @click="closeInverterForm">Cancel</button></div>
          </form>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Inverter</th><th>Peak load</th><th>Panel limit</th><th>Battery support</th><th>Cost</th><th v-if="canWriteEquipment">Actions</th></tr></thead>
            <tbody>
              <tr v-for="item in filteredInverters" :key="item.id">
                <td><strong>{{ item.name }}</strong></td><td>{{ item.peakLoad }} KVA</td><td>{{ item.maxPanels }}</td><td>{{ numberValue(item.batterySupported) > 0 ? `${item.batterySupported} V` : 'Grid-tie / none' }}</td><td><strong>Rs {{ money(item.cost) }}</strong></td>
                <td v-if="canWriteEquipment" class="text-nowrap"><button class="btn btn-sm btn-outline-secondary me-1" :disabled="busy" aria-label="Edit inverter" @click="editInverter(item)"><i class="fas fa-pen"></i></button><button class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete inverter" @click="removeEquipment('inverter', item)"><i class="fas fa-trash"></i></button></td>
              </tr>
              <tr v-if="!filteredInverters.length"><td :colspan="canWriteEquipment ? 6 : 5" class="text-center py-5"><div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-plug-circle-xmark"></i></div><h3 class="h6">No matching inverters</h3><p class="text-muted mb-0">Change the search or add a catalog record.</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="card-body border-bottom">
          <div class="d-flex flex-wrap justify-content-between align-items-end gap-3">
            <div class="flex-grow-1" style="max-width: 520px;">
              <label for="batterySearch" class="form-label">Search batteries</label>
              <div class="input-group"><span class="input-group-text bg-white"><i class="fas fa-magnifying-glass text-muted"></i></span><input id="batterySearch" v-model.trim="batterySearch" type="search" class="form-control" placeholder="Name, capacity or energy" /></div>
            </div>
            <button v-if="canWriteEquipment" type="button" class="btn btn-primary" @click="showBatteryForm = !showBatteryForm">
              <i :class="showBatteryForm ? 'fas fa-xmark' : 'fas fa-plus'" class="me-2"></i>{{ showBatteryForm ? 'Close form' : 'Add battery' }}
            </button>
          </div>
        </div>

        <div v-if="showBatteryForm && canWriteEquipment" class="catalog-form border-bottom">
          <form @submit.prevent="saveBattery">
            <div class="d-flex justify-content-between align-items-center mb-3"><div><h3 class="h5 mb-1">{{ editingBatteryId ? 'Edit battery' : 'Add battery' }}</h3><p class="small text-muted mb-0">Usable energy controls storage sizing in the calculator.</p></div><span v-if="editingBatteryId" class="badge bg-warning text-dark">Editing</span></div>
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">Name</label><input v-model.trim="batteryForm.name" class="form-control" maxlength="120" required /></div>
              <div class="col-sm-6 col-md-2"><label class="form-label">Capacity (AH)</label><input v-model.number="batteryForm.capacity" type="number" min="0.01" step="0.01" class="form-control" required /></div>
              <div class="col-sm-6 col-md-2"><label class="form-label">Energy (kWh)</label><input v-model.number="batteryForm.energy" type="number" min="0.01" step="0.01" class="form-control" required /></div>
              <div class="col-sm-6 col-md-2"><label class="form-label">Price (Rs)</label><input v-model.number="batteryForm.price" type="number" min="0" step="1" class="form-control" required /></div>
            </div>
            <button type="button" class="btn btn-sm btn-link px-0 mt-2" @click="calculateBatteryEnergy"><i class="fas fa-wand-magic-sparkles me-2"></i>Estimate energy using 12 V and 80% depth of discharge</button>
            <div class="d-flex gap-2 mt-3"><button class="btn btn-primary" :disabled="busy"><span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>{{ editingBatteryId ? 'Update battery' : 'Add battery' }}</button><button type="button" class="btn btn-outline-secondary" @click="closeBatteryForm">Cancel</button></div>
          </form>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Battery</th><th>Capacity</th><th>Usable energy</th><th>Price</th><th v-if="canWriteEquipment">Actions</th></tr></thead>
            <tbody>
              <tr v-for="item in filteredBatteries" :key="item.id">
                <td><strong>{{ item.name }}</strong></td><td>{{ item.capacity }} AH</td><td>{{ item.energy }} kWh</td><td><strong>Rs {{ money(item.price) }}</strong></td>
                <td v-if="canWriteEquipment" class="text-nowrap"><button class="btn btn-sm btn-outline-secondary me-1" :disabled="busy" aria-label="Edit battery" @click="editBattery(item)"><i class="fas fa-pen"></i></button><button class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete battery" @click="removeEquipment('battery', item)"><i class="fas fa-trash"></i></button></td>
              </tr>
              <tr v-if="!filteredBatteries.length"><td :colspan="canWriteEquipment ? 5 : 4" class="text-center py-5"><div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-battery-empty"></i></div><h3 class="h6">No matching batteries</h3><p class="text-muted mb-0">Change the search or add a catalog record.</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
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
      successMessage: '',
      activeTab: 'inverters',
      inverterSearch: '',
      batterySearch: '',
      showInverterForm: false,
      showBatteryForm: false
    };
  },
  computed: {
    canWriteEquipment() {
      return this.can(PERMISSIONS.EQUIPMENT_WRITE);
    },
    highestInverterCapacity() {
      return this.inverters.reduce((maximum, item) => Math.max(maximum, numberValue(item.peakLoad)), 0);
    },
    filteredInverters() {
      const query = this.inverterSearch.toLowerCase();
      return this.inverters.filter(item => !query || [item.name, item.peakLoad, item.maxPanels, item.batterySupported]
        .some(value => String(value || '').toLowerCase().includes(query)));
    },
    filteredBatteries() {
      const query = this.batterySearch.toLowerCase();
      return this.batteries.filter(item => !query || [item.name, item.capacity, item.energy, item.price]
        .some(value => String(value || '').toLowerCase().includes(query)));
    }
  },
  created() {
    this.loadCatalog();
  },
  methods: {
    numberValue,
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
    closeInverterForm() {
      this.resetInverterForm();
      this.showInverterForm = false;
    },
    closeBatteryForm() {
      this.resetBatteryForm();
      this.showBatteryForm = false;
    },
    editInverter(item) {
      if (!this.canWriteEquipment) return;
      this.activeTab = 'inverters';
      this.showInverterForm = true;
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
      this.activeTab = 'batteries';
      this.showBatteryForm = true;
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
      if (!this.canWriteEquipment) return;
      this.busy = true;
      this.error = '';
      try {
        const endpoint = this.editingInverterId ? 'updateInverter' : 'addInverter';
        const body = this.editingInverterId ? { id: this.editingInverterId, updateData: this.inverterForm } : this.inverterForm;
        const result = await authenticatedJsonRequest(`/.netlify/functions/${endpoint}`, { method: this.editingInverterId ? 'PUT' : 'POST', body: JSON.stringify(body) });
        this.notify(result.message || 'Inverter saved.');
        this.closeInverterForm();
        await this.loadCatalog();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    async saveBattery() {
      if (!this.canWriteEquipment) return;
      this.busy = true;
      this.error = '';
      try {
        const endpoint = this.editingBatteryId ? 'updateBattery' : 'addBattery';
        const body = this.editingBatteryId ? { id: this.editingBatteryId, updateData: this.batteryForm } : this.batteryForm;
        const result = await authenticatedJsonRequest(`/.netlify/functions/${endpoint}`, { method: this.editingBatteryId ? 'PUT' : 'POST', body: JSON.stringify(body) });
        this.notify(result.message || 'Battery saved.');
        this.closeBatteryForm();
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
        const result = await authenticatedJsonRequest(`/.netlify/functions/${endpoint}`, { method: 'DELETE', body: JSON.stringify({ id: item.id }) });
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
.catalog-metric .card-body { display: flex; align-items: center; gap: 0.85rem; }
.catalog-metric__icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; }
.catalog-metric__icon.is-blue { color: var(--ant-blue-700); background: #eff4ff; }
.catalog-metric__icon.is-green { color: var(--ant-green-600); background: #ecfdf3; }
.catalog-metric__icon.is-teal { color: var(--ant-teal-600); background: #f0fdfa; }
.catalog-metric__icon.is-amber { color: var(--ant-amber-600); background: #fffaeb; }
.catalog-metric small, .catalog-metric strong { display: block; }
.catalog-metric small { color: var(--ant-slate-500); }
.catalog-metric strong { color: var(--ant-slate-950); font-size: 1.2rem; }
.catalog-tabs { display: flex; gap: 0.25rem; padding: 0.55rem; border-bottom: 1px solid var(--ant-slate-200); background: var(--ant-slate-50); }
.catalog-tab { display: inline-flex; align-items: center; min-height: 42px; padding: 0.55rem 0.85rem; border: 0; border-radius: 9px; color: var(--ant-slate-600); background: transparent; font-weight: 700; }
.catalog-tab span { display: grid; place-items: center; min-width: 24px; height: 24px; margin-left: 0.55rem; padding: 0 0.35rem; border-radius: 999px; background: var(--ant-slate-200); font-size: 0.7rem; }
.catalog-tab.active { color: var(--ant-blue-700); background: #fff; box-shadow: var(--ant-shadow-sm); }
.catalog-tab.active span { color: #fff; background: var(--ant-blue-700); }
.catalog-form { padding: 1.25rem; background: #fbfcfe; }
</style>
