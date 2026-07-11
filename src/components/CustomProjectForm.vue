<template>
  <div class="custom-project container-fluid py-4">
    <div v-if="loading" class="loader-overlay" role="status">
      <div class="card p-4 text-center"><div class="spinner-border text-primary mx-auto mb-3"></div><strong>Please wait</strong><span class="text-muted">Loading or saving project information…</span></div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Create a managed project</h2>
        <p class="text-muted mb-0">Enter customer, system and pricing details in one controlled workflow.</p>
      </div>
      <router-link to="/admin/projects" class="btn btn-outline-secondary"><i class="fas fa-arrow-left me-2"></i>Back to projects</router-link>
    </div>

    <div v-if="statusMessage" :class="['alert', statusType === 'success' ? 'alert-success' : 'alert-danger']">
      <i :class="statusType === 'success' ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'" class="me-2"></i>{{ statusMessage }}
    </div>

    <form @submit.prevent="submitCustomProject">
      <div class="row g-4">
        <div class="col-xl-8">
          <section class="card mb-4">
            <div class="card-header"><span class="section-number">1</span><div><h3 class="h5 mb-1">Customer information</h3><p class="small text-muted mb-0">Contact and installation details for this project.</p></div></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Customer name</label><input v-model.trim="form.name" class="form-control" maxlength="100" autocomplete="name" required /></div>
                <div class="col-md-6"><label class="form-label">Email address</label><input v-model.trim="form.email" type="email" class="form-control" autocomplete="email" required /></div>
                <div class="col-md-6"><label class="form-label">Phone number</label><input v-model.trim="form.phone" type="tel" class="form-control" maxlength="20" autocomplete="tel" required /></div>
                <div class="col-md-6"><label class="form-label">Installation address</label><input v-model.trim="form.address" class="form-control" maxlength="500" autocomplete="street-address" required /></div>
              </div>
            </div>
          </section>

          <section class="card mb-4">
            <div class="card-header"><span class="section-number">2</span><div><h3 class="h5 mb-1">System equipment</h3><p class="small text-muted mb-0">Select catalog items or use a project-specific manual snapshot.</p></div></div>
            <div class="card-body">
              <div class="equipment-block mb-4">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div><h4 class="h6 mb-1">Inverter</h4><small class="text-muted">Required for every project.</small></div>
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleManual('inverter')"><i :class="manual.inverter ? 'fas fa-list' : 'fas fa-pen'" class="me-2"></i>{{ manual.inverter ? 'Choose catalog item' : 'Enter manually' }}</button>
                </div>
                <select v-if="!manual.inverter" v-model="form.selectedInverterId" class="form-select" required>
                  <option value="" disabled>Select inverter</option>
                  <option v-for="inverter in inverters" :key="inverter.id" :value="inverter.id">{{ inverter.name }} · {{ inverter.peakLoad }} KVA · max {{ inverter.maxPanels }} panels</option>
                </select>
                <div v-else class="row g-3">
                  <div class="col-md-5"><label class="form-label">Name</label><input v-model.trim="form.invName" class="form-control" required /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">KVA</label><input v-model.number="form.invPeakLoad" type="number" min="0" step="0.01" class="form-control" required /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">Max panels</label><input v-model.number="form.invMaxPanels" type="number" min="1" step="1" class="form-control" required /></div>
                  <div class="col-sm-6 col-md-1"><label class="form-label">Battery V</label><input v-model.number="form.invBatteryVolt" type="number" min="0" step="12" class="form-control" required /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">Cost</label><input v-model.number="form.invCost" type="number" min="0" step="1" class="form-control" required /></div>
                </div>
              </div>

              <div class="equipment-block">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div><h4 class="h6 mb-1">Battery</h4><small class="text-muted">Optional for grid-tie systems.</small></div>
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="toggleManual('battery')"><i :class="manual.battery ? 'fas fa-list' : 'fas fa-pen'" class="me-2"></i>{{ manual.battery ? 'Choose catalog item' : 'Enter manually' }}</button>
                </div>
                <div v-if="!manual.battery" class="row g-3">
                  <div class="col-md-9"><label class="form-label">Battery model</label><select v-model="form.selectedBatteryId" class="form-select"><option value="">No battery</option><option v-for="battery in batteries" :key="battery.id" :value="battery.id">{{ battery.name }} · {{ battery.capacity }} AH · {{ battery.energy }} kWh</option></select></div>
                  <div class="col-md-3"><label class="form-label">Quantity</label><input v-model.number="form.batteryQuantity" type="number" min="0" step="1" class="form-control" /></div>
                </div>
                <div v-else class="row g-3">
                  <div class="col-md-4"><label class="form-label">Name</label><input v-model.trim="form.batName" class="form-control" /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">Capacity AH</label><input v-model.number="form.batCapacity" type="number" min="0" class="form-control" /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">Energy kWh</label><input v-model.number="form.batEnergy" type="number" min="0" step="0.01" class="form-control" /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">Unit price</label><input v-model.number="form.batPrice" type="number" min="0" class="form-control" /></div>
                  <div class="col-sm-6 col-md-2"><label class="form-label">Quantity</label><input v-model.number="form.batteryQuantity" type="number" min="0" step="1" class="form-control" /></div>
                </div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-header"><span class="section-number">3</span><div><h3 class="h5 mb-1">Notes</h3><p class="small text-muted mb-0">Record customer requests or context required by the project team.</p></div></div>
            <div class="card-body"><label class="form-label">Customer notes</label><textarea v-model.trim="form.additionalNotes" class="form-control" rows="4" maxlength="1000"></textarea><div class="form-text text-end">{{ form.additionalNotes.length }}/1000</div></div>
          </section>
        </div>

        <div class="col-xl-4">
          <aside class="card pricing-card sticky-xl-top">
            <div class="card-header"><h3 class="h5 mb-1">System and pricing</h3><p class="small text-muted mb-0">Validate cost and quotation totals.</p></div>
            <div class="card-body">
              <div class="mb-3"><label class="form-label">Panel count</label><input v-model.number="form.panels" type="number" min="1" step="1" class="form-control" required /></div>
              <div class="mb-3"><label class="form-label">Equipment cost (Rs)</label><input v-model.number="form.materialCost" type="number" min="0" step="1" class="form-control" required /></div>
              <div class="mb-3"><label class="form-label">Labour cost (Rs)</label><input v-model.number="form.laborCost" type="number" min="0" step="1" class="form-control" required /></div>
              <div class="mb-3"><label class="form-label">Quoted price (Rs)</label><input v-model.number="form.quotedPrice" type="number" min="1" step="1" class="form-control" required /></div>

              <div class="pricing-summary">
                <div><span>Project cost</span><strong>Rs {{ money(projectCost) }}</strong></div>
                <div><span>Gross profit</span><strong :class="grossProfit >= 0 ? 'text-success' : 'text-danger'">Rs {{ money(grossProfit) }}</strong></div>
                <div><span>Margin</span><strong>{{ grossMargin.toFixed(2) }}%</strong></div>
              </div>

              <button type="submit" class="btn btn-primary w-100 mt-4" :disabled="loading"><i class="fas fa-folder-plus me-2"></i>Create project</button>
              <router-link to="/admin/projects" class="btn btn-outline-secondary w-100 mt-2">Cancel</router-link>
            </div>
          </aside>
        </div>
      </div>
    </form>
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
  computed: {
    projectCost() {
      return numberValue(this.form.materialCost) + numberValue(this.form.laborCost);
    },
    grossProfit() {
      return numberValue(this.form.quotedPrice) - this.projectCost;
    },
    grossMargin() {
      return this.projectCost > 0 ? (this.grossProfit / this.projectCost) * 100 : 0;
    }
  },
  mounted() {
    this.fetchData();
  },
  beforeUnmount() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  methods: {
    money(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numberValue(value));
    },
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
      if (numberValue(this.form.quotedPrice) < this.projectCost) return 'Quoted price cannot be lower than equipment plus labour cost.';
      if (numberValue(this.form.batteryQuantity) > 0 && !this.selectedBattery()) return 'Select or enter valid battery details.';
      return null;
    },
    async submitCustomProject() {
      this.statusMessage = '';
      const validationError = this.validate();
      if (validationError) {
        this.statusMessage = validationError;
        this.statusType = 'error';
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
.custom-project { max-width: 1500px; margin-inline: auto; }
.loader-overlay { position: fixed; inset: 0; z-index: 1090; display: grid; place-items: center; padding: 1rem; background: rgba(7,20,38,.45); backdrop-filter: blur(4px); }
.loader-overlay .card { min-width: min(360px, 100%); }
.card-header { display: flex; align-items: center; gap: 0.8rem; }
.section-number { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; border-radius: 10px; color: #fff; background: var(--ant-blue-700); font-weight: 800; }
.equipment-block { padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 11px; background: var(--ant-slate-50); }
.pricing-card { top: calc(var(--ant-topbar-height) + 1rem); }
.pricing-summary { display: grid; gap: 0.65rem; margin-top: 1rem; padding: 1rem; border: 1px solid #b2ccff; border-radius: 11px; background: #eff4ff; }
.pricing-summary div { display: flex; justify-content: space-between; gap: 1rem; }
.pricing-summary span { color: var(--ant-slate-600); }
</style>
