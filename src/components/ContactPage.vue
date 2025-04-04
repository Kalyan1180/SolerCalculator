<template>
  <div class="contact-page container my-5">
    <h1 class="text-center mb-4">Contact Us</h1>
    <div class="row">
      <!-- Contact Information -->
      <div class="col-md-6 mb-4">
        <h2>Get In Touch</h2>
        <p>
          We’d love to hear from you! Whether you have a question about our services, need assistance, or just want to say hello,
          our team is here to help.
        </p>
        <ul class="list-unstyled contact-info">
          <li><strong>Address:</strong> 123 Solar Street, Green City, Country</li>
          <li><strong>Phone:</strong> +1 234 567 890</li>
          <li><strong>Email:</strong> info@antsoler.com</li>
        </ul>
      </div>
      <!-- Contact Form -->
      <div class="col-md-6">
        <h2>Send Us a Message</h2>
        <form @submit.prevent="submitForm">
          <div class="mb-3">
            <label for="name" class="form-label">Your Name</label>
            <input v-model="form.name" type="text" id="name" class="form-control" placeholder="Enter your name" required />
          </div>
          <div class="mb-3">
            <label for="email" class="form-label">Your Email</label>
            <input v-model="form.email" type="email" id="email" class="form-control" placeholder="Enter your email" required />
          </div>
          <div class="mb-3">
            <label for="message" class="form-label">Your Message</label>
            <textarea v-model="form.message" id="message" class="form-control" rows="4" placeholder="Type your message here" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary w-100">Send Message</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ContactPage",
  data() {
    return {
      form: {
        name: "",
        email: "",
        message: ""
      }
    };
  },
  methods: {
    submitForm() {
      // For now, we'll simply log the form data.
      // In a real application, you might send this data to an email service or backend.
      console.log("Contact form submitted:", this.form);
      alert("Thank you for your message! We will get back to you shortly.");
      // Reset form fields
      this.form.name = "";
      this.form.email = "";
      this.form.message = "";
    }
  }
};
</script>

<style scoped>
.contact-page h1 {
  color: #007bff;
  margin-bottom: 30px;
}
.contact-page h2 {
  color: #0056b3;
  margin-bottom: 15px;
}
.contact-info li {
  margin-bottom: 10px;
  font-size: 1rem;
}
</style>
