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

  const editorFields = {
    medications: [['name', 'نام دارو'], ['dosage', 'دوز'], ['instructions', 'دستور مصرف']],
    follow_up: [['description', 'شرح پیگیری'], ['due_hint', 'زمان پیشنهادی']],
  };
  function markDirty() {
    dirty = true;
    status.textContent = 'تغییرات ذخیره نشده';
  }
  for (const editor of form.querySelectorAll('[data-editor]')) {
    const rows = editor.querySelector('[data-rows]');
    editor.addEventListener('click', event => {
      if (form.querySelector('fieldset').disabled) return;
      if (event.target.matches('[data-add]')) {
        const row = document.createElement('div');
        row.dataset.row = '';
        editorFields[editor.dataset.editor].forEach(([name, title], index) => {
          const label = document.createElement('label');
          label.textContent = title;
          const input = document.createElement('textarea');
          input.dataset.field = name;
          input.dir = 'auto';
          input.required = index === 0;
          label.append(input);
          row.append(label);
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.remove = '';
        remove.textContent = editor.dataset.editor === 'medications' ? 'حذف دارو' : 'حذف پیگیری';
        row.append(remove);
        rows.append(row);
        row.querySelector('textarea').focus();
        markDirty();
      } else if (event.target.matches('[data-remove]')) {
        event.target.closest('[data-row]').remove();
        editor.querySelector('[data-add]').focus();
        markDirty();
      }
    });
  }
  function collectRows(name) {
    return Array.from(form.querySelectorAll(`[data-editor="${name}"] [data-row]`), row => {
      return Object.fromEntries(Array.from(row.querySelectorAll('[data-field]'), input => [input.dataset.field, input.value]));
    });
  }

  function collectDraft() {
    return {
      history: form.history.value,
      findings: form.findings.value,
      differential_diagnosis_draft: linesToList('differential_diagnosis_draft'),
      treatment_plan: form.treatment_plan.value,
      medications: collectRows('medications'),
      patient_summary: form.patient_summary.value,
      warnings: linesToList('warnings'),
      follow_up: collectRows('follow_up'),
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
    if (!form.reportValidity()) {
      status.textContent = 'فیلدهای الزامی را تکمیل کنید.';
      return;
    }
    if (approve && !window.confirm('محتوای بازبینی‌شده نهایی شود؟ ارسال پیامک اقدام جداگانه‌ای است.')) return;
    busy = true;
    const fieldset = form.querySelector('fieldset');
    fieldset.disabled = true;
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
      fieldset.disabled = false;
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
