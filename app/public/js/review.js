// ایشو #8: منطق سمت-کلاینت صفحهٔ بازبینی پیش‌نویس — ویرایش inline قبل از تأیید.
(function () {
  const form = document.getElementById('draft-form');
  if (!form) return;
  const visitId = form.dataset.visitId;

  function linesToList(name) {
    return form[name].value.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  function parseMedications() {
    return linesToList('medications').map((line) => {
      const [name, dosage, instructions] = line.split('|').map((s) => (s || '').trim());
      const med = { name };
      if (dosage) med.dosage = dosage;
      if (instructions) med.instructions = instructions;
      return med;
    });
  }

  function parseFollowUp() {
    return linesToList('follow_up').map((line) => {
      const [description, due_hint] = line.split('|').map((s) => (s || '').trim());
      const item = { description };
      if (due_hint) item.due_hint = due_hint;
      return item;
    });
  }

  function collectDraft() {
    return {
      history: form.history.value,
      findings: form.findings.value,
      differential_diagnosis_draft: linesToList('differential_diagnosis_draft'),
      treatment_plan: form.treatment_plan.value,
      medications: parseMedications(),
      patient_summary: form.patient_summary.value,
      warnings: linesToList('warnings'),
      follow_up: parseFollowUp(),
      missing_or_ambiguous: [],
      parse_error: false,
    };
  }

  async function saveDraft() {
    const res = await fetch(`/visits/${visitId}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited: JSON.stringify(collectDraft()) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('خطا در ذخیره: ' + (data.error || res.status));
    } else {
      window.location.reload();
    }
  }

  document.getElementById('save-draft').addEventListener('click', saveDraft);
  document.getElementById('approve-btn').addEventListener('click', async () => {
    await saveDraft();
    await fetch(`/visits/${visitId}/approve`, { method: 'POST' });
    window.location.reload();
  });
})();
