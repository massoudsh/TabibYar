(() => {
  const selector = document.getElementById('visit-template');
  const input = document.getElementById('raw-input');
  if (!selector || !input) return;
  selector.addEventListener('change', () => {
    const text = selector.selectedOptions[0]?.dataset.text;
    if (!text) return;
    if (input.value.trim() && !window.confirm('متن فعلی با قالب جایگزین شود؟')) return;
    input.value = text;
    input.focus();
  });
})();
