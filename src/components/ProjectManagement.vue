<template>
  <div class="project-management container-fluid py-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">Project Management</h2>
      <router-link
        :to="{ name: 'AddCustomProject' }"
        class="btn btn-primary"
      >
        <i class="fas fa-plus me-1"></i> Add Custom Project
      </router-link>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading projects, please wait...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-danger text-center">
      {{ error }}
    </div>

    <!-- Projects Grid -->
    <div v-if="!loading && !error && projects.length" class="row g-4">
      <div
        v-for="project in paginatedProjects"
        :key="project.projectId"
        class="col-sm-6 col-md-4 col-lg-3"
      >
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">#{{ project.projectId }}</h5>
            <p class="card-text flex-grow-1">
              <strong>Customer:</strong> {{ project.name }}<br>
              <strong>Address:</strong> {{ project.address }}
            </p>
            <div class="mt-3 text-end">
              <button
                class="btn btn-sm btn-outline-primary"
                @click="viewProject(project.projectId)"
              >
                View More <i class="fas fa-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Projects -->
    <div v-if="!loading && !error && !projects.length" class="text-center my-5 text-muted">
      No projects found.
    </div>

    <!-- Pagination -->
    <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
      <ul class="pagination">
        <li :class="['page-item', { disabled: currentPage === 1 } ]">
          <button class="page-link" @click="prevPage">Previous</button>
        </li>
        <li class="page-item disabled">
          <span class="page-link">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
        </li>
        <li :class="['page-item', { disabled: currentPage === totalPages } ]">
          <button class="page-link" @click="nextPage">Next</button>
        </li>
      </ul>
    </nav>
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
      pageSize: 8
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
        const resp = await fetch("/.netlify/functions/getProjects");
        if (!resp.ok) throw new Error("Failed to load");
        const data = await resp.json();
        this.projects = data.projects || [];
      } catch (e) {
        console.error(e);
        this.error = "Error fetching projects. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    viewProject(id) {
      this.$router.push({ path: `/admin/projects/${id}` });
    },
    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
    },
    prevPage() {
      if (this.currentPage > 1) this.currentPage--;
    }
  },
  mounted() {
    this.fetchProjects();
  }
};
</script>

<style scoped>
.project-management {
  max-width: 1200px;
}
.card {
  border: none;
  border-radius: 0.5rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}
.page-link {
  cursor: pointer;
}
.spinner-border {
  width: 3rem;
  height: 3rem;
}
</style>
