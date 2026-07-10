<template>
  <div class="inventory-management container-fluid py-4">
    <h2 class="mb-4">Inventory Management</h2>

    <!-- Add New Item Button -->
    <div class="mb-4">
      <button class="btn btn-primary" @click="showAddForm = !showAddForm">
        <i class="fas fa-plus me-2"></i>{{ showAddForm ? 'Cancel' : 'Add New Item' }}
      </button>
    </div>

    <!-- Add/Edit Form -->
    <div v-if="showAddForm" class="card mb-4">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">{{ editingItem ? 'Edit Item' : 'Add New Inventory Item' }}</h5>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveItem">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Item Type *</label>
              <select v-model="formData.type" class="form-control" required>
                <option value="">Select Type</option>
                <option value="inverter">Inverter</option>
                <option value="battery">Battery</option>
                <option value="panel">Solar Panel</option>
                <option value="wiring">Wiring & Cables</option>
                <option value="mounting">Mounting Hardware</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Item Name *</label>
              <input v-model="formData.name" type="text" class="form-control" placeholder="e.g., Shamsi Solar Inverter 675 VA/12V" required />
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Cost Price (₹) *</label>
              <input v-model.number="formData.costPrice" type="number" class="form-control" placeholder="Your cost" min="0" step="0.01" required @change="calculateProfit" />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Selling Price (₹) *</label>
              <input v-model.number="formData.sellingPrice" type="number" class="form-control" placeholder="Customer price" min="0" step="0.01" required @change="calculateProfit" />
            </div>
          </div>

          <div class="row" v-if="formData.costPrice && formData.sellingPrice">
            <div class="col-md-6 mb-3">
              <label class="form-label">Profit Per Unit</label>
              <div class="input-group">
                <input type="text" class="form-control" :value="`₹${(formData.sellingPrice - formData.costPrice).toFixed(2)}`" disabled />
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Profit Margin %</label>
              <div class="input-group">
                <input type="text" class="form-control" :value="`${(((formData.sellingPrice - formData.costPrice) / formData.costPrice) * 100).toFixed(2)}%`" disabled />
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Quantity in Stock *</label>
              <input v-model.number="formData.quantity" type="number" class="form-control" placeholder="0" min="0" required />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Supplier</label>
              <input v-model="formData.supplier" type="text" class="form-control" placeholder="Supplier name" />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model="formData.description" class="form-control" rows="2" placeholder="Add specs or details"></textarea>
          </div>

          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-success">
              <i class="fas fa-save me-2"></i>{{ editingItem ? 'Update' : 'Add' }} Item
            </button>
            <button type="button" class="btn btn-secondary" @click="resetForm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading inventory...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger alert-dismissible fade show">
      {{ error }}
      <button type="button" class="btn-close" @click="error = ''" aria-label="Close"></button>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="alert alert-success alert-dismissible fade show">
      {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = ''" aria-label="Close"></button>
    </div>

    <!-- Inventory Table -->
    <div v-if="!loading && items.length" class="card">
      <div class="card-header bg-secondary text-white">
        <h5 class="mb-0">Inventory Items ({{ items.length }})</h5>
      </div>
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Profit/Unit</th>
              <th>Margin %</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.itemId">
              <td><span class="badge bg-info">{{ item.type }}</span></td>
              <td class="fw-bold">{{ item.name }}</td>
              <td>₹{{ formatCurrency(item.costPrice) }}</td>
              <td>₹{{ formatCurrency(item.sellingPrice) }}</td>
              <td class="text-success fw-bold">₹{{ formatCurrency(item.profit) }}</td>
              <td>
                <span class="badge" :class="item.profitMargin > 20 ? 'bg-success' : item.profitMargin > 10 ? 'bg-warning' : 'bg-danger'">
                  {{ item.profitMargin }}%
                </span>
              </td>
              <td class="fw-bold">{{ item.quantity }}</td>
              <td>
                <span class="badge" :class="{
                  'bg-success': item.status === 'in_stock',
                  'bg-warning': item.status === 'low_stock',
                  'bg-danger': item.status === 'out_of_stock'
                }">
                  {{ item.status }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-warning me-2" @click="editItem(item)" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteItem(item.itemId)" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !items.length" class="text-center my-5 text-muted">
      <i class="fas fa-inbox fa-3x mb-3"></i>
      <p>No inventory items yet. Add one to get started!</p>
    </div>
  </div>
</template>

<script>
import {
  createInventoryItem,
  getAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem
} from '@/models/inventoryModel';

export default {
  name: 'ManageInventory',
  data() {
    return {
      items: [],
      loading: false,
      error: '',
      successMessage: '',
      showAddForm: false,
      editingItem: null,
      formData: {
        type: '',
        name: '',
        description: '',
        costPrice: null,
        sellingPrice: null,
        quantity: 0,
        supplier: ''
      }
    };
  },
  created() {
    this.loadItems();
  },
  methods: {
    async loadItems() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAllInventoryItems();
        if (result.success) {
          this.items = result.items;
        } else {
          this.error = result.error || 'Failed to load inventory';
        }
      } catch (error) {
        console.error('Error loading inventory:', error);
        this.error = 'Error loading inventory';
      } finally {
        this.loading = false;
      }
    },
    async saveItem() {
      this.error = '';
      this.successMessage = '';
      try {
        if (this.editingItem) {
          const result = await updateInventoryItem(this.editingItem.itemId, {
            type: this.formData.type,
            name: this.formData.name,
            description: this.formData.description,
            costPrice: this.formData.costPrice,
            sellingPrice: this.formData.sellingPrice,
            quantity: this.formData.quantity,
            supplier: this.formData.supplier
          });
          if (result.success) {
            this.successMessage = 'Item updated successfully!';
          } else {
            this.error = result.error || 'Failed to update item';
          }
        } else {
          const result = await createInventoryItem(this.formData);
          if (result.success) {
            this.successMessage = 'Item added successfully!';
            this.items.push(result.item);
          } else {
            this.error = result.error || 'Failed to add item';
          }
        }
        this.resetForm();
        await this.loadItems();
      } catch (error) {
        console.error('Error saving item:', error);
        this.error = 'Error saving item';
      }
    },
    async deleteItem(itemId) {
      if (confirm('Are you sure you want to delete this item?')) {
        try {
          const result = await deleteInventoryItem(itemId);
          if (result.success) {
            this.successMessage = 'Item deleted successfully!';
            await this.loadItems();
          } else {
            this.error = result.error || 'Failed to delete item';
          }
        } catch (error) {
          console.error('Error deleting item:', error);
          this.error = 'Error deleting item';
        }
      }
    },
    editItem(item) {
      this.editingItem = item;
      this.formData = {
        type: item.type,
        name: item.name,
        description: item.description || '',
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        quantity: item.quantity,
        supplier: item.supplier || ''
      };
      this.showAddForm = true;
      window.scrollTo(0, 0);
    },
    resetForm() {
      this.showAddForm = false;
      this.editingItem = null;
      this.formData = {
        type: '',
        name: '',
        description: '',
        costPrice: null,
        sellingPrice: null,
        quantity: 0,
        supplier: ''
      };
    },
    calculateProfit() {
      // Profit calculation is displayed in real-time
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        maximumFractionDigits: 0
      }).format(value);
    }
  }
};
</script>

<style scoped>
.inventory-management {
  background-color: #f8f9fa;
}

.card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-hover tbody tr:hover {
  background-color: #f5f5f5;
}

.btn-sm {
  padding: 0.4rem 0.6rem;
}
</style>
