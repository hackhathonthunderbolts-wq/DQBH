
/* ================================================================
   FIELD TECHNICIAN WORKSPACE CONTROLLER
   ================================================================ */
(() => {
  const dashboard = document.getElementById('technician-dashboard');
  if (!dashboard) return;

  let lastDomain = null;

  function openDashboard() {
    dashboard.hidden = false;
    document.body.classList.add('technician-mode');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function closeDashboard() {
    dashboard.hidden = true;
    document.body.classList.remove('technician-mode');
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
  setTimeout(syncDomainState, 150);

  document.querySelectorAll('[data-tech-view], [data-tech-view-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.techView || button.dataset.techViewTarget;
      document.querySelectorAll('.tech-nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.techView === view));
      const labels = { overview:'FIELD OVERVIEW', tasks:'MY TASKS', schedule:'TODAY / SCHEDULE', skills:'SKILLS & CERTIFICATIONS', notifications:'NOTIFICATIONS' };
      window.techToast?.(labels[view] || 'Workspace updated');
    });
  });

  const availability = document.getElementById('tech-availability-toggle');
  availability?.addEventListener('click', () => {
    const isAvailable = availability.classList.toggle('is-available');
    availability.setAttribute('aria-pressed', String(isAvailable));
    const label = document.getElementById('tech-availability-label');
    if (label) label.textContent = isAvailable ? 'AVAILABLE' : 'OFFLINE';
    window.techToast?.(isAvailable ? 'Availability set to AVAILABLE' : 'Availability set to OFFLINE');
  });
})();
