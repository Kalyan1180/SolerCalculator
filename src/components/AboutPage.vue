<template>
  <div class="marketing-page">
    <section class="marketing-hero">
      <div class="marketing-container">
        <div class="row align-items-center g-5">
          <div class="col-lg-7">
            <span class="marketing-eyebrow"><i class="fas fa-leaf" aria-hidden="true"></i>About ANT Solar</span>
            <h1 class="marketing-title mb-4">Making solar planning understandable and accessible.</h1>
            <p class="marketing-lead mb-0">
              ANT Solar combines practical system sizing, transparent estimates and managed project delivery so households and small businesses can adopt solar with confidence.
            </p>
          </div>
          <div class="col-lg-5">
            <div class="feature-card p-4 p-lg-5">
              <span class="feature-icon"><i class="fas fa-bullseye" aria-hidden="true"></i></span>
              <h2 class="h3">Our mission</h2>
              <p class="text-muted mb-0">Help communities reduce electricity costs and move toward dependable, cleaner energy without making the process unnecessarily complicated.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="marketing-section">
      <div class="marketing-container">
        <div class="row g-4">
          <div class="col-md-4">
            <article class="feature-card">
              <span class="feature-icon"><i class="fas fa-eye" aria-hidden="true"></i></span>
              <h2 class="h5">Clarity first</h2>
              <p class="text-muted mb-0">Recommendations show the system components and estimate assumptions customers need to understand.</p>
            </article>
          </div>
          <div class="col-md-4">
            <article class="feature-card">
              <span class="feature-icon"><i class="fas fa-handshake" aria-hidden="true"></i></span>
              <h2 class="h5">Practical guidance</h2>
              <p class="text-muted mb-0">Solutions are matched to actual usage, peak load and budget rather than using one fixed package for everyone.</p>
            </article>
          </div>
          <div class="col-md-4">
            <article class="feature-card">
              <span class="feature-icon"><i class="fas fa-shield-heart" aria-hidden="true"></i></span>
              <h2 class="h5">Responsible delivery</h2>
              <p class="text-muted mb-0">Project progress, payments and operational access are handled through a secure, auditable workflow.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="marketing-section bg-white border-top">
      <div class="marketing-container">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <span class="marketing-eyebrow">Our vision</span>
            <h2 class="display-6">A future where renewable energy is easier to evaluate and adopt.</h2>
          </div>
          <div class="col-lg-6">
            <p class="text-muted fs-5">
              We want customers to make energy decisions using understandable information, suitable equipment and realistic project costs. Technology should simplify that journey—not create another barrier.
            </p>
            <router-link class="btn btn-primary" to="/solercalc">Estimate your system</router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
};
</script>
