<template>
  <div class="marketing-page">
    <section class="marketing-hero">
      <div class="marketing-container">
        <div class="row align-items-center g-5">
          <div class="col-lg-7">
            <span class="marketing-eyebrow"><i class="fas fa-sun" aria-hidden="true"></i>Practical solar planning</span>
            <h1 class="marketing-title mb-4">Make confident solar decisions with clear system sizing.</h1>
            <p class="marketing-lead mb-4">
              Estimate panels, inverter capacity, battery requirements and project cost from your electricity use or household appliances.
            </p>
            <div class="d-flex flex-wrap gap-3">
              <router-link class="btn btn-primary btn-lg" to="/solercalc">
                Calculate my system <i class="fas fa-arrow-right ms-2" aria-hidden="true"></i>
              </router-link>
              <router-link class="btn btn-outline-secondary btn-lg" to="/contact">Talk to ANT Solar</router-link>
            </div>
            <div class="d-flex flex-wrap gap-4 mt-4 text-muted small">
              <span><i class="fas fa-check-circle text-success me-1"></i>Transparent estimate</span>
              <span><i class="fas fa-check-circle text-success me-1"></i>Equipment matched</span>
              <span><i class="fas fa-check-circle text-success me-1"></i>Project tracking</span>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="solar-visual" aria-label="Solar system planning illustration">
              <span class="solar-visual__orb"></span>
              <span class="solar-visual__panel"></span>
              <span class="solar-visual__stat solar-visual__stat--one"><small>Planning</small><strong>Usage → System</strong></span>
              <span class="solar-visual__stat solar-visual__stat--two"><small>One workflow</small><strong>Quote to install</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="marketing-section">
      <div class="marketing-container">
        <div class="text-center mx-auto mb-5" style="max-width: 700px;">
          <span class="marketing-eyebrow">A simpler solar journey</span>
          <h2 class="display-6">From monthly bill to managed project</h2>
          <p class="text-muted">A consistent workflow helps customers understand the recommendation and helps the ANT Solar team deliver it.</p>
        </div>
        <div class="row g-4">
          <div class="col-md-4">
            <article class="feature-card">
              <span class="feature-icon"><i class="fas fa-calculator" aria-hidden="true"></i></span>
              <h3 class="h5">Calculate</h3>
              <p class="text-muted mb-0">Enter monthly units, bill information or appliance usage to estimate daily energy demand.</p>
            </article>
          </div>
          <div class="col-md-4">
            <article class="feature-card">
              <span class="feature-icon"><i class="fas fa-sliders" aria-hidden="true"></i></span>
              <h3 class="h5">Match equipment</h3>
              <p class="text-muted mb-0">The calculator chooses suitable panel quantity, inverter capacity and optional battery storage.</p>
            </article>
          </div>
          <div class="col-md-4">
            <article class="feature-card">
              <span class="feature-icon"><i class="fas fa-list-check" aria-hidden="true"></i></span>
              <h3 class="h5">Track delivery</h3>
              <p class="text-muted mb-0">Signed-in customers can follow quotation, approval, installation and completion progress in one place.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="marketing-section bg-white border-top border-bottom">
      <div class="marketing-container">
        <div class="row align-items-center g-5">
          <div class="col-lg-5">
            <span class="marketing-eyebrow">Built for real decisions</span>
            <h2 class="display-6">Clear assumptions. Visible costs. Better conversations.</h2>
          </div>
          <div class="col-lg-7">
            <div class="row g-3">
              <div class="col-sm-6"><div class="feature-card"><strong class="d-block mb-1">System recommendation</strong><span class="text-muted">Panels, inverter and battery are presented together.</span></div></div>
              <div class="col-sm-6"><div class="feature-card"><strong class="d-block mb-1">Cost breakdown</strong><span class="text-muted">Material, labour and offer price remain understandable.</span></div></div>
              <div class="col-sm-6"><div class="feature-card"><strong class="d-block mb-1">Customer workspace</strong><span class="text-muted">Project progress and payment milestones stay visible.</span></div></div>
              <div class="col-sm-6"><div class="feature-card"><strong class="d-block mb-1">Secure operations</strong><span class="text-muted">Staff access is limited by role and permission.</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="marketing-section">
      <div class="marketing-container">
        <div class="dashboard-hero text-center">
          <h2 class="display-6 mb-3">Ready to estimate your solar requirement?</h2>
          <p class="mx-auto mb-4 opacity-75" style="max-width: 650px;">Start with your electricity usage. You can review the recommendation before creating a quotation request.</p>
          <router-link class="btn btn-light btn-lg" to="/solercalc">Open Solar Calculator</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
};
</script>
