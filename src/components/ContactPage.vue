<template>
  <div class="marketing-page contact-page">
    <section class="marketing-hero">
      <div class="marketing-container">
        <div class="row align-items-start g-5">
          <div class="col-lg-5">
            <span class="marketing-eyebrow"><i class="fas fa-comments" aria-hidden="true"></i>Contact ANT Solar</span>
            <h1 class="marketing-title mb-4">Tell us what you need. We will take it from there.</h1>
            <p class="marketing-lead mb-4">
              Share your electricity use, installation location or support question. Your enquiry is added to our team queue for review and follow-up.
            </p>

            <div class="contact-promise mb-4">
              <div class="contact-promise__icon"><i class="fas fa-list-check"></i></div>
              <div><strong>Structured follow-up</strong><span>Every enquiry receives a reference number and is tracked until it is resolved.</span></div>
            </div>

            <div class="row g-3">
              <div class="col-sm-6 col-lg-12 col-xl-6">
                <div class="feature-card h-100">
                  <span class="feature-icon"><i class="fas fa-location-dot" aria-hidden="true"></i></span>
                  <strong class="d-block">Service area</strong>
                  <span class="text-muted">Howrah and nearby regions</span>
                </div>
              </div>
              <div class="col-sm-6 col-lg-12 col-xl-6">
                <div class="feature-card h-100">
                  <span class="feature-icon"><i class="fas fa-clock" aria-hidden="true"></i></span>
                  <strong class="d-block">Response goal</strong>
                  <span class="text-muted">Within one business day</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-7">
            <section class="card contact-card border-0 shadow-lg">
              <div class="card-body p-4 p-lg-5">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                  <div>
                    <span class="step-label">Enquiry form</span>
                    <h2 class="h3 mb-2">How can we help?</h2>
                    <p class="text-muted mb-0">Fields marked with an asterisk are required.</p>
                  </div>
                  <span class="secure-badge"><i class="fas fa-lock me-2"></i>Secure team inbox</span>
                </div>

                <div v-if="submitted" class="submission-success" role="status">
                  <span class="submission-success__icon"><i class="fas fa-circle-check"></i></span>
                  <div>
                    <h3 class="h5 mb-1">Enquiry recorded</h3>
                    <p class="mb-1">{{ successMessage }}</p>
                    <small v-if="enquiryId">Reference: <strong>{{ enquiryId }}</strong></small>
                  </div>
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
                      <label for="contactInterest" class="form-label">Enquiry type</label>
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
                      <label for="contactMessage" class="form-label">Requirement or question *</label>
                      <textarea v-model.trim="form.message" id="contactMessage" class="form-control" rows="6" minlength="10" maxlength="2000" placeholder="Include your location, current electricity use or the problem you need help with." required></textarea>
                      <div class="d-flex justify-content-between form-text"><span>Minimum 10 characters</span><span>{{ form.message.length }}/2000</span></div>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary btn-lg w-100 mt-4" :disabled="submitting">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    <i v-else class="fas fa-paper-plane me-2" aria-hidden="true"></i>
                    {{ submitting ? 'Recording enquiry…' : 'Submit enquiry' }}
                  </button>
                  <small class="d-block text-muted text-center mt-3">Your enquiry is stored in the ANT Solar team inbox for authorised staff to review and act upon.</small>
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
        this.successMessage = payload.message || 'Thank you. Your enquiry was recorded successfully.';
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

<style scoped>
.contact-page .marketing-hero { padding-top:4.5rem; }
.contact-card { overflow:hidden; border-radius:20px; }
.step-label { display:block; margin-bottom:.35rem; color:var(--ant-blue-700); font-size:.72rem; font-weight:800; letter-spacing:.09em; text-transform:uppercase; }
.secure-badge { display:inline-flex; align-items:center; padding:.45rem .7rem; border:1px solid #bbf7d0; border-radius:999px; color:#166534; background:#f0fdf4; font-size:.75rem; font-weight:700; }
.contact-promise { display:flex; gap:1rem; padding:1rem; border:1px solid rgba(255,255,255,.16); border-radius:14px; background:rgba(255,255,255,.08); }
.contact-promise__icon { display:grid; place-items:center; width:42px; height:42px; flex:0 0 42px; border-radius:11px; color:var(--ant-blue-700); background:#fff; }
.contact-promise div:last-child { display:flex; flex-direction:column; }.contact-promise span { opacity:.82; }
.submission-success { display:flex; align-items:flex-start; gap:.85rem; margin-bottom:1.2rem; padding:1rem; border:1px solid #abefc6; border-radius:14px; color:#166534; background:#ecfdf3; }
.submission-success__icon { display:grid; place-items:center; width:38px; height:38px; flex:0 0 38px; border-radius:50%; color:#fff; background:#16a34a; }
.form-control,.form-select { min-height:46px; }.form-control:focus,.form-select:focus { box-shadow:0 0 0 .22rem rgba(37,99,235,.12); }
@media (max-width:991.98px){.contact-page .marketing-hero{padding-top:3rem}.contact-promise{color:inherit;border-color:var(--ant-slate-200);background:#fff}}
</style>
