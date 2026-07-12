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
                  {{ successMessage }}
                  <small v-if="enquiryId" class="d-block mt-1">Reference: {{ enquiryId }}</small>
                </div>
                <div v-if="submitError" class="alert alert-danger" role="alert">
                  <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ submitError }}
                </div>

                <form @submit.prevent="submitForm">
                  <div class="visually-hidden" aria-hidden="true">
                    <label>Do not complete this field <input v-model="form.botField" tabindex="-1" autocomplete="off" /></label>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="contactName" class="form-label">Name *</label>
                      <input v-model.trim="form.name" type="text" id="contactName" class="form-control" autocomplete="name" maxlength="100" required />
                    </div>
                    <div class="col-md-6">
                      <label for="contactEmail" class="form-label">Email *</label>
                      <input v-model.trim="form.email" type="email" id="contactEmail" class="form-control" autocomplete="email" maxlength="160" required />
                    </div>
                    <div class="col-md-6">
                      <label for="contactPhone" class="form-label">Phone</label>
                      <input v-model.trim="form.phone" type="tel" id="contactPhone" class="form-control" autocomplete="tel" maxlength="30" />
                    </div>
                    <div class="col-md-6">
                      <label for="contactInterest" class="form-label">I am interested in</label>
                      <select id="contactInterest" v-model="form.interest" class="form-select">
                        <option value="home-solar">Home solar installation</option>
                        <option value="business-solar">Business solar installation</option>
                        <option value="battery-backup">Battery backup</option>
                        <option value="site-survey">Site survey</option>
                        <option value="service-support">Service or support</option>
                        <option value="general">General enquiry</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label for="contactMessage" class="form-label">How can we help? *</label>
                      <textarea v-model.trim="form.message" id="contactMessage" class="form-control" rows="5" minlength="10" maxlength="2000" required></textarea>
                      <div class="form-text text-end">{{ form.message.length }}/2000</div>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="submitting">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    {{ submitting ? 'Sending enquiry…' : 'Send enquiry' }}
                  </button>
                  <small class="d-block text-muted mt-3">Your enquiry is securely stored and sent to the ANT Solar team.</small>
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
  return {
    name: '',
    email: '',
    phone: '',
    interest: 'home-solar',
    message: '',
    botField: ''
  };
}

export default {
  name: 'ContactPage',
  data() {
    return {
      form: emptyForm(),
      submitting: false,
      submitted: false,
      submitError: '',
      successMessage: '',
      enquiryId: ''
    };
  },
  methods: {
    async submitForm() {
      this.submitting = true;
      this.submitted = false;
      this.submitError = '';
      this.successMessage = '';
      this.enquiryId = '';

      try {
        const response = await fetch('/.netlify/functions/sendEnquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...this.form, source: 'contact-page' })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'The enquiry could not be submitted.');
        }

        this.submitted = true;
        this.successMessage = payload.message || 'Thank you. Your enquiry was received successfully.';
        this.enquiryId = payload.enquiryId || '';
        this.form = emptyForm();
      } catch (error) {
        console.error('Contact form submission failed:', error);
        this.submitError = error.message || 'The enquiry could not be submitted. Please check your connection and try again.';
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
