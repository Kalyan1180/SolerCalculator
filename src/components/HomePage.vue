<template>
  <div class="home-content container my-4">
    <section class="hero text-center my-4">
      <h1 class="display-4">Welcome to Ant Soler</h1>
      <p class="lead">
        Harness the power of the sun to lower your energy bills and protect the environment.
      </p>
      <div class="d-flex justify-content-center gap-2">
        <router-link class="btn btn-outline-primary btn-sm" to="/contact">
          Contact Us
        </router-link>
        <router-link class="btn btn-outline-secondary btn-sm" to="/solercalc">
          Get a Quote
        </router-link>
      </div>
    </section>
    
    <section class="benefits my-5">
      <div class="row align-items-center">
        <div class="col-md-6">
          <img src="https://via.placeholder.com/500x300?text=Solar+Benefits" class="img-fluid" alt="Solar Benefits" />
        </div>
        <div class="col-md-6">
          <h2>Solar Benefits</h2>
          <p>
            Solar energy is renewable, cost-effective, and improves your property value while promoting sustainability.
          </p>
        </div>
      </div>
    </section>
    
    <section class="environmental my-5">
      <div class="row align-items-center flex-md-row-reverse">
        <div class="col-md-6">
          <img src="https://via.placeholder.com/500x300?text=Environmental+Impact" class="img-fluid" alt="Environmental Impact" />
        </div>
        <div class="col-md-6">
          <h2>Environmental Impact</h2>
          <p>
            Reduce your carbon footprint and help fight climate change by switching to clean, renewable solar energy.
          </p>
        </div>
      </div>
    </section>
    
    <section class="future my-5">
      <div class="row align-items-center">
        <div class="col-md-6">
          <img src="https://via.placeholder.com/500x300?text=Solar+Future" class="img-fluid" alt="Solar Future" />
        </div>
        <div class="col-md-6">
          <h2>Solar Future</h2>
          <p>
            Discover innovative solar technologies that maximize energy output and lead us toward a sustainable future.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "HomePage"
};
</script>

<style scoped>
.home-content {
  padding: 20px;
}
.hero {
  background: #f1f1f1;
  padding: 40px 20px;
  border-radius: 8px;
  margin-bottom: 40px;
}
.hero h1 {
  font-weight: bold;
  margin-bottom: 20px;
}
.hero p {
  font-size: 1.2rem;
  margin-bottom: 20px;
}
section {
  margin-bottom: 40px;
}
section h2 {
  margin-bottom: 20px;
  color: #007bff;
}
</style>
