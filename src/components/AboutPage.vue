<template>
  <div class="about-page container my-5">
    <h1 class="text-center mb-4">About Us</h1>
    <div class="row align-items-center">
      <div class="col-md-6">
        <img src="https://via.placeholder.com/500x300?text=Our+Mission" alt="Our Mission" class="img-fluid rounded" />
      </div>
      <div class="col-md-6">
        <h2>Our Mission</h2>
        <p>
          At Ant Soler, our mission is to empower communities by harnessing the clean, sustainable power of the sun. We provide
          innovative solar solutions that help reduce energy costs, lower carbon footprints, and create a greener, healthier future.
        </p>
      </div>
    </div>
    <div class="row align-items-center mt-5">
      <div class="col-md-6 order-md-2">
        <img src="https://via.placeholder.com/500x300?text=Our+Vision" alt="Our Vision" class="img-fluid rounded" />
      </div>
      <div class="col-md-6 order-md-1">
        <h2>Our Vision</h2>
        <p>
          We envision a world where renewable energy is accessible to everyone. By leveraging cutting-edge technology and sustainable
          practices, we aim to lead the transition to a future powered by clean energy.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "AboutPage"
};
</script>

<style scoped>
.about-page h1 {
  color: #007bff;
}
.about-page h2 {
  color: #0056b3;
  margin-bottom: 15px;
}
.about-page p {
  font-size: 1rem;
  line-height: 1.6;
}
</style>
