<template>
  <div class="marketing-page">
    <section class="marketing-hero">
      <div class="marketing-container">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <span class="marketing-eyebrow"><i class="fas fa-comments" aria-hidden="true"></i>Contact ANT Solar</span>
            <h1 class="marketing-title mb-4">Let’s discuss your electricity use and solar goals.</h1>
            <p class="marketing-lead mb-4">
              Share your requirement, current bill pattern or questions about the calculator. The information helps the team prepare a more useful response.
            </p>
            <div class="row g-3">
              <div class="col-sm-6">
                <div class="feature-card">
                  <span class="feature-icon"><i class="fas fa-location-dot" aria-hidden="true"></i></span>
                  <strong class="d-block">Service area</strong>
                  <span class="text-muted">Howrah and nearby regions</span>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="feature-card">
                  <span class="feature-icon"><i class="fas fa-clock" aria-hidden="true"></i></span>
                  <strong class="d-block">Response goal</strong>
                  <span class="text-muted">Within one business day</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <section class="card border-0 shadow-lg">
              <div class="card-body p-4 p-lg-5">
                <div class="mb-4">
                  <h2 class="h3 mb-2">Send an enquiry</h2>
                  <p class="text-muted mb-0">Fields marked with an asterisk are required.</p>
                </div>

                <div v-if="submitted" class="alert alert-success" role="status">
                  <i class="fas fa-circle-check me-2" aria-hidden="true"></i>
                  Thank you. Your enquiry was received successfully.
                </div>
                <div v-if="submitError" class="alert alert-danger" role="alert">
                  <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ submitError }}
                </div>

                <form
                  name="ant-solar-contact"
                  method="POST"
                  data-netlify="true"
                  netlify-honeypot="bot-field"
                  @submit.prevent="submitForm"
                >
                  <input type="hidden" name="form-name" value="ant-solar-contact" />
                  <div class="visually-hidden" aria-hidden="true">
                    <label>Do not complete this field <input v-model="form.botField" name="bot-field" tabindex="-1" autocomplete="off" /></label>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="contactName" class="form-label">Name *</label>
                      <input v-model.trim="form.name" name="name" type="text" id="contactName" class="form-control" autocomplete="name" maxlength="100" required />
                    </div>
                    <div class="col-md-6">
                      <label for="contactEmail" class="form-label">Email *</label>
                      <input v-model.trim="form.email" name="email" type="email" id="contactEmail" class="form-control" autocomplete="email" maxlength="160" required />
                    </div>
                    <div class="col-12">
                      <label for="contactPhone" class="form-label">Phone</label>
                      <input v-model.trim="form.phone" name="phone" type="tel" id="contactPhone" class="form-control" autocomplete="tel" maxlength="20" />
                    </div>
                    <div class="col-12">
                      <label for="contactMessage" class="form-label">How can we help? *</label>
                      <textarea v-model.trim="form.message" name="message" id="contactMessage" class="form-control" rows="5" maxlength="1500" required></textarea>
                      <div class="form-text text-end">{{ form.message.length }}/1500</div>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="submitting">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    {{ submitting ? 'Sending enquiry…' : 'Send enquiry' }}
                  </button>
                  <small class="d-block text-muted mt-3">Your enquiry is submitted securely to the ANT Solar Netlify site forms dashboard.</small>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
function emptyForm() {
  return { name: '', email: '', phone: '', message: '', botField: '' };
}

export default {
  name: 'ContactPage',
  data() {
    return {
      form: emptyForm(),
      submitting: false,
      submitted: false,
      submitError: ''
    };
  },
  methods: {
    async submitForm() {
      this.submitting = true;
      this.submitted = false;
      this.submitError = '';

      try {
        const body = new URLSearchParams({
          'form-name': 'ant-solar-contact',
          'bot-field': this.form.botField,
          name: this.form.name,
          email: this.form.email,
          phone: this.form.phone,
          message: this.form.message
        });
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
        if (!response.ok) throw new Error(`Form submission failed with status ${response.status}`);

        this.submitted = true;
        this.form = emptyForm();
      } catch (error) {
        console.error('Contact form submission failed:', error);
        this.submitError = 'The enquiry could not be submitted. Please check your connection and try again.';
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
