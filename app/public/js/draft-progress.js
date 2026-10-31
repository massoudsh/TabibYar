(function () {
  const panel = document.getElementById('draft-progress');
  if (!panel) return;
  const status = panel.querySelector('[role="status"]');
  const retry = document.getElementById('retry-draft');
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  let delay = 2000;
  let timer;
  let stopped = false;
  let polling = false;
  async function poll() {
    if (document.hidden || stopped || polling) return;
    polling = true;
    try {
      const response = await fetch(`/visits/${panel.dataset.visitId}/status`, { headers: { Accept: 'application/json' } });
      if (response.status === 401 || response.status === 403 || response.status === 404 || response.redirected) {
        stopped = true;
        status.textContent = 'برای ادامه دسترسی و ورود خود را بررسی کنید.';
        return;
      }
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.status === 'ready') {
        stopped = true;
        window.location.reload();
        return;
      }
      if (result.status === 'failed') {
        stopped = true;
        retry.hidden = false;
        status.textContent = 'پردازش ناموفق بود. پس از یک دقیقه می‌توانید دوباره تلاش کنید.';
        return;
      }
      status.textContent = 'پیش‌نویس در حال پردازش است…';
    } catch {
      status.textContent = 'ارتباط برقرار نشد؛ بررسی وضعیت دوباره انجام می‌شود.';
    } finally {
      polling = false;
      if (!stopped && !document.hidden) {
        timer = setTimeout(poll, delay);
        delay = Math.min(delay * 1.5, 15000);
      }
    }
  }
  retry.addEventListener('click', async () => {
    retry.disabled = true;
    try {
      const response = await fetch(`/visits/${panel.dataset.visitId}/retry`, {
        method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-Token': csrf },
      });
      if (!response.ok || response.redirected) throw new Error();
      retry.hidden = true;
      stopped = false;
      delay = 2000;
      await poll();
    } catch {
      status.textContent = 'تلاش مجدد انجام نشد؛ ورود را بررسی کنید یا یک دقیقه بعد تلاش کنید.';
    } finally {
      retry.disabled = false;
    }
  });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) poll();
  });
  window.addEventListener('pagehide', () => { stopped = true; clearTimeout(timer); });
  poll();
})();
