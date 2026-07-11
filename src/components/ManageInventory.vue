<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">Stock Inventory</h2>
        <p class="text-muted mb-0">Track purchasing cost, selling price, supplier, and available stock.</p>
      </div>
      <div class="d-flex gap-2">
        <router-link v-if="canViewEquipment" to="/admin/equipment" class="btn btn-outline-primary">Calculator Catalog</router-link>
        <button v-if="canWriteInventory" class="btn btn-primary" @click="toggleForm">{{ showForm ? 'Close Form' : 'Add Item' }}</button>
      </div>
    </div>

    <div v-if="!accessLoading && !canWriteInventory" class="alert alert-info">
      Read-only access: your role can view stock but cannot add, edit or delete inventory records.
    </div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

    <section v-if="showForm && canWriteInventory" class="card mb-4">
      <div class="card-header bg-primary text-white"><h5 class="mb-0">{{ editingItemId ? 'Edit Item' : 'Add Inventory Item' }}</h5></div>
      <div class="card-body">
        <form @submit.prevent="saveItem">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Item Type</label>
              <select v-model="form.type" class="form-select" required>
                <option value="" disabled>Select type</option>
                <option v-for="type in itemTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
              </select>
            </div>
            <div class="col-md-8"><label class="form-label">Item Name</label><input v-model.trim="form.name" class="form-control" maxlength="150" required /></div>
            <div class="col-md-4"><label class="form-label">Cost Price (Rs)</label><input v-model.number="form.costPrice" type="number" min="0" step="0.01" class="form-control" required /></div>
            <div class="col-md-4"><label class="form-label">Selling Price (Rs)</label><input v-model.number="form.sellingPrice" type="number" min="0" step="0.01" class="form-control" required /></div>
            <div class="col-md-4"><label class="form-label">Quantity</label><input v-model.number="form.quantity" type="number" min="0" step="1" class="form-control" required /></div>
            <div class="col-md-6"><label class="form-label">Supplier</label><input v-model.trim="form.supplier" class="form-control" maxlength="150" /></div>
            <div class="col-md-6"><label class="form-label">Description</label><input v-model.trim="form.description" class="form-control" maxlength="500" /></div>
          </div>

          <div class="rounded bg-light p-3 mt-3">
            <strong>Profit per unit:</strong> Rs {{ money(profitPerUnit) }}
            <span class="mx-2">|</span>
            <strong>Margin:</strong> {{ profitMargin.toFixed(2) }}%
          </div>

          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-success" :disabled="busy">{{ busy ? 'Saving...' : 'Save Item' }}</button>
            <button type="button" class="btn btn-secondary" :disabled="busy" @click="resetForm">Cancel</button>
          </div>
        </form>
      </div>
    </section>

    <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div></div>

    <section v-else class="card">
      <div class="card-header bg-secondary text-white"><h5 class="mb-0">Inventory Items ({{ items.length }})</h5></div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light"><tr><th>Type</th><th>Name</th><th>Cost</th><th>Selling</th><th>Profit</th><th>Stock</th><th>Status</th><th v-if="canWriteInventory"></th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id || item.itemId">
              <td><span class="badge bg-info text-dark">{{ item.type }}</span></td>
              <td><strong>{{ item.name }}</strong><br /><small class="text-muted">{{ item.supplier || 'No supplier' }}</small></td>
              <td>Rs {{ money(item.costPrice) }}</td>
              <td>Rs {{ money(item.sellingPrice) }}</td>
              <td :class="numberValue(item.profit) >= 0 ? 'text-success' : 'text-danger'">Rs {{ money(item.profit) }} ({{ numberValue(item.profitMargin).toFixed(2) }}%)</td>
              <td>{{ numberValue(item.quantity) }}</td>
              <td><span class="badge" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td>
              <td v-if="canWriteInventory" class="text-nowrap">
                <button class="btn btn-sm btn-outline-warning me-1" :disabled="busy" aria-label="Edit inventory item" @click="editItem(item)"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" :disabled="busy" aria-label="Delete inventory item" @click="removeItem(item)"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
            <tr v-if="!items.length"><td :colspan="canWriteInventory ? 8 : 7" class="text-center text-muted py-4">No stock items have been added.</td></tr>
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
      if (!this.canWriteInventory) {
        this.error = 'Your role does not allow inventory changes.';
        return;
      }
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
      return { in_stock: 'bg-success', low_stock: 'bg-warning text-dark', out_of_stock: 'bg-danger' }[status] || 'bg-secondary';
    },
    statusLabel(status) {
      return { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' }[status] || 'Unknown';
    }
  }
};
</script>

<style scoped>
.card { border: 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
</style>
