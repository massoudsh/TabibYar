// ایشو #8: منطق سمت-کلاینت صفحهٔ بازبینی پیش‌نویس — ویرایش inline قبل از تأیید.
(function () {
  const form = document.getElementById('draft-form');
  if (!form) return;
  const visitId = form.dataset.visitId;
  const original = JSON.parse(form.dataset.original);
  const status = document.getElementById('save-status');
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  let dirty = false;
  let busy = false;
  form.addEventListener('input', () => { dirty = true; status.textContent = 'تغییرات ذخیره نشده'; });
  window.addEventListener('beforeunload', (event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });

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
      missing_or_ambiguous: original.missing_or_ambiguous || [],
      parse_error: original.parse_error || false,
    };
  }

  async function saveDraft() {
    const res = await fetch(`/visits/${visitId}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ edited: JSON.stringify(collectDraft()) }),
    });
    if (!res.ok || res.redirected) throw new Error('ذخیره انجام نشد. ورود و داده‌ها را بررسی کنید.');
    dirty = false;
    status.textContent = 'ذخیره شد — ' + new Date().toLocaleTimeString('fa-IR');
  }

  async function perform(approve = false) {
    if (busy || form.querySelector('fieldset').disabled) return;
    if (approve && !window.confirm('محتوای بازبینی‌شده نهایی شود؟ ارسال پیامک اقدام جداگانه‌ای است.')) return;
    busy = true;
    const buttons = [document.getElementById('save-draft'), document.getElementById('approve-btn')];
    buttons.forEach(button => { button.disabled = true; });
    try {
      await saveDraft();
      if (approve) {
        const response = await fetch(`/visits/${visitId}/approve`, {
          method: 'POST', headers: { 'Accept': 'application/json', 'X-CSRF-Token': csrf },
        });
        if (!response.ok || response.redirected) throw new Error('تأیید انجام نشد. دوباره تلاش کنید.');
        window.location.reload();
      }
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = false;
      buttons.forEach(button => { button.disabled = false; });
    }
  }
  document.getElementById('save-draft').addEventListener('click', () => perform());
  document.getElementById('approve-btn').addEventListener('click', () => perform(true));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      perform();
    }
  });
})();
