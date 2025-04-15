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
  
      <!-- Project Details -->
      <div v-else class="detail-card card">
        <div class="card-header">
          <h3>Project Details (ID: {{ project.projectId }})</h3>
        </div>
        <div class="card-body">
          <p><strong>Customer Name:</strong> {{ project.name }}</p>
          <p><strong>Address:</strong> {{ project.address }}</p>
          <p><strong>Phone Number:</strong> {{ project.phone }}</p>
          <p><strong>Email:</strong> {{ project.email }}</p>
          <p><strong>Suggested Price (Cost):</strong> Rs: {{ project.cost }}</p>
          <p><strong>Advance Price:</strong> Rs: {{ project.advancePrice }}</p>
          <p><strong>Percent Completion:</strong> {{ project.percentCompletion }}%</p>
          <p><strong>System Issues:</strong> {{ project.systemIssues || "N/A" }}</p>
          <p><strong>Note:</strong> {{ project.note || "N/A" }}</p>
          
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
        error: ""
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
          // Call your Netlify function with the projectId as a query parameter
          const response = await fetch(`/.netlify/functions/getProjects?projectId=${this.projectId}`);
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
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
        if (!obj) return "N/A";
        return JSON.stringify(obj, null, 2);
      },
      formatDate(timestamp) {
        if (!timestamp) return "N/A";
        // If timestamp is a Firestore Timestamp, convert to JS Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
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
  </style>
  