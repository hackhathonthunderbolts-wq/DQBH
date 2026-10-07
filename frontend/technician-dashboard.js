/* ================================================================
   DQBH FIELD TECHNICIAN — INTERACTIVE WORKSPACE
   ================================================================ */
(() => {
  function initialize() {
    const dashboard = document.getElementById('technician-dashboard');
    if (!dashboard || dashboard.dataset.initialized) return;
    dashboard.dataset.initialized = 'true';

    const $ = (s, root=document) => root.querySelector(s);
    const $$ = (s, root=document) => [...root.querySelectorAll(s)];

    const state = {
      available: true,
      activeView: 'overview',
      notifications: 2,
      evidence: 0,
      problems: 0
    };

    function toast(message) {
      let el = $('#tech-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'tech-toast';
        el.className = 'tech-toast';
        document.body.appendChild(el);
      }
      el.textContent = message;
      el.classList.add('is-visible');
      clearTimeout(window.__techToastTimer);
      window.__techToastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
    }
    window.techToast = toast;

    function openDashboard() {
      dashboard.hidden = false;
      document.body.classList.add('technician-mode','workspace-unlocked');
      $('#auth-gate')?.setAttribute('hidden','');
      $('.site-header')?.setAttribute('hidden','');
      $('.chapter-scroll')?.setAttribute('hidden','');
      $('#main')?.setAttribute('hidden','');
      window.scrollTo({top:0,behavior:'instant'});
    }
    window.openTechnicianWorkspace = openDashboard;

    window.exitTechnicianWorkspace = () => {
      dashboard.hidden = true;
      document.body.classList.remove('technician-mode','workspace-unlocked');
      $('.site-header')?.removeAttribute('hidden');
      $('.chapter-scroll')?.removeAttribute('hidden');
      $('#main')?.removeAttribute('hidden');
      $('#auth-gate')?.removeAttribute('hidden');
      $('#domain-panel')?.removeAttribute('hidden');
      $('#login-panel')?.setAttribute('hidden','');
      window.scrollTo({top:0,behavior:'instant'});
    };

    function setView(view) {
      state.activeView = view;
      $$('.tech-nav-item').forEach(x => x.classList.toggle('is-active', x.dataset.techView === view));
      const old = $('#tech-dynamic-view');
      if (old) old.hidden = view === 'overview';
      $$('.tech-overview-only').forEach(x => x.hidden = view !== 'overview');
      if (view !== 'overview') showWorkspaceView(view);
    }

    function showWorkspaceView(view) {
      let panel = $('#tech-dynamic-view');
      if (!panel) {
        panel = document.createElement('section');
        panel.id = 'tech-dynamic-view';
        panel.className = 'tech-panel tech-dynamic-view';
        $('.tech-content').appendChild(panel);
      }

      const unread = state.notifications;
      const data = {
        tasks: {
          index:'02 / MY TASKS', title:'Assigned work queue',
          body:'<div class="tech-dynamic-toolbar"><span>3 ACTIVE RECORDS</span><button data-close-view>BACK TO OVERVIEW</button></div>' +
          '<div class="tech-task-cards">' +
          '<button class="tech-interactive-row" data-task="SR-2026-1001"><b>SR-2026-1001</b><span>EMERGENCY · Gas turbine inspection</span><strong>01:45:22</strong></button>' +
          '<button class="tech-interactive-row" data-task="SR-2026-1003"><b>SR-2026-1003</b><span>HIGH · Hydraulic pressure anomaly</span><strong>03:20:00</strong></button>' +
          '<button class="tech-interactive-row" data-task="SR-2026-1008"><b>SR-2026-1008</b><span>MEDIUM · Preventive maintenance</span><strong>11:10:00</strong></button></div>'
        },
        schedule: {
          index:'03 / TODAY / SCHEDULE', title:'Shift plan',
          body:'<div class="tech-dynamic-toolbar"><span>08:00 — 17:00 · CENTRAL ZONE</span><button data-close-view>BACK TO OVERVIEW</button></div>' +
          '<div class="tech-schedule-grid"><div><small>08:00</small><b>Shift started</b><span>Ready for assignments</span></div>' +
          '<div><small>10:30</small><b>SR-2026-1001</b><span>Emergency turbine inspection</span></div>' +
          '<div><small>14:00</small><b>SR-2026-1003</b><span>Hydraulic diagnostics</span></div>' +
          '<div><small>16:15</small><b>Service report review</b><span>Submit completion evidence</span></div></div>'
        },
        skills: {
          index:'04 / SKILLS & CERTIFICATIONS', title:'Technician capability profile',
          body:'<div class="tech-dynamic-toolbar"><span>PROFILE VERIFIED</span><button data-close-view>BACK TO OVERVIEW</button></div>' +
          '<div class="tech-capability-grid"><article><b>Electrical</b><span>EXPERT</span><i style="--level:92%"></i></article>' +
          '<article><b>Mechanical</b><span>EXPERT</span><i style="--level:88%"></i></article>' +
          '<article><b>PLC</b><span>INTERMEDIATE</span><i style="--level:72%"></i></article>' +
          '<article><b>Hydraulics</b><span>INTERMEDIATE</span><i style="--level:68%"></i></article></div>' +
          '<div class="tech-cert-list"><b>Certifications</b><span>✓ Electrical Safety · Valid</span><span>✓ PLC Programming · Valid</span><span>! Forklift Operation · Expired</span></div>'
        },
        notifications: {
          index:'05 / NOTIFICATIONS', title:'Operational inbox',
          body:'<div class="tech-dynamic-toolbar"><span>' + unread + ' UNREAD</span><button data-mark-read>MARK ALL READ</button></div>' +
          '<div class="tech-inbox"><button class="tech-inbox-row unread"><b>Emergency assignment</b><span>SR-2026-1001 at Houston Energy Complex A</span><small>2 min ago</small></button>' +
          '<button class="tech-inbox-row unread"><b>Parts reservation confirmed</b><span>3 parts reserved for SR-2026-1001</span><small>1 hr ago</small></button>' +
          '<button class="tech-inbox-row"><b>Performance report</b><span>Your weekly performance is ready</span><small>3 hr ago</small></button></div>'
        }
      }[view];

      panel.innerHTML = '<div class="tech-panel-head"><div><span class="tech-panel-index">' + data.index +
        '</span><h3>' + data.title + '</h3></div></div><div class="tech-dynamic-body">' + data.body + '</div>';
      panel.hidden = false;
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    }

    function refreshAnalytics() {
      const checks = $$('input[type="checkbox"]', dashboard);
      const done = checks.filter(x=>x.checked).length;
      const total = checks.length || 1;
      const pct = Math.round(done/total*100);
      $('.tech-progress-track i')?.style.setProperty('width',pct+'%');
      const progress=$('.tech-progress-top strong');
      if(progress) progress.textContent=done+' / '+total+' steps';
      const donut=$('#tech-completion-donut');
      if(donut) donut.style.setProperty('--completion',Math.max(4,pct*3.6)+'deg');
      const value=$('#tech-donut-value'); if(value) value.textContent=done+'/'+total;
      const complete=$('#tech-complete-count'); if(complete) complete.textContent=done;
      const pending=$('#tech-pending-count'); if(pending) pending.textContent=total-done;
      const totalWeek=$$('#tech-week-bars > span').reduce((a,b)=>a+Number(b.dataset.value||0),0);
      const week=$('#tech-week-total'); if(week) week.textContent=totalWeek;
      $$('.tech-checklist label').forEach(label => {
        const input=$('input',label);
        label.classList.toggle('done',!!input?.checked);
      });
    }

    function addTimeline(title, detail) {
      const timeline=$('.tech-timeline');
      if(!timeline) return;
      const now=new Date();
      const time=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
      const item=document.createElement('div');
      item.className='tech-timeline-item current';
      item.innerHTML='<span>'+time+'</span><i></i><div><b>'+title+'</b><small>'+detail+'</small></div>';
      timeline.prepend(item);
      $$('.tech-timeline-item',timeline).slice(7).forEach(x=>x.remove());
    }

    function updateAvailability() {
      state.available=!state.available;
      const btn=$('#tech-availability-toggle');
      btn?.classList.toggle('is-available',state.available);
      btn?.setAttribute('aria-pressed',String(state.available));
      const label=$('#tech-availability-label');
      if(label) label.textContent=state.available?'AVAILABLE':'OFFLINE';
      toast(state.available?'You are now accepting assignments':'You are offline and will not receive new assignments');
      addTimeline(state.available?'Availability enabled':'Availability paused',state.available?'Dispatcher can assign new work':'Current assignments remain visible');
    }

    function openTaskDetail(id) {
      $('#tech-task-drawer')?.remove();
      const drawer=document.createElement('aside');
      drawer.id='tech-task-drawer';
      drawer.className='tech-task-drawer';
      drawer.innerHTML='<div class="tech-drawer-head"><div><span>TASK DETAIL</span><h3>'+id+
        '</h3></div><button data-close-drawer>×</button></div><div class="tech-drawer-body">' +
        '<div class="tech-drawer-status"><b>EMERGENCY</b><span>IN PROGRESS</span><strong>01:45:22</strong></div>' +
        '<p>Houston Energy Complex A · Unit 04</p><p>9HA.02 Heavy-Duty Gas Turbine</p>' +
        '<div class="tech-drawer-actions"><button data-start-task>START / RESUME</button><button data-checkin>CHECK IN</button><button data-add-evidence>ADD EVIDENCE</button><button data-report-problem>REPORT PROBLEM</button></div>' +
        '<div class="tech-drawer-log"><b>Task log</b><span>Dispatcher assigned technician</span><span>Safety isolation verified</span></div></div>';
      document.body.appendChild(drawer);
      requestAnimationFrame(()=>drawer.classList.add('open'));
      drawer.addEventListener('click',e=>{
        const t=e.target;
        if(t.closest('[data-close-drawer]')) closeDrawer();
        if(t.closest('[data-start-task]')) { addTimeline('Task resumed',id+' is now in active execution'); toast('Task resumed'); }
        if(t.closest('[data-checkin]')) { addTimeline('Checked in to site',id+' · location verified'); toast('Site check-in recorded'); }
        if(t.closest('[data-add-evidence]')) { state.evidence++; addTimeline('Evidence attached',state.evidence+' evidence item queued'); toast('Evidence item added'); }
        if(t.closest('[data-report-problem]')) { state.problems++; addTimeline('Problem reported',id+' · dispatcher notified'); toast('Problem report created'); }
      });
    }
    function closeDrawer() {
      const d=$('#tech-task-drawer');
      d?.classList.remove('open');
      setTimeout(()=>d?.remove(),180);
    }

    $$('.tech-nav-item').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.techView)));
    $('[data-tech-view-target="notifications"]')?.addEventListener('click',()=>setView('notifications'));
    $('#tech-availability-toggle')?.addEventListener('click',updateAvailability);

    $$('.tech-checklist input[type="checkbox"]').forEach(input=>input.addEventListener('change',()=>{
      refreshAnalytics();
      const label=input.parentElement?.textContent?.trim() || 'Execution step';
      addTimeline(input.checked?'Execution step completed':'Execution step reopened',label);
      toast(input.checked?'Step completed · progress recalculated':'Step reopened · progress recalculated');
    }));

    dashboard.addEventListener('click',e=>{
      const row=e.target.closest('.tech-task-row,.tech-interactive-row');
      if(row) openTaskDetail(row.dataset.task || 'SR-2026-1001');

      const close=e.target.closest('[data-close-view]');
      if(close) { setView('overview'); }

      if(e.target.closest('[data-mark-read]')) {
        state.notifications=0;
        $$('.tech-alert-count').forEach(x=>x.textContent='0');
        toast('All notifications marked as read');
        setView('notifications');
      }

      const bar=e.target.closest('#tech-week-bars > span');
      if(bar) {
        const next=(Number(bar.dataset.value||0)>=9)?1:Number(bar.dataset.value||0)+1;
        bar.dataset.value=String(next);
        bar.style.setProperty('--bar',Math.min(100,next*10+5)+'%');
        refreshAnalytics();
        toast(bar.dataset.day+' activity updated to '+next+' tasks');
      }

      const card=e.target.closest('.tech-metrics article');
      if(card) {
        const index=$$('.tech-metrics article').indexOf(card);
        if(index===1) setView('tasks');
        else if(index===2) setView('schedule');
        else if(index===3) setView('skills');
        else toast('Active assignment opened');
      }
    });

    $('.tech-route-btn')?.addEventListener('click',()=>{
      addTimeline('Route opened','Houston Energy Complex A · 2.8 km');
      toast('Route preview opened');
      $('.tech-map-marker')?.classList.add('pulse');
    });

    $('.tech-primary-action')?.addEventListener('click',()=>{
      refreshAnalytics();
      addTimeline('Progress saved','Task log synchronized successfully');
      toast('Progress saved · task log synchronized');
    });
    $('.tech-secondary-action')?.addEventListener('click',()=>{
      state.evidence++;
      addTimeline('Evidence capture opened',state.evidence+' attachment slot(s) ready');
      toast('Evidence capture opened');
    });
    $('.tech-more-action')?.addEventListener('click',()=>{
      state.problems++;
      addTimeline('Problem report opened','Dispatcher workspace notified');
      toast('Problem report workspace opened');
    });

    refreshAnalytics();
    setView('overview');

    const observer=new MutationObserver(()=>{
      const login=$('#login-panel');
      if(login?.dataset.domain==='technician' && $('#auth-gate')?.hasAttribute('hidden')) openDashboard();
    });
    observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['hidden','data-domain']});
    setTimeout(()=>{
      if($('#login-panel')?.dataset.domain==='technician' && $('#auth-gate')?.hasAttribute('hidden')) openDashboard();
    },50);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();