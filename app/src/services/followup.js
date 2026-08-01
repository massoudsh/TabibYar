// ایشو #23: مقایسهٔ سادهٔ ویزیت فعلی با ویزیت قبلی همان بیمار.
// ایشو #24: برجسته‌سازی شکایت‌های تکرارشونده بین دو ویزیت متوالی.
// ایشو #11: خروجی این ماژول در شروع ویزیت جدید به‌عنوان «خلاصهٔ تغییرات از ویزیت قبلی»
//           در کلاینت پزشک نمایش داده می‌شود (وابسته به RBAC #21 برای محدودسازی دسترسی).
import { pool } from '../db/pool.js';

/** ساده‌ترین معیار «تکرار شکایت»: هم‌پوشانی توکن‌های معنادار متن history دو ویزیت. */
function extractKeywords(text) {
  if (!text) return new Set();
  return new Set(
    text
      .split(/[\s،.,؛;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3)
  );
}

function findRecurringComplaints(currentHistory, previousHistory) {
  const current = extractKeywords(currentHistory);
  const previous = extractKeywords(previousHistory);
  const recurring = [...current].filter((w) => previous.has(w));
  return recurring;
}

/**
 * آخرین ویزیت approved قبل از ویزیت فعلی همان بیمار را برمی‌گرداند (یا null).
 */
export async function getPreviousApprovedVisit(patientId, currentVisitId) {
  const { rows } = await pool.query(
    `SELECT v.id AS visit_id, v.visit_date, cn.approved_content
     FROM visits v
     JOIN clinical_notes cn ON cn.visit_id = v.id
     WHERE v.patient_id = $1 AND v.id != $2 AND v.status = 'approved'
     ORDER BY v.visit_date DESC
     LIMIT 1`,
    [patientId, currentVisitId]
  );
  return rows[0] || null;
}

/**
 * خروجی «خلاصهٔ تغییرات از ویزیت قبلی» — بدون تحلیل روند پیچیده، فقط مقایسهٔ ساده
 * طبق محدودهٔ فاز اول (docs/issues.md اپیک ۶).
 */
export function diffVisits(currentDraft, previousApprovedContent) {
  if (!previousApprovedContent) {
    return { hasPrevious: false };
  }

  const recurringComplaints = findRecurringComplaints(
    currentDraft?.history,
    previousApprovedContent?.history
  );

  const previousMedNames = new Set((previousApprovedContent?.medications || []).map((m) => m.name));
  const currentMedNames = new Set((currentDraft?.medications || []).map((m) => m.name));

  const medicationsAdded = [...currentMedNames].filter((n) => !previousMedNames.has(n));
  const medicationsStopped = [...previousMedNames].filter((n) => !currentMedNames.has(n));

  return {
    hasPrevious: true,
    recurringComplaints, // ایشو #24
    medicationsAdded,
    medicationsStopped,
    previousWarnings: previousApprovedContent?.warnings || [],
  };
}
