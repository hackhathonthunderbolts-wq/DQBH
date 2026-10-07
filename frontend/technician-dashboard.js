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
      $('.tech-nav-item').forEach(x => x.classList.toggle('is-active', x.dataset.techView === view));
      const old = $('#tech-dynamic-view');
      if (old) old.hidden = view === 'overview';
      $('.tech-overview-only').forEach(x => x.hidden = view !== 'overview');

      if (view === 'overview') {
        const overview = $('.tech-content');
        overview?.scrollIntoView({behavior:'smooth', block:'start'});
        toast('Overview dashboard');
        return;
      }

      showWorkspaceView(view);
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
          body:`
            <div class="tech-dynamic-toolbar"><span>03 ACTIVE · 06 TOTAL ASSIGNMENTS</span><button data-close-view>BACK TO OVERVIEW</button></div>
            <div class="tech-view-kpis"><article><small>ACTIVE</small><strong>01</strong><span>Currently executing</span></article><article><small>QUEUED</small><strong>03</strong><span>Next assignments</span></article><article><small>COMPLETED</small><strong>24</strong><span>This month</span></article><article><small>SLA HEALTH</small><strong>96%</strong><span>Within target</span></article></div>
            <div class="tech-section-title"><span>TODAY'S ASSIGNMENTS</span><small>Sorted by priority</small></div>
            <div class="tech-task-board">
              <button class="tech-interactive-row featured" data-task="SR-2026-1001"><span class="task-code">SR-2026-1001</span><b>Emergency turbine inspection</b><small>Houston Energy Complex A · Unit 04 · 2.8 km</small><em>01:45:22</em><strong>IN PROGRESS</strong></button>
              <button class="tech-interactive-row" data-task="SR-2026-1003"><span class="task-code">SR-2026-1003</span><b>Hydraulic pressure anomaly</b><small>Houston Energy Complex B · Bay 07 · 6.4 km</small><em>03:20:00</em><strong>ASSIGNED</strong></button>
              <button class="tech-interactive-row" data-task="SR-2026-1008"><span class="task-code">SR-2026-1008</span><b>Preventive maintenance</b><small>Central Compressor Station · M-067 · 15.2 km</small><em>11:10:00</em><strong>QUEUED</strong></button>
            </div>
            <div class="tech-view-columns">
              <section class="tech-mini-panel"><h4>Completion trend</h4><div class="tech-progress-list"><label><span>Emergency</span><i><b style="width:88%"></b></i><strong>88%</strong></label><label><span>High</span><i><b style="width:94%"></b></i><strong>94%</strong></label><label><span>Routine</span><i><b style="width:97%"></b></i><strong>97%</strong></label></div></section>
              <section class="tech-mini-panel"><h4>Quick actions</h4><div class="tech-action-grid"><button data-task="SR-2026-1001">Resume active job</button><button data-close-view>View route</button><button data-close-view>Filter queue</button></div></section>
            </div>`
        },
        schedule: {
          index:'03 / TODAY / SCHEDULE', title:'Shift plan & field calendar',
          body:`
            <div class="tech-dynamic-toolbar"><span>08:00 — 17:00 · CENTRAL ZONE · 09H00 SHIFT</span><button data-close-view>BACK TO OVERVIEW</button></div>
            <div class="tech-view-kpis"><article><small>SHIFT</small><strong>09h</strong><span>08:00 — 17:00</span></article><article><small>BOOKED</small><strong>07h</strong><span>78% utilization</span></article><article><small>TRAVEL</small><strong>42m</strong><span>Estimated today</span></article><article><small>OPEN SLOT</small><strong>01</strong><span>16:15 available</span></article></div>
            <div class="tech-calendar">
              <div class="tech-calendar-head"><span>TIME</span><span>FIELD PLAN</span><span>STATUS</span></div>
              <div><time>08:00</time><section><b>Shift started</b><small>Availability enabled · Central Zone</small></section><strong>COMPLETE</strong></div>
              <div class="active"><time>10:30</time><section><b>SR-2026-1001 · Turbine inspection</b><small>Houston Energy Complex A · Emergency · 2.8 km</small></section><strong>IN PROGRESS</strong></div>
              <div><time>14:00</time><section><b>SR-2026-1003 · Hydraulic diagnostics</b><small>Houston Energy Complex B · High priority · 6.4 km</small></section><strong>UPCOMING</strong></div>
              <div><time>16:15</time><section><b>Service report review</b><small>Completion evidence + customer sign-off</small></section><strong>PLANNED</strong></div>
            </div>
            <div class="tech-section-title"><span>WEEKLY UTILIZATION</span><small>Target ≥ 80%</small></div>
            <div class="tech-week-schedule"><span><i style="height:72%"></i><b>MON</b></span><span><i style="height:84%"></i><b>TUE</b></span><span><i style="height:91%"></i><b>WED</b></span><span><i style="height:78%"></i><b>THU</b></span><span><i style="height:88%"></i><b>FRI</b></span></div>`
        },
        skills: {
          index:'04 / SKILLS & CERTIFICATIONS', title:'Technician capability profile',
          body:`
            <div class="tech-dynamic-toolbar"><span>PROFILE VERIFIED · LAST REVIEW 06 OCT 2026</span><button data-close-view>BACK TO OVERVIEW</button></div>
            <div class="tech-view-kpis"><article><small>SKILLS</small><strong>04</strong><span>Verified capabilities</span></article><article><small>CERTIFICATIONS</small><strong>03</strong><span>02 valid · 01 expired</span></article><article><small>MATCH RATE</small><strong>92%</strong><span>Dispatch compatibility</span></article><article><small>LEVEL</small><strong>L4</strong><span>Senior technician</span></article></div>
            <div class="tech-capability-grid"><article><div><b>Electrical</b><span>EXPERT</span></div><i><b style="width:92%"></b></i><small>92 / 100 · 18 verified jobs</small></article><article><div><b>Mechanical</b><span>EXPERT</span></div><i><b style="width:88%"></b></i><small>88 / 100 · 21 verified jobs</small></article><article><div><b>PLC</b><span>INTERMEDIATE</span></div><i><b style="width:72%"></b></i><small>72 / 100 · 12 verified jobs</small></article><article><div><b>Hydraulics</b><span>INTERMEDIATE</span></div><i><b style="width:68%"></b></i><small>68 / 100 · 10 verified jobs</small></article></div>
            <div class="tech-view-columns"><section class="tech-mini-panel"><h4>Certification register</h4><div class="tech-cert-list expanded"><span>✓ Electrical Safety <small>Valid until 12 Dec 2026</small></span><span>✓ PLC Programming <small>Valid until 03 Jan 2027</small></span><span>! Forklift Operation <small>Expired · renewal required</small></span></div></section><section class="tech-mini-panel"><h4>Training progress</h4><div class="tech-training"><div><span>Advanced diagnostics</span><strong>78%</strong></div><i><b style="width:78%"></b></i><div><span>Digital evidence standards</span><strong>64%</strong></div><i><b style="width:64%"></b></i></div></section></div>`
        },
        notifications: {
          index:'05 / NOTIFICATIONS', title:'Operational inbox & alerts',
          body:`
            <div class="tech-dynamic-toolbar"><span><b id="dynamic-unread-count">${unread}</b> UNREAD · 07 TOTAL</span><button data-mark-read>MARK ALL READ</button></div>
            <div class="tech-view-kpis"><article><small>UNREAD</small><strong id="dynamic-unread-kpi">${unread}</strong><span>Needs attention</span></article><article><small>URGENT</small><strong>01</strong><span>Emergency assignment</span></article><article><small>INFO</small><strong>04</strong><span>Operational updates</span></article><article><small>SYSTEM</small><strong>02</strong><span>Platform notices</span></article></div>
            <div class="tech-inbox detailed">
              <button class="tech-inbox-row unread"><i>!</i><div><b>Emergency assignment</b><span>SR-2026-1001 assigned at Houston Energy Complex A · respond before SLA threshold.</span></div><small>2 min ago</small></button>
              <button class="tech-inbox-row unread"><i>↗</i><div><b>Parts reservation confirmed</b><span>3 parts reserved for SR-2026-1001 and held against the service request.</span></div><small>1 hr ago</small></button>
              <button class="tech-inbox-row"><i>✓</i><div><b>Performance report ready</b><span>Your weekly field performance report is available for review.</span></div><small>3 hr ago</small></button>
              <button class="tech-inbox-row"><i>●</i><div><b>Schedule updated</b><span>SR-2026-1003 moved to 14:00 due to route optimization.</span></div><small>Yesterday</small></button>
              <button class="tech-inbox-row"><i>✓</i><div><b>Certification reminder</b><span>Forklift Operation certification requires renewal.</span></div><small>Yesterday</small></button>
            </div>`
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

    // Smooth reveal + scroll-driven dashboard motion.
    const revealTargets = $('.tech-panel, .tech-metrics, .tech-hero-row, .tech-analytics-grid, .tech-timeline-panel, .tech-dynamic-view');
    revealTargets.forEach((el, i) => {
      el.classList.add('tech-reveal');
      el.style.transitionDelay = Math.min(i * 45, 260) + 'ms';
    });
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {threshold:.12, rootMargin:'0px 0px -50px 0px'});
      revealTargets.forEach(el => revealObserver.observe(el));
    } else {
      revealTargets.forEach(el => el.classList.add('is-visible'));
    }

    document.addEventListener('click', e => {
      const link = e.target.closest('[data-tech-scroll]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute('data-tech-scroll'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
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