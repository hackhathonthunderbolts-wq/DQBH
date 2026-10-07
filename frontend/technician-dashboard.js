
/* ================================================================
   FIELD TECHNICIAN WORKSPACE CONTROLLER
   ================================================================ */
(() => {
  // This file is loaded from <head>, so the dashboard element may not
  // exist yet. Initialize only after the document has been parsed.
  function initializeTechnicianWorkspace() {
  const dashboard = document.getElementById('technician-dashboard');
  if (!dashboard) return;

  let lastDomain = null;

  function openDashboard() {
    if (!dashboard) return;

    // Hard-switch to the technician application. Hide the legacy
    // marketing/platform shell so it can never appear behind the dashboard.
    dashboard.hidden = false;
    document.body.classList.add('technician-mode');
    document.body.classList.add('workspace-unlocked');
    document.getElementById('auth-gate')?.setAttribute('hidden', '');
    document.querySelector('.site-header')?.setAttribute('hidden', '');
    document.querySelector('.chapter-scroll')?.setAttribute('hidden', '');
    document.getElementById('main')?.setAttribute('hidden', '');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Explicit public entry point used by the authentication flow.
  // This avoids relying on MutationObserver timing.
  window.openTechnicianWorkspace = openDashboard;

  function closeDashboard() {
    dashboard.hidden = true;
    document.body.classList.remove('technician-mode');
    document.querySelector('.site-header')?.removeAttribute('hidden');
    document.querySelector('.chapter-scroll')?.removeAttribute('hidden');
    document.getElementById('main')?.removeAttribute('hidden');
  }

  function syncDomainState() {
    const login = document.getElementById('login-panel');
    const gate = document.getElementById('auth-gate');
    const domain = login?.dataset.domain;
    const unlocked = gate?.hasAttribute('hidden');
    if (domain === 'technician' && unlocked) {
      if (lastDomain !== 'technician') openDashboard();
      lastDomain = 'technician';
    } else if (lastDomain === 'technician' && !unlocked) {
      closeDashboard();
      lastDomain = null;
    }
  }

  window.exitTechnicianWorkspace = () => {
    closeDashboard();
    document.body.classList.remove('workspace-unlocked');
    document.getElementById('auth-gate')?.removeAttribute('hidden');
    document.getElementById('domain-panel')?.removeAttribute('hidden');
    document.getElementById('login-panel')?.setAttribute('hidden', '');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  window.techToast = (message) => {
    let toast = document.getElementById('tech-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tech-toast';
      toast.className = 'tech-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(window.__techToastTimer);
    window.__techToastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };

  const observer = new MutationObserver(syncDomainState);
  observer.observe(document.body, { attributes:true, subtree:true, attributeFilter:['hidden','class','data-domain'] });
  document.addEventListener('DOMContentLoaded', syncDomainState);
  // Also recover automatically if the auth state was already established.
  setTimeout(syncDomainState, 50);

  document.querySelectorAll('[data-tech-view], [data-tech-view-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.techView || button.dataset.techViewTarget;
      document.querySelectorAll('.tech-nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.techView === view));
      const labels = { overview:'FIELD OVERVIEW', tasks:'MY TASKS', schedule:'TODAY / SCHEDULE', skills:'SKILLS & CERTIFICATIONS', notifications:'NOTIFICATIONS' };
      window.techToast?.(labels[view] || 'Workspace updated');
    });
  });

  // Live dashboard analytics + interaction layer
  const checklist = [...document.querySelectorAll('.tech-checklist input[type="checkbox"]')];
  const progressBar = document.querySelector('.tech-progress-track i');
  const progressStrong = document.querySelector('.tech-progress-top strong');
  const donut = document.getElementById('tech-completion-donut');
  const donutValue = document.getElementById('tech-donut-value');
  const completeCount = document.getElementById('tech-complete-count');
  const pendingCount = document.getElementById('tech-pending-count');
  const weekTotal = document.getElementById('tech-week-total');
  const weekBars = [...document.querySelectorAll('#tech-week-bars > span')];
  const resetAnalytics = document.getElementById('tech-reset-analytics');

  const initialChecked = checklist.map(input => input.checked);
  const initialBars = weekBars.map(bar => Number(bar.dataset.value || 0));

  function refreshAnalytics() {
    const completed = checklist.filter(input => input.checked).length;
    const total = checklist.length || 1;
    const pct = Math.round((completed / total) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressStrong) progressStrong.textContent = completed + ' / ' + total + ' steps';
    if (donut) donut.style.setProperty('--completion', Math.max(4, pct * 3.6) + 'deg');
    if (donutValue) donutValue.textContent = completed + '/' + total;
    if (completeCount) completeCount.textContent = completed;
    if (pendingCount) pendingCount.textContent = total - completed;

    const doneLabels = document.querySelectorAll('.tech-checklist label');
    doneLabels.forEach(label => {
      const input = label.querySelector('input');
      label.classList.toggle('done', !!input?.checked);
    });

    const totalWeek = weekBars.reduce((sum, bar) => sum + Number(bar.dataset.value || 0), 0);
    if (weekTotal) weekTotal.textContent = totalWeek;
  }

  checklist.forEach(input => input.addEventListener('change', () => {
    refreshAnalytics();
    window.techToast?.(input.checked ? 'Execution step completed' : 'Execution step reopened');
  }));

  weekBars.forEach(bar => {
    bar.addEventListener('click', () => {
      const current = Number(bar.dataset.value || 0);
      const next = current >= 9 ? 1 : current + 1;
      bar.dataset.value = String(next);
      bar.style.setProperty('--bar', Math.min(100, next * 10 + 5) + '%');
      refreshAnalytics();
      window.techToast?.(bar.dataset.day + ' activity updated to ' + next + ' tasks');
    });
  });

  resetAnalytics?.addEventListener('click', () => {
    checklist.forEach((input, index) => { input.checked = initialChecked[index]; });
    weekBars.forEach((bar, index) => {
      bar.dataset.value = String(initialBars[index]);
      bar.style.setProperty('--bar', Math.min(100, initialBars[index] * 10 + 5) + '%');
    });
    refreshAnalytics();
    window.techToast?.('Dashboard analytics reset');
  });

  // Make the main action buttons perform visible dashboard actions.
  document.querySelector('.tech-primary-action')?.addEventListener('click', () => {
    refreshAnalytics();
    window.techToast?.('Progress saved · task log synchronized');
  });
  document.querySelector('.tech-secondary-action')?.addEventListener('click', () => {
    window.techToast?.('Evidence capture ready · 3 attachment slots available');
  });
  document.querySelector('.tech-more-action')?.addEventListener('click', () => {
    window.techToast?.('Problem report workspace opened');
  });

  refreshAnalytics();

  const availability = document.getElementById('tech-availability-toggle');
  availability?.addEventListener('click', () => {
    const isAvailable = availability.classList.toggle('is-available');
    availability.setAttribute('aria-pressed', String(isAvailable));
    const label = document.getElementById('tech-availability-label');
    if (label) label.textContent = isAvailable ? 'AVAILABLE' : 'OFFLINE';
    window.techToast?.(isAvailable ? 'Availability set to AVAILABLE' : 'Availability set to OFFLINE');
  });
  }

  // Run after parsing so all dashboard markup exists.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTechnicianWorkspace, { once: true });
  } else {
    initializeTechnicianWorkspace();
  }
})();
