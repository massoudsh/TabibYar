// دکمهٔ چاپ برگهٔ بیمار — جدا از inline تا با CSP (script-src 'self') سازگار باشد.
(function () {
  var button = document.querySelector('[data-print]');
  if (button) button.addEventListener('click', function () { window.print(); });
})();
