<template>
  <section class="card mb-4">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-start gap-2">
      <div>
        <h2 class="h5 mb-1">Site survey</h2>
        <p class="small text-muted mb-0">A completed technical survey is required before quotation approval.</p>
      </div>
      <span class="badge" :class="statusClass">{{ statusLabel }}</span>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
      <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

      <div v-if="!canUpdate" class="survey-summary">
        <div><small>Surveyor</small><strong>{{ form.surveyor || 'Not assigned' }}</strong></div>
        <div><small>Scheduled date</small><strong>{{ displayDate(project.siteSurveyScheduledDate) }}</strong></div>
        <div><small>Completed date</small><strong>{{ displayDate(project.siteSurveyCompletedDate) }}</strong></div>
      </div>

      <form v-else @submit.prevent>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Survey date</label>
            <input v-model="form.scheduledDate" type="date" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Surveyor</label>
            <input v-model.trim="form.surveyor" class="form-control" maxlength="150" placeholder="Technician or survey team" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Roof / mounting type</label>
            <input v-model.trim="form.roofType" class="form-control" maxlength="120" placeholder="Concrete roof, tin shed, ground mount…" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Meter type</label>
            <input v-model.trim="form.meterType" class="form-control" maxlength="120" placeholder="Single phase, three phase…" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Sanctioned load</label>
            <input v-model.trim="form.sanctionedLoad" class="form-control" maxlength="120" placeholder="Example: 5 kW" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Recommended solar capacity</label>
            <input v-model.trim="form.recommendedCapacity" class="form-control" maxlength="120" placeholder="Example: 3.3 kW" />
          </div>
          <div class="col-12">
            <label class="form-label">Shadow and access assessment</label>
            <textarea v-model.trim="form.shadowAssessment" class="form-control" rows="2" maxlength="1000"></textarea>
          </div>
          <div class="col-12">
            <label class="form-label">Technical findings *</label>
            <textarea v-model.trim="form.findings" class="form-control" rows="3" maxlength="3000" placeholder="Cable route, earthing, structure, meter location, safety and installation observations."></textarea>
            <div class="form-text">Required before marking the survey complete.</div>
          </div>
          <div class="col-12">
            <label class="form-label">Customer update message</label>
            <textarea v-model.trim="form.customerMessage" class="form-control" rows="2" maxlength="1000" placeholder="Only this customer-safe message is sent by email."></textarea>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-3">
          <button type="button" class="btn btn-outline-primary" :disabled="busy || !canSchedule" @click="saveSurvey('schedule')">
            <span v-if="busyAction === 'schedule'" class="spinner-border spinner-border-sm me-2"></span>
            {{ project.siteSurveyStatus === 'scheduled' ? 'Reschedule survey' : 'Schedule survey' }}
          </button>
          <button type="button" class="btn btn-success" :disabled="busy || !canComplete" @click="saveSurvey('complete')">
            <span v-if="busyAction === 'complete'" class="spinner-border spinner-border-sm me-2"></span>
            Mark survey complete
          </button>
        </div>
        <small v-if="project.siteSurveyStatus !== 'completed'" class="d-block text-muted mt-2">
          Quotation approval remains blocked until this step is completed.
        </small>
      </form>
    </div>
  </section>
</template>

<script>
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

export default {
  name: 'SiteSurveyPanel',
  props: {
    project: { type: Object, required: true },
    canUpdate: { type: Boolean, default: false }
  },
  emits: ['updated', 'warning'],
  data() {
    return {
      form: this.emptyForm(),
      busyAction: '',
      error: '',
      success: ''
    };
  },
  computed: {
    busy() {
      return Boolean(this.busyAction);
    },
    statusLabel() {
      return {
        not_scheduled: 'Not scheduled',
        scheduled: 'Scheduled',
        completed: 'Completed'
      }[this.project.siteSurveyStatus] || 'Not scheduled';
    },
    statusClass() {
      return {
        not_scheduled: 'bg-secondary',
        scheduled: 'bg-warning text-dark',
        completed: 'bg-success'
      }[this.project.siteSurveyStatus] || 'bg-secondary';
    },
    canSchedule() {
      return Boolean(this.form.scheduledDate && this.form.surveyor);
    },
    canComplete() {
      return this.canSchedule && this.form.findings.length >= 10;
    }
  },
  watch: {
    project: {
      immediate: true,
      deep: true,
      handler() {
        this.form = this.emptyForm();
      }
    }
  },
  methods: {
    toDate(value) {
      if (!value) return null;
      if (typeof value.toDate === 'function') return value.toDate();
      if (value._seconds) return new Date(Number(value._seconds) * 1000);
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    },
    dateInput(value) {
      const date = this.toDate(value);
      return date ? date.toISOString().slice(0, 10) : '';
    },
    displayDate(value) {
      const date = this.toDate(value);
      return date ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date) : 'Not set';
    },
    emptyForm() {
      const survey = this.project?.siteSurvey || {};
      return {
        scheduledDate: this.dateInput(this.project?.siteSurveyScheduledDate || survey.scheduledDate),
        surveyor: survey.surveyor || '',
        findings: survey.findings || '',
        roofType: survey.roofType || '',
        meterType: survey.meterType || '',
        shadowAssessment: survey.shadowAssessment || '',
        sanctionedLoad: survey.sanctionedLoad || '',
        recommendedCapacity: survey.recommendedCapacity || '',
        customerMessage: this.project?.siteSurveySummary || ''
      };
    },
    async saveSurvey(action) {
      this.busyAction = action;
      this.error = '';
      this.success = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/updateSiteSurvey', {
          method: 'POST',
          body: JSON.stringify({
            projectId: this.project.projectId,
            expectedRevision: Number(this.project.revision || 0),
            action,
            ...this.form
          })
        });
        this.success = action === 'complete' ? 'Site survey completed.' : 'Site survey scheduled.';
        if (!result.email?.sent) this.$emit('warning', result.email?.error || 'Customer survey email delivery is pending.');
        this.$emit('updated');
      } catch (error) {
        this.error = error.message || 'Unable to update the site survey.';
      } finally {
        this.busyAction = '';
      }
    }
  }
};
</script>

<style scoped>
.survey-summary { display: grid; gap: .7rem; }
.survey-summary div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .6rem; border-bottom: 1px solid var(--ant-slate-100); }
.survey-summary small { color: var(--ant-slate-500); }
</style>
