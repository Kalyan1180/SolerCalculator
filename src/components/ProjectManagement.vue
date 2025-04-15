<template>
    <div class="container project-management my-5">
      <h2 class="text-center mb-4">Project Management</h2>
      
      <!-- Loader -->
      <div v-if="loading" class="loader">Loading projects, please wait...</div>
      
      <!-- Error Message -->
      <div v-if="error" class="alert alert-danger text-center">
        {{ error }}
      </div>
      
      <!-- Project Cards Grid -->
      <div v-if="!loading && projects.length" class="row">
        <div v-for="project in paginatedProjects" :key="project.projectId" class="col-md-4 mb-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Project ID: {{ project.projectId }}</h5>
              <p class="card-text">
                <strong>Customer:</strong> {{ project.name }}<br>
                <strong>Address:</strong> {{ project.address }}
              </p>
              <button class="btn btn-link view-more" @click="viewProject(project.projectId)">
                View More <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pagination Controls -->
      <div v-if="!loading && totalPages > 1" class="pagination-controls text-center">
        <button class="btn btn-secondary mx-2" :disabled="currentPage === 1" @click="prevPage">
          Previous
        </button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="btn btn-secondary mx-2" :disabled="currentPage === totalPages" @click="nextPage">
          Next
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "ProjectManagement",
    data() {
      return {
        projects: [],
        loading: false,
        error: "",
        currentPage: 1,
        pageSize: 6  // Number of project cards per page
      };
    },
    computed: {
      paginatedProjects() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.projects.slice(start, start + this.pageSize);
      },
      totalPages() {
        return Math.ceil(this.projects.length / this.pageSize);
      }
    },
    methods: {
      async fetchProjects() {
        this.loading = true;
        this.error = "";
        try {
          const response = await fetch("/.netlify/functions/getProjects");
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const data = await response.json();
          // Assume the API returns an object with a 'projects' array
          this.projects = data.projects || [];
        } catch (err) {
          console.error("Error fetching projects:", err);
          this.error = "Error fetching projects. Please try again.";
        } finally {
          this.loading = false;
        }
      },
      viewProject(projectId) {
        this.$router.push(`/admin/projects/${projectId}`);
      },
      nextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
        }
      },
      prevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
        }
      }
    },
    created() {
      this.fetchProjects();
    }
  };
  </script>
  
  <style scoped>
 
  .card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: none;
    border-radius: 8px;
  }
  .card:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .view-more {
    color: #007bff;
    text-decoration: none;
  }
  .view-more:hover {
    text-decoration: underline;
  }
  .pagination-controls {
    margin-top: 20px;
  }
  .loader {
    text-align: center;
    font-size: 18px;
    color: #007bff;
  }
  </style>
  