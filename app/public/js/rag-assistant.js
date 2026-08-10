// ایشو #28: منطق سمت-کلاینت جعبهٔ پرسش تعاملی از دستیار RAG.
(function () {
  const form = document.getElementById('rag-ask-form');
  if (!form) return;
  const visitId = form.dataset.visitId;
  const answerBox = document.getElementById('rag-answer');
  const submitBtn = form.querySelector('button[type="submit"]');

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = form.question.value.trim();
    if (!question) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال پرسش...';
    answerBox.hidden = true;

    try {
      const res = await fetch(`/visits/${visitId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در دریافت پاسخ');

      const sourcesText = data.sources && data.sources.length
        ? `<p class="rag-sources">منابع: ${data.sources.map((s) => escapeHtml(s.heading)).join('، ')}</p>`
        : '';
      answerBox.innerHTML = `<p>${escapeHtml(data.answer).replace(/\n/g, '<br>')}</p>${sourcesText}`;
      answerBox.hidden = false;
    } catch (err) {
      answerBox.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
      answerBox.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'پرسیدن';
    }
  });
})();
