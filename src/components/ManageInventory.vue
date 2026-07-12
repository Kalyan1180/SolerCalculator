<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Smart Inventory & Equipment</h2>
        <p class="text-muted mb-0">One catalogue controls system suggestions, project demand and restocking.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button v-if="canWriteInventory" class="btn btn-outline-primary" :disabled="busy" @click="seedPanelModels">
          <i class="fas fa-solar-panel me-2" aria-hidden="true"></i>Add panel starters
        </button>
        <button v-if="canWriteInventory && hasLegacyFallback" class="btn btn-outline-warning" :disabled="busy" @click="migrateLegacy">
          <i class="fas fa-file-import me-2" aria-hidden="true"></i>Import legacy equipment
        </button>
        <button v-if="canWriteInventory" class="btn btn-primary" @click="toggleForm">
          <i :class="showForm ? 'fas fa-xmark' : 'fas fa-plus'" class="me-2" aria-hidden="true"></i>
          {{ showForm ? 'Close form' : 'Add equipment or stock' }}
        </button>
      </div>
    </div>

    <div class="alert alert-info planning-note">
      <i class="fas fa-lightbulb me-2" aria-hidden="true"></i>
      <strong>Planning logic:</strong> approved, scheduled and in-progress projects are committed demand. Pending and sent quotations are forecast demand. Restock priority considers demand, safety stock and supplier lead time.
    </div>
    <div v-if="hasLegacyFallback" class="alert alert-warning">
      Legacy inverter or battery records are shown as out of stock. Import them once, then enter actual quantities and supplier settings.
    </div>
    <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success"><i class="fas fa-circle-check me-2"></i>{{ successMessage }}</div>

    <div class="row g-3 mb-4">
      <div v-for="metric in inventoryMetrics" :key="metric.label" class="col-6 col-xl-3">
        <article class="inventory-metric card h-100">
          <div class="card-body">
            <span class="inventory-metric__icon" :class="metric.className"><i :class="metric.icon" aria-hidden="true"></i></span>
            <div><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></div>
          </div>
        </article>
      </div>
    </div>

    <section v-if="showForm && canWriteInventory" class="card mb-4">
      <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h3 class="h5 mb-1">{{ editingItemId ? 'Edit inventory item' : 'Add inventory item' }}</h3>
          <p class="small text-muted mb-0">Technical specifications determine whether the calculator can recommend this item.</p>
        </div>
        <span v-if="editingItemId" class="badge bg-warning text-dark">Editing {{ form.sku || 'item' }}</span>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveItem">
          <h4 class="h6 text-uppercase text-muted mb-3">Identity and pricing</h4>
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label">Item type</label>
              <select v-model="form.type" class="form-select" required>
                <option value="" disabled>Select type</option>
                <option v-for="type in itemTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
              </select>
            </div>
            <div class="col-md-3"><label class="form-label">SKU</label><input v-model.trim="form.sku" class="form-control" maxlength="80" placeholder="Auto-generated if blank" /></div>
            <div class="col-md-6"><label class="form-label">Item name</label><input v-model.trim="form.name" class="form-control" maxlength="150" required /></div>
            <div class="col-md-3"><label class="form-label">Cost price (Rs)</label><input v-model.number="form.costPrice" type="number" min="0" step="0.01" class="form-control" required /></div>
            <div class="col-md-3"><label class="form-label">Selling price (Rs)</label><input v-model.number="form.sellingPrice" type="number" min="0" step="0.01" class="form-control" required /></div>
            <div class="col-md-3"><label class="form-label">Supplier</label><input v-model.trim="form.supplier" class="form-control" maxlength="150" /></div>
            <div class="col-md-3"><label class="form-label">Unit</label><select v-model="form.unit" class="form-select"><option value="piece">Piece</option><option value="kit">Kit</option><option value="set">Set</option><option value="meter">Meter</option></select></div>
            <div class="col-12"><label class="form-label">Description</label><input v-model.trim="form.description" class="form-control" maxlength="500" /></div>
          </div>

          <hr class="my-4" />
          <h4 class="h6 text-uppercase text-muted mb-3">Stock policy</h4>
          <div class="row g-3">
            <div class="col-sm-6 col-lg-3"><label class="form-label">On-hand quantity</label><input v-model.number="form.quantity" type="number" min="0" step="1" class="form-control" required /></div>
            <div class="col-sm-6 col-lg-3"><label class="form-label">Reorder point</label><input v-model.number="form.reorderPoint" type="number" min="0" step="1" class="form-control" required /><div class="form-text">Low-stock trigger after committed demand.</div></div>
            <div class="col-sm-6 col-lg-3"><label class="form-label">Target stock</label><input v-model.number="form.targetStock" type="number" min="1" step="1" class="form-control" required /><div class="form-text">Desired stock after demand is covered.</div></div>
            <div class="col-sm-6 col-lg-3"><label class="form-label">Lead time (days)</label><input v-model.number="form.leadTimeDays" type="number" min="1" step="1" class="form-control" required /></div>
          </div>

          <hr class="my-4" />
          <h4 class="h6 text-uppercase text-muted mb-3">Calculator specifications</h4>
          <div class="form-check form-switch mb-3">
            <input id="activeForCalculator" v-model="form.activeForCalculator" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="activeForCalculator">Allow the calculator to recommend this inventory item</label>
          </div>

          <div v-if="form.type === 'panel'" class="row g-3">
            <div class="col-md-4"><label class="form-label">Panel category</label><select v-model="form.specs.panelType" class="form-select"><option value="">Not specified</option><option value="bifacial">Bifacial</option><option value="non_bifacial">Non-bifacial</option></select></div>
            <div class="col-md-4"><label class="form-label">Panel wattage</label><input v-model.number="form.specs.wattage" type="number" min="1" step="1" class="form-control" :required="form.activeForCalculator" /></div>
            <div class="col-md-4"><label class="form-label">Cell technology</label><input v-model.trim="form.specs.technology" class="form-control" placeholder="HJT, TOPCon, Mono PERC…" maxlength="80" /></div>
          </div>

          <div v-if="form.type === 'inverter'" class="row g-3">
            <div class="col-md-4"><label class="form-label">Peak load (KVA)</label><input v-model.number="form.specs.peakLoad" type="number" min="0.01" step="0.01" class="form-control" :required="form.activeForCalculator" /></div>
            <div class="col-md-4"><label class="form-label">Maximum panels</label><input v-model.number="form.specs.maxPanels" type="number" min="1" step="1" class="form-control" :required="form.activeForCalculator" /></div>
            <div class="col-md-4"><label class="form-label">Battery bank voltage</label><input v-model.number="form.specs.batterySupported" type="number" min="0" step="12" class="form-control" /><div class="form-text">Use 0 for grid-tie/no battery.</div></div>
          </div>

          <div v-if="form.type === 'battery'" class="row g-3">
            <div class="col-md-4"><label class="form-label">Capacity (Ah)</label><input v-model.number="form.specs.capacity" type="number" min="0.01" step="0.01" class="form-control" :required="form.activeForCalculator" /></div>
            <div class="col-md-4"><label class="form-label">Usable energy (kWh)</label><input v-model.number="form.specs.energy" type="number" min="0.01" step="0.001" class="form-control" :required="form.activeForCalculator" /></div>
            <div class="col-md-4"><label class="form-label">Nominal voltage</label><input v-model.number="form.specs.voltage" type="number" min="1" step="1" class="form-control" /></div>
          </div>

          <div v-if="isAccessoryType" class="row g-3">
            <div class="col-12"><div class="form-check form-switch"><input id="autoInclude" v-model="form.specs.autoInclude" class="form-check-input" type="checkbox" /><label for="autoInclude" class="form-check-label">Automatically include this item in every recommended system</label></div></div>
            <div class="col-md-6"><label class="form-label">Fixed quantity per system</label><input v-model.number="form.specs.fixedQuantityPerSystem" type="number" min="0" step="0.01" class="form-control" /></div>
            <div class="col-md-6"><label class="form-label">Quantity per panel</label><input v-model.number="form.specs.perPanelQuantity" type="number" min="0" step="0.01" class="form-control" /></div>
          </div>

          <div class="row g-3 mt-2">
            <div class="col-md-6"><div class="profit-preview h-100"><div><small>Profit per unit</small><strong :class="profitPerUnit >= 0 ? 'text-success' : 'text-danger'">Rs {{ money(profitPerUnit) }}</strong></div><div><small>Gross margin</small><strong>{{ profitMargin.toFixed(2) }}%</strong></div></div></div>
            <div class="col-md-6 d-flex align-items-center"><div class="form-check form-switch"><input id="discontinued" v-model="form.discontinued" class="form-check-input" type="checkbox" /><label for="discontinued" class="form-check-label">Discontinued — exclude from recommendations and restock orders</label></div></div>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-4">
            <button class="btn btn-primary" :disabled="busy"><span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>{{ busy ? 'Saving…' : editingItemId ? 'Update item' : 'Add item' }}</button>
            <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="resetForm">Cancel</button>
          </div>
        </form>
      </div>
    </section>

    <div class="card mb-4">
      <div class="card-header border-bottom-0 pb-0"><ul class="nav nav-tabs card-header-tabs"><li class="nav-item"><button type="button" :class="['nav-link', { active: activeTab === 'stock' }]" @click="activeTab = 'stock'">Inventory catalogue</button></li><li class="nav-item"><button type="button" :class="['nav-link', { active: activeTab === 'restock' }]" @click="activeTab = 'restock'">Restock planner <span v-if="restockItems.length" class="badge bg-danger ms-1">{{ restockItems.length }}</span></button></li></ul></div>
      <div class="card-body border-bottom"><div class="row g-3 align-items-end"><div class="col-lg-4"><label for="inventorySearch" class="form-label">Search</label><input id="inventorySearch" v-model.trim="searchQuery" type="search" class="form-control" placeholder="Name, SKU, supplier or type" /></div><div class="col-sm-6 col-lg-2"><label class="form-label">Type</label><select v-model="typeFilter" class="form-select"><option value="all">All types</option><option v-for="type in itemTypes" :key="type.value" :value="type.value">{{ type.label }}</option></select></div><div class="col-sm-6 col-lg-2"><label class="form-label">Priority</label><select v-model="priorityFilter" class="form-select"><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div><div class="col-sm-6 col-lg-2"><label class="form-label">Stock status</label><select v-model="statusFilter" class="form-select"><option value="all">All statuses</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="discontinued">Discontinued</option></select></div><div class="col-sm-6 col-lg-2"><button type="button" class="btn btn-outline-secondary w-100" :disabled="loading" @click="loadPlan"><i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }"></i>Refresh</button></div></div></div>

      <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Calculating live stock demand…</p></div>

      <div v-else-if="activeTab === 'stock'" class="table-responsive">
        <table class="table table-hover align-middle mb-0 smart-stock-table">
          <thead><tr><th>Item</th><th>Calculator</th><th>On hand</th><th>Committed</th><th>Quotations</th><th>Available</th><th>Projected shortfall</th><th>Priority</th><th v-if="canWriteInventory">Actions</th></tr></thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td><strong>{{ item.name }}</strong><br /><small class="text-muted">{{ item.sku || 'No SKU' }} · {{ typeLabel(item.type) }}<span v-if="item.type === 'panel' && item.specs?.panelType"> · {{ panelTypeLabel(item.specs.panelType) }}</span><span v-if="item.supplier"> · {{ item.supplier }}</span></small></td>
              <td><span v-if="item.activeForCalculator" class="badge bg-primary-subtle text-primary-emphasis">Enabled</span><span v-else class="text-muted">—</span></td>
              <td><strong>{{ numberValue(item.quantity) }}</strong> {{ item.unit }}</td><td>{{ numberValue(item.committedDemand) }}</td><td>{{ numberValue(item.quotationDemand) }}</td><td><strong :class="numberValue(item.availableAfterCommitted) <= numberValue(item.reorderPoint) ? 'text-warning' : 'text-success'">{{ numberValue(item.availableAfterCommitted) }}</strong></td><td><strong :class="numberValue(item.projectedShortfall) > 0 ? 'text-danger' : 'text-success'">{{ numberValue(item.projectedShortfall) }}</strong></td><td><span class="priority-chip" :class="`is-${item.priority}`">{{ priorityLabel(item.priority) }}</span><br /><small class="text-muted">Score {{ numberValue(item.priorityScore) }}</small></td>
              <td v-if="canWriteInventory" class="text-nowrap"><button v-if="!item.legacySource || item.createdAt" class="btn btn-sm btn-outline-secondary me-1" :disabled="busy" aria-label="Edit inventory item" @click="editItem(item)"><i class="fas fa-pen"></i></button><button v-if="!item.legacySource || item.createdAt" class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete inventory item" @click="removeItem(item)"><i class="fas fa-trash"></i></button><span v-else class="small text-warning">Import first</span></td>
            </tr>
            <tr v-if="!filteredItems.length"><td :colspan="canWriteInventory ? 9 : 8" class="text-center py-5"><div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-box-open"></i></div><h3 class="h6">No matching inventory</h3><p class="text-muted mb-0">Change the filters or add a new item.</p></div></td></tr>
          </tbody>
        </table>
      </div>

      <div v-else class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Restock rank</th><th>Item</th><th>Why it is urgent</th><th>Shortfall</th><th>Recommended order</th><th>Lead time</th><th>Supplier</th></tr></thead><tbody><tr v-for="(item, index) in filteredRestockItems" :key="item.id"><td><span class="rank-badge">#{{ index + 1 }}</span></td><td><strong>{{ item.name }}</strong><br /><small class="text-muted">{{ item.sku || 'No SKU' }} · {{ typeLabel(item.type) }}</small></td><td><span class="priority-chip me-2" :class="`is-${item.priority}`">{{ priorityLabel(item.priority) }}</span><small>{{ restockReason(item) }}</small></td><td><div>Committed: <strong :class="item.committedShortfall > 0 ? 'text-danger' : ''">{{ item.committedShortfall }}</strong></div><div>Quotation: <strong :class="item.quotationShortfall > 0 ? 'text-warning' : ''">{{ item.quotationShortfall }}</strong></div></td><td><strong class="fs-5">{{ item.recommendedOrder }}</strong> {{ item.unit }}</td><td>{{ item.leadTimeDays }} day(s)</td><td>{{ item.supplier || 'Supplier not assigned' }}</td></tr><tr v-if="!filteredRestockItems.length"><td colspan="7" class="text-center py-5"><div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-circle-check"></i></div><h3 class="h6">No restock action for this filter</h3><p class="text-muted mb-0">Current stock covers demand and configured stock policy.</p></div></td></tr></tbody></table></div>
    </div>
  </div>
