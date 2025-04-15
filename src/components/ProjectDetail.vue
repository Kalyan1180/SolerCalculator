<template>
    <div class="project-detail container my-5">
        <!-- Loader -->
        <div v-if="loading" class="loader-overlay">
            <div class="loader">Loading project details, please wait...</div>
        </div>

        <!-- Error Message -->
        <div v-else-if="error" class="alert alert-danger text-center">
            {{ error }}
        </div>

        <!-- Project Details Display or Edit Mode -->
        <div v-else class="detail-card card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h3>Project Details (ID: {{ project.projectId }})</h3>
                <!-- Show Edit button only when not editing -->
                <button v-if="!isEditing" class="btn btn-sm btn-warning" @click="enterEditMode">Edit Details</button>
            </div>
            <div class="card-body">
                <div v-if="statusMessage"
                    :class="['alert', statusType === 'success' ? 'alert-success' : 'alert-danger']">
                    {{ statusMessage }}
                </div>
                <!-- Display non-editable fields -->
                <p><strong>Customer Name:</strong> {{ project.name }}</p>
                <p><strong>Address:</strong> {{ project.address }}</p>
                <p><strong>Email:</strong> {{ project.email }}</p>
                <p><strong>Suggested Price (Cost):</strong> Rs: {{ project.cost }}</p>
                <p><strong>Advance Price:</strong> Rs: {{ project.advancePrice }}</p>

                <!-- Editable Section for Phone, % Completion, and Note -->
                <div v-if="!isEditing">
                    <p><strong>Phone Number:</strong> {{ project.phone }}</p>
                    <p><strong>Percent Completion:</strong> {{ project.percentCompletion }}%</p>
                    <p><strong>Note:</strong> {{ project.note || "N/A" }}</p>
                </div>
                <div v-else>
                    <div class="mb-3">
                        <label class="form-label"><strong>Advance Price (Rs):</strong></label>
                        <input v-model.number="editableData.advancePrice" type="number" class="form-control" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Phone Number:</strong></label>
                        <input v-model="editableData.phone" type="tel" class="form-control" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Percent Completion (%):</strong></label>
                        <select v-model.number="editableData.percentCompletion" class="form-control">
                            <option value="30">30</option>
                            <option value="50">50</option>
                            <option value="80">80</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Note:</strong></label>
                        <textarea v-model="editableData.note" class="form-control" rows="3"></textarea>
                    </div>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-secondary me-2" @click="cancelEdit">Cancel</button>
                        <button class="btn btn-primary" @click="openConfirmModal">Save Changes</button>
                    </div>
                </div>

                <hr />

                <h4>Required Inverter Details:</h4>
                <pre>{{ formatObject(project.requiredInverter) }}</pre>

                <h4>Required Battery Details:</h4>
                <pre>{{ formatObject(project.requiredBattery) }}</pre>

                <p><strong>Created At:</strong> {{ formatDate(project.createdAt) }}</p>
            </div>
            <div class="card-footer text-center">
                <router-link to="/admin/projects" class="btn btn-secondary">Back to Projects</router-link>
            </div>
        </div>

        <!-- Confirmation Modal for Editing -->
        <div v-if="showConfirmModal" class="modal-overlay">
            <div class="modal-content">
                <h3>Confirm Update</h3>
                <p>Please confirm the updated details:</p>
                <div>
                    <p><strong>Phone Number:</strong> {{ editableData.phone }}</p>
                    <p><strong>Percent Completion:</strong> {{ editableData.percentCompletion }}%</p>
                    <p><strong>Note:</strong> {{ editableData.note }}</p>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-primary" @click="confirmEdit">Confirm Update</button>
                    <button class="btn btn-secondary" @click="closeConfirmModal">Cancel</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

export default {
    name: "ProjectDetail",
    props: {
        projectId: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            project: null,
            loading: false,
            error: "",
            // For editing specific fields
            isEditing: false,
            editableData: {
                phone: "",
                percentCompletion: null,
                note: "",
                advancePrice: null
            },
            statusMessage: "",
            statusType: "", // 'success' or 'error'
            showConfirmModal: false
        };
    },
    created() {
        this.fetchProject();
    },
    methods: {
        async fetchProject() {
            this.loading = true;
            this.error = "";
            try {
                // Call your Netlify function with the projectId as query parameter
                const response = await fetch(`/.netlify/functions/getProjects?projectId=${this.projectId}`);
                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();
                if (data.project) {
                    this.project = data.project;
                } else {
                    throw new Error("Project not found");
                }
            } catch (error) {
                console.error("Error fetching project:", error);
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        formatObject(obj) {
            return obj ? JSON.stringify(obj, null, 2) : "N/A";
        },
        formatDate(timestamp) {
            if (!timestamp) return "N/A";
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString();
        },
        enterEditMode() {
            this.editableData.phone = this.project.phone;
            this.editableData.percentCompletion = this.project.percentCompletion;
            this.editableData.note = this.project.note || "";
            this.editableData.advancePrice = this.project.advancePrice;
            this.isEditing = true;
        },
        cancelEdit() {
            this.isEditing = false;
            // Optionally, reset editableData if needed
        },
        openConfirmModal() {
            // Open the modal to confirm update
            this.showConfirmModal = true;
        },
        closeConfirmModal() {
            this.showConfirmModal = false;
        },
        async confirmEdit() {
            this.showConfirmModal = false;
            this.loading = true;
            this.statusMessage = "";
            this.statusType = "";

            try {
                const updateData = {
                    phone: this.editableData.phone,
                    percentCompletion: this.editableData.percentCompletion,
                    note: this.editableData.note,
                    advancePrice: this.editableData.advancePrice
                };

                const response = await fetch("/.netlify/functions/updateProject", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: this.projectId, updateData })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to update project.");
                }

                await this.fetchProject();
                this.isEditing = false;
                this.statusMessage = result.message || "Project updated successfully!";
                this.statusType = "success";
            } catch (error) {
                console.error("Error updating project:", error);
                this.statusMessage = "Error updating project: " + error.message;
                this.statusType = "error";
            } finally {
                this.loading = false;

                // Auto-clear message after 5 seconds
                setTimeout(() => {
                    this.statusMessage = "";
                }, 5000);
            }
        }

    }
};
</script>

<style scoped>
.project-detail {
    max-width: 800px;
    margin: auto;
    padding: 20px;
}

.detail-card {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.card-header {
    background-color: #007bff;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-body pre {
    background-color: #fef9e7;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
}

.loader-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loader {
    font-size: 20px;
    color: #007bff;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: #fff;
    padding: 20px;
    max-width: 400px;
    width: 90%;
    border-radius: 8px;
    text-align: center;
}

.modal-buttons {
    margin-top: 15px;
    display: flex;
    justify-content: space-around;
}
</style>