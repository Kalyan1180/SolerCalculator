<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Stock control</h2>
        <p class="text-muted mb-0">Track quantities, supplier details, cost and selling value.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <router-link v-if="canViewEquipment" to="/admin/equipment" class="btn btn-outline-secondary">
          <i class="fas fa-solar-panel me-2" aria-hidden="true"></i>Equipment catalog
        </router-link>
        <button v-if="canWriteInventory" class="btn btn-primary" @click="toggleForm">
          <i :class="showForm ? 'fas fa-xmark' : 'fas fa-plus'" class="me-2" aria-hidden="true"></i>
          {{ showForm ? 'Close form' : 'Add stock item' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success"><i class="fas fa-circle-check me-2"></i>{{ successMessage }}</div>

    <div class="row g-3 mb-4">
      <div v-for="metric in inventoryMetrics" :key="metric.label" class="col-6 col-xl-3">
        <article class="inventory-metric card h-100">
          <div class="card-body">
            <span class="inventory-metric__icon" :class="metric.className"><i :class="metric.icon" aria-hidden="true"></i></span>
            <div><small>{{ metric.label }}</small><strong>{{ metric.currency ? `Rs ${money(metric.value)}` : metric.value }}</strong></div>
          </div>
        </article>
      </div>
    </div>

    <section v-if="showForm && canWriteInventory" class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h3 class="h5 mb-1">{{ editingItemId ? 'Edit stock item' : 'Add stock item' }}</h3>
          <p class="small text-muted mb-0">Keep purchasing and sales information accurate for reporting.</p>
        </div>
        <span v-if="editingItemId" class="badge bg-warning text-dark">Editing</span>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveItem">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Item type</label>
              <select v-model="form.type" class="form-select" required>
                <option value="" disabled>Select type</option>
                <option v-for="type in itemTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
              </select>
            </div>
            <div class="col-md-8"><label class="form-label">Item name</label><input v-model.trim="form.name" class="form-control" maxlength="150" required /></div>
            <div class="col-md-4"><label class="form-label">Cost price (Rs)</label><input v-model.number="form.costPrice" type="number" min="0" step="0.01" class="form-control" required /></div>
            <div class="col-md-4"><label class="form-label">Selling price (Rs)</label><input v-model.number="form.sellingPrice" type="number" min="0" step="0.01" class="form-control" required /></div>
            <div class="col-md-4"><label class="form-label">Quantity</label><input v-model.number="form.quantity" type="number" min="0" step="1" class="form-control" required /></div>
            <div class="col-md-6"><label class="form-label">Supplier</label><input v-model.trim="form.supplier" class="form-control" maxlength="150" /></div>
            <div class="col-md-6"><label class="form-label">Description</label><input v-model.trim="form.description" class="form-control" maxlength="500" /></div>
          </div>

          <div class="profit-preview mt-4">
            <div><small>Profit per unit</small><strong :class="profitPerUnit >= 0 ? 'text-success' : 'text-danger'">Rs {{ money(profitPerUnit) }}</strong></div>
            <div><small>Gross margin</small><strong>{{ profitMargin.toFixed(2) }}%</strong></div>
            <div><small>Stock selling value</small><strong>Rs {{ money(numberValue(form.sellingPrice) * numberValue(form.quantity)) }}</strong></div>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-4">
            <button class="btn btn-primary" :disabled="busy">
              <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>
              {{ busy ? 'Saving…' : editingItemId ? 'Update item' : 'Add item' }}
            </button>
            <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="resetForm">Cancel</button>
          </div>
        </form>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div class="row g-3 align-items-end">
          <div class="col-lg-5">
            <label for="inventorySearch" class="form-label">Search inventory</label>
            <div class="input-group">
              <span class="input-group-text bg-white"><i class="fas fa-magnifying-glass text-muted"></i></span>
              <input id="inventorySearch" v-model.trim="searchQuery" type="search" class="form-control" placeholder="Item name, supplier or description" />
            </div>
          </div>
          <div class="col-sm-6 col-lg-3">
            <label for="inventoryType" class="form-label">Type</label>
            <select id="inventoryType" v-model="typeFilter" class="form-select">
              <option value="all">All types</option>
              <option v-for="type in itemTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </div>
          <div class="col-sm-6 col-lg-2">
            <label for="inventoryStatus" class="form-label">Status</label>
            <select id="inventoryStatus" v-model="statusFilter" class="form-select">
              <option value="all">All statuses</option>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
          <div class="col-lg-2">
            <button type="button" class="btn btn-outline-secondary w-100" :disabled="loading" @click="loadItems">
              <i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }"></i>Refresh
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Loading inventory…</p></div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead><tr><th>Item</th><th>Type</th><th>Cost</th><th>Selling</th><th>Profit</th><th>Stock</th><th>Status</th><th v-if="canWriteInventory">Actions</th></tr></thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id || item.itemId">
              <td><strong>{{ item.name }}</strong><br /><small class="text-muted">{{ item.supplier || 'No supplier' }}</small></td>
              <td><span class="type-chip">{{ typeLabel(item.type) }}</span></td>
              <td>Rs {{ money(item.costPrice) }}</td>
              <td>Rs {{ money(item.sellingPrice) }}</td>
              <td><strong :class="numberValue(item.profit) >= 0 ? 'text-success' : 'text-danger'">Rs {{ money(item.profit) }}</strong><br /><small class="text-muted">{{ numberValue(item.profitMargin).toFixed(2) }}%</small></td>
              <td><strong>{{ numberValue(item.quantity) }}</strong></td>
              <td><span class="stock-chip" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td>
              <td v-if="canWriteInventory" class="text-nowrap">
                <button class="btn btn-sm btn-outline-secondary me-1" :disabled="busy" aria-label="Edit inventory item" @click="editItem(item)"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete inventory item" @click="removeItem(item)"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
            <tr v-if="!filteredItems.length"><td :colspan="canWriteInventory ? 8 : 7" class="text-center py-5"><div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-box-open"></i></div><h3 class="h6">No matching stock items</h3><p class="text-muted mb-0">Change the filters or add a new inventory item.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import {
  createInventoryItem,
  deleteInventoryItem,
  getAllInventoryItems,
  updateInventoryItem
} from '@/models/inventoryModel';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'ManageInventory',
  mixins: [rbacMixin],
  data() {
    return {
      items: [],
      loading: false,
      busy: false,
      error: '',
      successMessage: '',
      showForm: false,
      editingItemId: '',
      searchQuery: '',
      typeFilter: 'all',
      statusFilter: 'all',
      form: this.emptyForm(),
      itemTypes: [
        { value: 'inverter', label: 'Inverter' },
        { value: 'battery', label: 'Battery' },
        { value: 'panel', label: 'Solar Panel' },
        { value: 'wiring', label: 'Wiring & Cables' },
        { value: 'mounting', label: 'Mounting Hardware' },
        { value: 'other', label: 'Other' }
      ]
    };
  },
  computed: {
    canWriteInventory() {
      return this.can(PERMISSIONS.INVENTORY_WRITE);
    },
    canViewEquipment() {
      return this.can(PERMISSIONS.EQUIPMENT_READ);
    },
    profitPerUnit() {
      return this.numberValue(this.form.sellingPrice) - this.numberValue(this.form.costPrice);
    },
    profitMargin() {
      const cost = this.numberValue(this.form.costPrice);
      return cost > 0 ? (this.profitPerUnit / cost) * 100 : 0;
    },
    inventoryMetrics() {
      return [
        { label: 'Stock items', value: this.items.length, currency: false, icon: 'fas fa-boxes-stacked', className: 'is-blue' },
        { label: 'Selling value', value: this.items.reduce((sum, item) => sum + this.numberValue(item.sellingPrice) * this.numberValue(item.quantity), 0), currency: true, icon: 'fas fa-indian-rupee-sign', className: 'is-teal' },
        { label: 'Low stock', value: this.items.filter(item => item.status === 'low_stock').length, currency: false, icon: 'fas fa-triangle-exclamation', className: 'is-amber' },
        { label: 'Out of stock', value: this.items.filter(item => item.status === 'out_of_stock').length, currency: false, icon: 'fas fa-circle-xmark', className: 'is-red' }
      ];
    },
    filteredItems() {
      const query = this.searchQuery.toLowerCase();
      return this.items.filter(item => {
        const matchesType = this.typeFilter === 'all' || item.type === this.typeFilter;
        const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
        const matchesQuery = !query || [item.name, item.supplier, item.description, item.type]
          .some(value => String(value || '').toLowerCase().includes(query));
        return matchesType && matchesStatus && matchesQuery;
      });
    }
  },
  created() {
    this.loadItems();
  },
  methods: {
    emptyForm() {
      return { type: '', name: '', description: '', costPrice: 0, sellingPrice: 0, quantity: 0, supplier: '' };
    },
    numberValue(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    },
    money(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(this.numberValue(value));
    },
    typeLabel(value) {
      return this.itemTypes.find(type => type.value === value)?.label || value || 'Other';
    },
    toggleForm() {
      if (!this.canWriteInventory) return;
      if (this.showForm) this.resetForm();
      else this.showForm = true;
    },
    notify(message) {
      this.successMessage = message;
      window.setTimeout(() => { this.successMessage = ''; }, 3000);
    },
    async loadItems() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAllInventoryItems();
        if (!result.success) throw new Error(result.error || 'Failed to load inventory');
        this.items = result.items;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async saveItem() {
      if (!this.canWriteInventory) return;
      this.busy = true;
      this.error = '';
      try {
        const result = this.editingItemId
          ? await updateInventoryItem(this.editingItemId, this.form)
          : await createInventoryItem(this.form);
        if (!result.success) throw new Error(result.error || 'Unable to save item');
        this.notify(this.editingItemId ? 'Item updated successfully.' : 'Item added successfully.');
        this.resetForm();
        await this.loadItems();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    editItem(item) {
      if (!this.canWriteInventory) return;
      this.editingItemId = item.id || item.itemId;
      this.form = {
        type: item.type || '',
        name: item.name || '',
        description: item.description || '',
        costPrice: this.numberValue(item.costPrice),
        sellingPrice: this.numberValue(item.sellingPrice),
        quantity: this.numberValue(item.quantity),
        supplier: item.supplier || ''
      };
      this.showForm = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async removeItem(item) {
      if (!this.canWriteInventory) return;
      const itemId = item.id || item.itemId;
      if (!itemId || !window.confirm(`Delete ${item.name}?`)) return;
      this.busy = true;
      this.error = '';
      try {
        const result = await deleteInventoryItem(itemId);
        if (!result.success) throw new Error(result.error || 'Unable to delete item');
        this.notify('Item deleted successfully.');
        await this.loadItems();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    resetForm() {
      this.form = this.emptyForm();
      this.editingItemId = '';
      this.showForm = false;
    },
    statusClass(status) {
      return { in_stock: 'is-in-stock', low_stock: 'is-low-stock', out_of_stock: 'is-out-of-stock' }[status] || 'is-unknown';
    },
    statusLabel(status) {
      return { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' }[status] || 'Unknown';
    }
  }
};
</script>

<style scoped>
.inventory-metric .card-body { display: flex; align-items: center; gap: 0.85rem; }
.inventory-metric__icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; }
.inventory-metric__icon.is-blue { color: var(--ant-blue-700); background: #eff4ff; }
.inventory-metric__icon.is-teal { color: var(--ant-teal-600); background: #f0fdfa; }
.inventory-metric__icon.is-amber { color: var(--ant-amber-600); background: #fffaeb; }
.inventory-metric__icon.is-red { color: var(--ant-red-600); background: #fef3f2; }
.inventory-metric small, .inventory-metric strong { display: block; }
.inventory-metric small { color: var(--ant-slate-500); }
.inventory-metric strong { color: var(--ant-slate-950); font-size: 1.2rem; }
.profit-preview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 11px; background: var(--ant-slate-50); }
.profit-preview div { padding: 0.5rem; }
.profit-preview small, .profit-preview strong { display: block; }
.profit-preview small { color: var(--ant-slate-500); }
.type-chip, .stock-chip { display: inline-flex; padding: 0.34rem 0.55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
.type-chip { color: #1849a9; background: #eff4ff; }
.stock-chip.is-in-stock { color: #067647; background: #ecfdf3; }
.stock-chip.is-low-stock { color: #93370d; background: #fffaeb; }
.stock-chip.is-out-of-stock { color: #b42318; background: #fef3f2; }
.stock-chip.is-unknown { color: var(--ant-slate-600); background: var(--ant-slate-100); }
@media (max-width: 767.98px) { .profit-preview { grid-template-columns: 1fr; } }
</style>
