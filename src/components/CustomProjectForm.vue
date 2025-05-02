<template>
    <div class="custom-project container my-5">
        <div class="card">
            <div class="card-header">
                <h4>Add Custom Project</h4>
            </div>
            <div class="card-body">
                <!-- Status Message -->
                <div v-if="statusMessage" :class="['alert', statusType === 'success' ? 'alert-success' : 'alert-danger']">
                    {{ statusMessage }}
                </div>

                <form @submit.prevent="submitCustomProject">
                    <!-- Customer Info -->
                    <div class="row mb-3">
                        <div class="col">
                            <label class="form-label">Customer Name</label>
                            <input v-model="form.name" type="text" class="form-control" required />
                        </div>
                        <div class="col">
                            <label class="form-label">Email</label>
                            <input v-model="form.email" type="email" class="form-control" required />
                        </div>
                        <div class="col">
                            <label class="form-label">Phone</label>
                            <input v-model="form.phone" type="tel" class="form-control" required />
                        </div>
                        <div class="col">
                            <label class="form-label">Address</label> <!-- new -->
                            <input v-model="form.address" type="text" class="form-control" required /> <!-- new -->
                        </div>
                    </div>

                    <!-- Panels & Cost -->
                    <div class="row mb-3">
                        <div class="col">
                            <label class="form-label">Number of Panels</label>
                            <input v-model.number="form.panels" type="number" class="form-control" min="0" />
                        </div>
                        <div class="col">
                            <label class="form-label">Total Cost (Rs)</label>
                            <input v-model.number="form.cost" type="number" class="form-control" min="0" />
                        </div>
                        <div class="col">
                            <label class="form-label">Advance Price (Rs)</label>
                            <input v-model.number="form.advancePrice" type="number" class="form-control" min="0" />
                        </div>
                    </div>

                    <!-- Inverter Selection -->
                    <div class="mb-3">
                        <label class="form-label">Inverter</label>
                        <div class="input-group">
                            <select v-model="form.selectedInverterId" class="form-select">
                                <option value="">-- choose from list --</option>
                                <option v-for="inv in inverters" :key="inv.id" :value="inv.id">
                                    {{ inv.name }} ({{ inv.peakLoad }} KVA)
                                </option>
                            </select>
                            <button class="btn btn-outline-secondary" type="button" @click="toggleManual('inverter')">
                                {{ manual.inverter ? 'Use List' : 'Manual' }}
                            </button>
                        </div>
                        <div v-if="manual.inverter" class="mt-2 row g-2">
                            <div class="col"><input v-model="form.invName" placeholder="Name" class="form-control" />
                            </div>
                            <div class="col"><input v-model.number="form.invPeakLoad" placeholder="Peak Load"
                                    class="form-control" /></div>
                            <div class="col"><input v-model.number="form.invMaxPanels" placeholder="Max Panels"
                                    class="form-control" /></div>
                            <div class="col"><input v-model.number="form.invBatteryVolt" placeholder="Battery V"
                                    class="form-control" /></div>
                            <div class="col"><input v-model.number="form.invCost" placeholder="Cost"
                                    class="form-control" /></div>
                        </div>
                    </div>

                    <!-- Battery Selection -->
                    <div class="mb-3">
                        <label class="form-label">Battery</label>
                        <div class="input-group">
                            <select v-model="form.selectedBatteryId" class="form-select">
                                <option value="">-- choose from list --</option>
                                <option v-for="bat in batteries" :key="bat.id" :value="bat.id">
                                    {{ bat.name }} ({{ bat.capacity }} AH)
                                </option>
                            </select>
                            <button class="btn btn-outline-secondary" type="button" @click="toggleManual('battery')">
                                {{ manual.battery ? 'Use List' : 'Manual' }}
                            </button>
                        </div>
                        <div v-if="manual.battery" class="mt-2 row g-2">
                            <div class="col"><input v-model="form.batName" placeholder="Name" class="form-control" />
                            </div>
                            <div class="col"><input v-model.number="form.batCapacity" placeholder="Capacity AH"
                                    class="form-control" /></div>
                            <div class="col"><input v-model.number="form.batPrice" placeholder="Price"
                                    class="form-control" /></div>
                            <div class="col"><input v-model.number="form.batEnergy" placeholder="Energy kWh"
                                    class="form-control" /></div>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary">Add Project</button>
                </form>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "CustomProjectForm",
    data() {
        return {
            inverters: [],
            batteries: [],
            form: {
                name: "", email: "", phone: "",address: "",
                panels: 0, cost: 0, advancePrice: 0,
                selectedInverterId: "", invName: "", invPeakLoad: null, invMaxPanels: null, invBatteryVolt: null, invCost: null,
                selectedBatteryId: "", batName: "", batCapacity: null, batPrice: null, batEnergy: null
            },
            manual: { inverter: false, battery: false },
            statusMessage: "",
            statusType: "",
            loading: false
        };
    },
    methods: {
        async fetchData() {
            this.loading = true;
            try {
                const res = await fetch("/.netlify/functions/getData");
                const { inverters, batteries } = await res.json();
                this.inverters = inverters;
                this.batteries = batteries;
            } finally {
                this.loading = false;
            }
        },
        toggleManual(type) {
            this.manual[type] = !this.manual[type];
            if (!this.manual[type]) {
                if (type === "inverter") this.form.selectedInverterId = "";
                else this.form.selectedBatteryId = "";
            }
        },
        async submitCustomProject() {
            this.loading = true;
            this.statusMessage = "";
            this.statusType = "";
            // build project payload
            const projectId = Date.now(); // Using timestamp for unique project ID

            const projectData = {
                name: this.form.name,
                email: this.form.email,
                phone: this.form.phone,
                address: this.form.address,
                projectId: projectId,

                panelCount: this.form.panels,
                cost: this.form.cost,
                advancePrice: this.form.advancePrice,
                requiredInverter: this.manual.inverter
                    ? { name: this.form.invName, peakLoad: this.form.invPeakLoad, maxPanels: this.form.invMaxPanels, batterySupported: this.form.invBatteryVolt, cost: this.form.invCost }
                    : this.inverters.find(i => i.id === this.form.selectedInverterId),
                requiredBattery: this.manual.battery
                    ? { name: this.form.batName, capacity: this.form.batCapacity, price: this.form.batPrice, energy: this.form.batEnergy }
                    : this.batteries.find(b => b.id === this.form.selectedBatteryId),
                    percentCompletion: 0,
        systemIssues: "",
        note: ""
            };
            try {
                const res = await fetch("/.netlify/functions/addProject", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(projectData)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to add project");
                this.statusMessage = json.message || "Project added successfully!";
                this.statusType = "success";
                // reset form:
                Object.keys(this.form).forEach(k => this.form[k] = (typeof this.form[k] === "number" ? 0 : ""));
            } catch (err) {
                this.statusMessage = err.message;
                this.statusType = "error";
            } finally {
                this.loading = false;
                setTimeout(() => this.statusMessage = "", 5000);
            }
        }
    },
    mounted() {
        this.fetchData();
    }
};
</script>

<style scoped>
.custom-project .card {
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
}
</style>