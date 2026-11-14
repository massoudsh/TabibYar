// ساخت ردیف‌های قابل‌درج از دادهٔ نمایشی — بدون اتصال به دیتابیس تا قابل تست باشد.
// زمان‌ها نسبت به `now` محاسبه می‌شوند تا داشبورد «امروز» و شاخص‌های ۳۰ روزه همیشه پر باشند.
import { DEMO_PATIENTS } from './patients.js';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function at(now, daysAgo, hour = 10, minute = 0) {
  const date = new Date(now.getTime() - daysAgo * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY);
}

/** نسخهٔ تأییدشده: همان پیش‌نویس، یا نسخهٔ ویرایش‌شدهٔ پزشک. */
function approvedVersion(draft, mode) {
  if (mode === 'same') return draft;
  if (mode === 'edited') {
    return {
      ...draft,
      treatment_plan: `${draft.treatment_plan} (بازبینی و تأیید پزشک)`,
      missing_or_ambiguous: [],
    };
  }
  return null;
}

/**
 * @param {Date} now
 * @returns {{ patients: object[], visits: object[], notes: object[], medications: object[],
 *   followUps: object[], alerts: object[], auditLogs: object[], smsReminders: object[], jobs: object[] }}
 */
export function buildDemoRows(now = new Date()) {
  const rows = {
    patients: [], visits: [], notes: [], medications: [],
    followUps: [], alerts: [], auditLogs: [], smsReminders: [], jobs: [],
  };

  DEMO_PATIENTS.forEach((patient, patientIndex) => {
    const patientKey = `p${patientIndex + 1}`;
    const consentAt = patient.consent ? at(now, patient.consent.daysAgo, 9) : null;
    rows.patients.push({
      key: patientKey,
      fullName: patient.fullName,
      nationalId: patient.nationalId,
      phone: patient.phone,
      consentRecordedAt: consentAt,
      consentChannel: patient.consent?.channel ?? null,
      createdAt: consentAt ?? at(now, 1, 9),
    });
    if (consentAt) {
      rows.auditLogs.push({
        entityType: 'patient', entityKey: patientKey, action: 'created',
        metadata: { consentGiven: true, source: 'demo_seed' }, createdAt: consentAt,
      });
    }

    patient.visits.forEach((visit, visitIndex) => {
      const visitKey = `${patientKey}v${visitIndex + 1}`;
      const createdAt = at(now, visit.daysAgo, 9, 15 + visitIndex * 5);
      const approved = approvedVersion(visit.draft, visit.approved);
      const approvedAt = approved ? new Date(createdAt.getTime() + 9 * MINUTE) : null;

      rows.visits.push({
        key: visitKey, patientKey, visitDate: createdAt, createdAt, status: visit.status,
      });
      rows.notes.push({
        visitKey,
        rawInput: visit.rawInput,
        aiDraft: visit.draft,
        approvedContent: approved,
        approvedAt,
        createdAt,
      });
      rows.auditLogs.push({
        entityType: 'visit', entityKey: visitKey, action: 'created',
        metadata: { source: 'demo_seed' }, createdAt,
      });

      if (approved) {
        rows.auditLogs.push({
          entityType: 'visit', entityKey: visitKey, action: 'approved',
          metadata: { source: 'demo_seed' }, createdAt: approvedAt,
        });
        if (visit.approved === 'edited') {
          rows.auditLogs.push({
            entityType: 'visit', entityKey: visitKey, action: 'edited',
            metadata: { source: 'demo_seed' }, createdAt: new Date(approvedAt.getTime() - 2 * MINUTE),
          });
        }
        approved.medications.forEach((medication) => {
          rows.medications.push({
            visitKey, name: medication.name,
            dosage: medication.dosage ?? null, instructions: medication.instructions ?? null,
          });
        });
        if (visit.sms?.sent) {
          const sentAt = new Date(approvedAt.getTime() + visit.sms.minutesAfterApproval * MINUTE);
          rows.auditLogs.push({
            entityType: 'visit', entityKey: visitKey, action: 'sent_to_patient',
            metadata: { channel: 'sms', source: 'demo_seed' }, createdAt: sentAt,
          });
        }
      }

      (visit.followUps || []).forEach((item) => {
        const followUpKey = `${visitKey}f${rows.followUps.length}`;
        rows.followUps.push({
          key: followUpKey, visitKey, description: item.description,
          dueDate: addDays(now, item.dueInDays), status: item.status, createdAt: approvedAt ?? createdAt,
        });
        if (item.status === 'done') {
          rows.auditLogs.push({
            entityType: 'follow_up_item', entityKey: followUpKey, action: 'edited',
            metadata: { status: 'done', source: 'demo_seed' },
            createdAt: new Date(approvedAt.getTime() + 2 * DAY),
          });
        }
        if (item.status === 'pending' && visit.sms?.sent && patient.consent) {
          rows.smsReminders.push({
            followUpKey,
            scheduledFor: addDays(now, Math.max(item.dueInDays - 1, 1)),
            message: `یادآوری طبیب‌یار: ${item.description} — لطفاً در زمان مقرر مراجعه کنید.`,
            status: 'scheduled',
            createdAt: approvedAt,
          });
        }
      });

      (visit.alerts || []).forEach((description) => {
        rows.alerts.push({ visitKey, description, createdAt });
      });

      if (visit.status === 'draft') {
        rows.jobs.push({
          type: 'structure_visit',
          payload: { visitKey, specialty: 'internal_medicine', source: 'demo_seed' },
          status: 'done', attempts: 1, createdAt, updatedAt: new Date(createdAt.getTime() + 4 * MINUTE),
        });
      }
    });
  });

  return rows;
}