</template>

<script>
import { createInventoryItem, deleteInventoryItem, updateInventoryItem } from '@/models/inventoryModel';
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'ManageInventory',
  mixins: [rbacMixin],
  data() {
    return {
      items: [], summary: {}, loading: false, busy: false, error: '', successMessage: '', showForm: false, editingItemId: '', activeTab: 'stock', searchQuery: '', typeFilter: 'all', priorityFilter: 'all', statusFilter: 'all', hasLegacyFallback: false,
      form: this.emptyForm(),
      itemTypes: [
        { value: 'panel', label: 'Solar Panel' }, { value: 'inverter', label: 'Inverter' }, { value: 'battery', label: 'Battery' }, { value: 'wiring', label: 'Wiring & Cables' }, { value: 'mounting', label: 'Mounting Hardware' }, { value: 'other', label: 'Other / Accessory' }
      ]
    };
  },
  computed: {
    canWriteInventory() { return this.can(PERMISSIONS.INVENTORY_WRITE); },
    isAccessoryType() { return ['wiring', 'mounting', 'other'].includes(this.form.type); },
    profitPerUnit() { return this.numberValue(this.form.sellingPrice) - this.numberValue(this.form.costPrice); },
    profitMargin() { const cost = this.numberValue(this.form.costPrice); return cost > 0 ? (this.profitPerUnit / cost) * 100 : 0; },
    inventoryMetrics() { return [{ label: 'Inventory items', value: this.numberValue(this.summary.totalItems), icon: 'fas fa-boxes-stacked', className: 'is-blue' }, { label: 'Committed demand', value: this.numberValue(this.summary.committedDemand), icon: 'fas fa-lock', className: 'is-purple' }, { label: 'Projected shortfall', value: this.numberValue(this.summary.projectedShortfall), icon: 'fas fa-triangle-exclamation', className: 'is-amber' }, { label: 'Critical restocks', value: this.numberValue(this.summary.criticalItems), icon: 'fas fa-fire', className: 'is-red' }]; },
    filteredItems() { const query = this.searchQuery.toLowerCase(); return this.items.filter(item => { const matchesType = this.typeFilter === 'all' || item.type === this.typeFilter; const matchesPriority = this.priorityFilter === 'all' || item.priority === this.priorityFilter; const matchesStatus = this.statusFilter === 'all' || item.stockStatus === this.statusFilter; const matchesQuery = !query || [item.name, item.sku, item.supplier, item.description, item.type, item.specs?.panelType, item.specs?.technology].some(value => String(value || '').toLowerCase().includes(query)); return matchesType && matchesPriority && matchesStatus && matchesQuery; }); },
    restockItems() { return this.items.filter(item => !item.discontinued && this.numberValue(item.recommendedOrder) > 0); },
    filteredRestockItems() { const eligibleIds = new Set(this.filteredItems.map(item => item.id)); return this.restockItems.filter(item => eligibleIds.has(item.id)); }
  },
  created() { this.loadPlan(); },
  methods: {
    emptyForm() { return { type: '', sku: '', name: '', description: '', costPrice: 0, sellingPrice: 0, quantity: 0, reorderPoint: 5, targetStock: 10, leadTimeDays: 7, supplier: '', unit: 'piece', activeForCalculator: false, discontinued: false, specs: { wattage: null, technology: '', panelType: '', peakLoad: null, maxPanels: null, batterySupported: 0, capacity: null, energy: null, voltage: 12, fixedQuantityPerSystem: 0, perPanelQuantity: 0, autoInclude: false } }; },
    numberValue(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; },
    money(value) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(this.numberValue(value)); },
    typeLabel(value) { return this.itemTypes.find(type => type.value === value)?.label || value || 'Other'; },
    panelTypeLabel(value) { return value === 'bifacial' ? 'Bifacial' : value === 'non_bifacial' ? 'Non-bifacial' : 'Not specified'; },
    priorityLabel(value) { return { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }[value] || 'Low'; },
    restockReason(item) { if (item.committedShortfall > 0) return `${item.committedProjectCount} committed project(s) cannot be fully supplied.`; if (item.quotationShortfall > 0) return `${item.quotationProjectCount} quotation(s) create projected shortage.`; if (item.availableAfterCommitted <= item.reorderPoint) return 'Available stock is at or below the reorder point.'; return 'Projected balance is below the configured target stock.'; },
    toggleForm() { if (!this.canWriteInventory) return; if (this.showForm) this.resetForm(); else this.showForm = true; },
    notify(message) { this.successMessage = message; window.setTimeout(() => { this.successMessage = ''; }, 4000); },
    async loadPlan() { this.loading = true; this.error = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/getInventoryPlan', { method: 'GET' }); this.items = Array.isArray(result.items) ? result.items : []; this.summary = result.summary || {}; this.hasLegacyFallback = Boolean(result.hasLegacyFallback); } catch (error) { this.error = error.message || 'Unable to load inventory planning data.'; } finally { this.loading = false; } },
    async seedPanelModels() { if (!this.canWriteInventory) return; this.busy = true; this.error = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/seedPanelTypes', { method: 'POST' }); this.notify(result.message); await this.loadPlan(); } catch (error) { this.error = error.message; } finally { this.busy = false; } },
    async migrateLegacy() { if (!this.canWriteInventory || !window.confirm('Import the old inverter and battery catalogue into inventory with quantity 0?')) return; this.busy = true; this.error = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/migrateLegacyEquipment', { method: 'POST' }); this.notify(result.message || 'Legacy equipment imported.'); await this.loadPlan(); } catch (error) { this.error = error.message; } finally { this.busy = false; } },
    async saveItem() { if (!this.canWriteInventory) return; this.busy = true; this.error = ''; try { const payload = { ...this.form, specs: { ...this.form.specs } }; const result = this.editingItemId ? await updateInventoryItem(this.editingItemId, payload) : await createInventoryItem(payload); if (!result.success) throw new Error(result.error || 'Unable to save inventory item'); this.notify(this.editingItemId ? 'Inventory item updated.' : 'Inventory item added.'); this.resetForm(); await this.loadPlan(); } catch (error) { this.error = error.message; } finally { this.busy = false; } },
    editItem(item) { if (!this.canWriteInventory || (item.legacySource && !item.createdAt)) return; this.editingItemId = item.id; this.form = { type: item.type || '', sku: item.sku || '', name: item.name || '', description: item.description || '', costPrice: this.numberValue(item.costPrice), sellingPrice: this.numberValue(item.sellingPrice), quantity: this.numberValue(item.quantity), reorderPoint: this.numberValue(item.reorderPoint), targetStock: this.numberValue(item.targetStock), leadTimeDays: this.numberValue(item.leadTimeDays) || 7, supplier: item.supplier || '', unit: item.unit || 'piece', activeForCalculator: Boolean(item.activeForCalculator), discontinued: Boolean(item.discontinued), specs: { ...this.emptyForm().specs, ...(item.specs || {}) } }; this.showForm = true; window.scrollTo({ top: 0, behavior: 'smooth' }); },
    async removeItem(item) { if (!this.canWriteInventory || !window.confirm(`Delete ${item.name}? Existing project snapshots remain unchanged.`)) return; this.busy = true; this.error = ''; try { const result = await deleteInventoryItem(item.id); if (!result.success) throw new Error(result.error || 'Unable to delete item'); this.notify('Inventory item deleted.'); await this.loadPlan(); } catch (error) { this.error = error.message; } finally { this.busy = false; } },
    resetForm() { this.form = this.emptyForm(); this.editingItemId = ''; this.showForm = false; }
  }
};
</script>

<style scoped>
.planning-note { border-left: 4px solid var(--ant-blue-600); }.inventory-metric__icon { flex: 0 0 auto; }.profit-preview { display: flex; justify-content: space-around; gap: 1rem; padding: 1rem; border-radius: 12px; background: var(--ant-slate-50); border: 1px solid var(--ant-slate-200); }.profit-preview div { display: flex; flex-direction: column; }.priority-chip { display: inline-flex; padding: 0.3rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; }.priority-chip.is-critical { background: #fee2e2; color: #991b1b; }.priority-chip.is-high { background: #ffedd5; color: #9a3412; }.priority-chip.is-medium { background: #fef3c7; color: #92400e; }.priority-chip.is-low { background: #e2e8f0; color: #475569; }.rank-badge { display: inline-grid; place-items: center; width: 2.2rem; height: 2.2rem; border-radius: 50%; background: var(--ant-slate-900); color: #fff; font-weight: 800; }.smart-stock-table th { white-space: nowrap; }@media (max-width: 767.98px) { .profit-preview { flex-direction: column; } }
</style>
