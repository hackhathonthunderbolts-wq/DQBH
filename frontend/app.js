// ====================================================================
// DQBH INDUSTRIAL PLATFORM - CLIENT APPLICATION & GSAP ORCHESTRATION
// ====================================================================

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scroll & Chapter Elements
const progressBar = document.querySelector('#progress-bar');
const chapterLabel = document.querySelector('#chapter-scroll-label');
const chapterFill = document.querySelector('#chapter-scroll-fill');
const chapterValue = document.querySelector('#chapter-scroll-value');
const menuButton = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('#primary-nav');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const chapters = [...document.querySelectorAll('#main > section')];
let activeChapterIndex = -1;
let scrollFrameRequested = false;

// Format Chapter Title
function chapterTitle(chapter, index) {
  const label = chapter.querySelector('.section-label > span:last-child')?.textContent.trim()
    || (chapter.classList.contains('hero') ? 'PLATFORM OVERVIEW'
      : chapter.querySelector('.closing-index') ? 'DEPLOYMENT'
        : chapter.classList.contains('site-footer') ? 'CREDITS' : 'CHAPTER');
  return `${String(index + 1).padStart(2, '0')} / ${label}`;
}

// Page Progress Update
function updatePageProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  document.body.classList.toggle('has-scroll', window.scrollY > 12);
}

// Current Chapter Detection
function updateCurrentChapter() {
  if (!chapters.length) return;
  const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
  const meterLine = headerHeight + (document.querySelector('.chapter-scroll')?.offsetHeight || 26);
  const chapterLine = window.innerHeight * 0.5;
  let index = -1;
  chapters.forEach((chapter, chapterIndex) => {
    const bounds = chapter.getBoundingClientRect();
    const startLine = chapterIndex === 0 ? meterLine : chapterLine;
    if (bounds.top <= startLine && bounds.bottom > chapterLine) index = chapterIndex;
  });
  if (index < 0) {
    index = chapters.findIndex((chapter) => chapter.getBoundingClientRect().bottom > chapterLine);
    if (index < 0) index = chapters.length - 1;
  }

  const chapter = chapters[index];
  const bounds = chapter.getBoundingClientRect();
  const startLine = index === 0 ? meterLine : chapterLine;
  let localProgress;
  if (index === chapters.length - 1) {
    const startScroll = window.scrollY + bounds.top - startLine;
    const remainingScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight - startScroll);
    localProgress = (window.scrollY - startScroll) / remainingScroll;
  } else {
    const denominator = bounds.height + startLine - chapterLine;
    localProgress = (startLine - bounds.top) / Math.max(1, denominator);
  }
  localProgress = Math.min(1, Math.max(0, localProgress));
  if (activeChapterIndex !== index && chapterLabel) chapterLabel.textContent = chapterTitle(chapter, index);
  activeChapterIndex = index;

  if (chapterFill) gsap.set(chapterFill, { scaleX: localProgress });
  if (chapterValue) chapterValue.textContent = `${Math.round(localProgress * 100).toString().padStart(2, '0')}%`;
  chapters.forEach((item, itemIndex) => item.classList.toggle('is-current-chapter', itemIndex === index));

  const matchingLink = chapter.id ? primaryNav?.querySelector(`a[href="#${chapter.id}"]`) : null;
  primaryNav?.querySelectorAll('a').forEach((link) => {
    link.classList.toggle('is-current', link === matchingLink);
  });
}

function scheduleScrollUpdate() {
  if (scrollFrameRequested) return;
  scrollFrameRequested = true;
  requestAnimationFrame(() => {
    scrollFrameRequested = false;
    updatePageProgress();
    updateCurrentChapter();
  });
}

function initializeChapterScroll() {
  const headerHeight = () => document.querySelector('.site-header')?.offsetHeight || 0;

  chapters.forEach((chapter, index) => {
    chapter.querySelectorAll('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((item) => item.classList.add('reveal'));
    });

    if (reducedMotionQuery.matches) return;

    const targets = [...chapter.querySelectorAll('.reveal')];
    if (!targets.length && !chapter.classList.contains('hero')) return;
    targets.forEach((target) => target.classList.add('scroll-animated'));

    const meterLine = () => headerHeight() + (document.querySelector('.chapter-scroll')?.offsetHeight || 26);
    const chapterLine = () => window.innerHeight * 0.5;
    const startLine = () => index === 0 ? meterLine() : chapterLine();
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: chapter,
        start: () => `top top+=${startLine()}`,
        end: () => index === chapters.length - 1
          ? ScrollTrigger.maxScroll(window) : `bottom top+=${chapterLine()}`,
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
    });
    const sectionProgress = { value: 0 };
    timeline.to(sectionProgress, { value: 1, duration: 1, ease: 'none' }, 0);

    if (chapter.classList.contains('hero')) {
      const heroCopy = chapter.querySelector('.hero-copy');
      const heroArt = chapter.querySelector('.hero-art');
      if (heroCopy) timeline.fromTo(heroCopy,
        { autoAlpha: 1, y: 0 },
        { autoAlpha: 0.18, y: -46, duration: 0.48, ease: 'none' },
        0.46,
      );
      if (heroArt) timeline.fromTo(heroArt,
        { autoAlpha: 1, y: 0, scale: 1 },
        { autoAlpha: 0.18, y: -62, scale: 0.96, duration: 0.48, ease: 'none' },
        0.46,
      );
      return;
    }

    const slot = 0.84 / targets.length;
    const itemDuration = Math.max(0.09, Math.min(0.2, slot * 0.9));
    targets.forEach((target, targetIndex) => {
      timeline.fromTo(target,
        { autoAlpha: 0, y: 54, scale: 0.965 },
        { autoAlpha: 1, y: 0, scale: 1, duration: itemDuration, ease: 'none' },
        0.06 + targetIndex * slot,
      );
    });
  });

  scheduleScrollUpdate();
  const refreshScrollPositions = () => requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    scheduleScrollUpdate();
  });
  window.addEventListener('load', refreshScrollPositions, { once: true });
  document.fonts?.ready?.then(refreshScrollPositions);
}

window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
window.addEventListener('resize', () => {
  scheduleScrollUpdate();
  ScrollTrigger.refresh();
});
window.addEventListener('pageshow', scheduleScrollUpdate);
initializeChapterScroll();

// Mobile Navigation
function closeMenu() {
  if (!menuButton || !primaryNav) return;
  menuButton.setAttribute('aria-expanded', 'false');
  primaryNav.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  primaryNav?.classList.toggle('is-open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

primaryNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

// ====================================================================
// INTERACTIVE PROTOTYPE & DQBH ENGINE CLIENT LOGIC
// ====================================================================


// ====================================================================
// DOMAIN AUTHENTICATION / ROLE PORTALS
// ====================================================================
const domainConfig = {
  operations: { code: 'DOMAIN / 01', kicker: 'OPERATIONS CONTROL', title: 'Operations sign in', description: 'Access dispatch queues, technician routing and exception recovery.' },
  technician: { code: 'DOMAIN / 02', kicker: 'FIELD TECHNICIAN', title: 'Technician sign in', description: 'Open assigned work, navigation, task logs and completion evidence.' },
  customer: { code: 'DOMAIN / 03', kicker: 'CUSTOMER / SITE', title: 'Customer sign in', description: 'Create service requests, view assets and monitor completion status.' },
  governance: { code: 'DOMAIN / 04', kicker: 'GOVERNANCE & ADMIN', title: 'Administrator sign in', description: 'Review audit history, API keys, integrations and platform controls.' },
};

function selectDomain(domain) {
  const config = domainConfig[domain];
  if (!config) return;

  // Field Technician is a dedicated presentation workspace.
  // Enter it directly instead of allowing the legacy platform overview
  // to become the technician landing page.
  if (domain === 'technician') {
    window.openTechnicianWorkspace?.();
    return;
  }

  const picker = document.getElementById('domain-panel');
  const login = document.getElementById('login-panel');
  picker?.setAttribute('hidden', '');
  login?.removeAttribute('hidden');
  document.getElementById('login-domain-code').textContent = config.code;
  document.getElementById('login-kicker').textContent = config.kicker;
  document.getElementById('login-title').textContent = config.title;
  document.getElementById('login-description').textContent = config.description;
  if (login) login.dataset.domain = domain;
  document.getElementById('login-email')?.focus();
}
window.showDomainPicker = function () {
  document.getElementById('login-panel')?.setAttribute('hidden', '');
  document.getElementById('domain-panel')?.removeAttribute('hidden');
};
window.submitDomainLogin = function (event) {
  event.preventDefault();
  const login = document.getElementById('login-panel');
  const domain = login?.dataset.domain || 'operations';
  const config = domainConfig[domain];

  document.body.classList.add('workspace-unlocked');
  document.getElementById('auth-gate')?.setAttribute('hidden', '');

  const note = document.querySelector('.header-note');
  if (note) note.innerHTML = `${config.kicker} <span>/</span> AUTHENTICATED`;

  if (domain === 'technician') {
    window.openTechnicianWorkspace?.();
    return;
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(() => initializeTechnicianMap(), 100);
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.domain-card').forEach((button) => button.addEventListener('click', () => selectDomain(button.dataset.domain)));
});

// ====================================================================
// OPENSTREETMAP TECHNICIAN AVAILABILITY PREVIEW
// ====================================================================
const technicianLocations = [
  { name: 'Sarah Jenkins', skill: 'Turbine / Vibration', status: 'AVAILABLE', lat: 29.7604, lng: -95.3698 },
  { name: 'Marcus Lee', skill: 'Robotics / Hydraulics', status: 'AVAILABLE', lat: 42.3314, lng: -83.0458 },
  { name: 'Priya Nair', skill: 'Optics / Vacuum', status: 'ON TASK', lat: 37.7749, lng: -122.4194 },
  { name: 'Daniel Ortiz', skill: 'Mechanical / Electrical', status: 'AVAILABLE', lat: 30.2672, lng: -97.7431 },
  { name: 'Elena Park', skill: 'Controls / PLC', status: 'EN ROUTE', lat: 29.9511, lng: -90.0715 },
];
let technicianMap;
let technicianMapInitialized = false;

function initializeTechnicianMap() {
  const element = document.getElementById('technician-map');
  if (!element || technicianMapInitialized) return;
  technicianMapInitialized = true;
  technicianMap = L.map(element, { zoomControl: true, scrollWheelZoom: false }).setView([35.2, -96.5], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(technicianMap);

  technicianLocations.forEach((tech) => {
    const marker = L.circleMarker([tech.lat, tech.lng], {
      radius: tech.status === 'AVAILABLE' ? 8 : 7,
      weight: 2,
      color: '#111111',
      fillColor: tech.status === 'AVAILABLE' ? '#ffffff' : '#a3a3a3',
      fillOpacity: 1,
    }).addTo(technicianMap);
    marker.bindPopup(`<strong>${tech.name}</strong><br>${tech.skill}<br><b>${tech.status}</b>`);
  });
  setTimeout(() => technicianMap.invalidateSize(), 200);
}
window.initializeTechnicianMap = initializeTechnicianMap;

const API_BASE = 'http://localhost:5000/api/v1';

// Local State Store for Instant Responsive UI
const clientState = {
  requests: [
    {
      id: 'req-srv-1001',
      ticketNumber: 'SR-2026-1001',
      site: 'Houston Energy Complex A',
      machine: '9HA.02 Heavy-Duty Gas Turbine',
      priority: 'EMERGENCY',
      state: 'ASSIGNED',
      technician: 'Sarah Jenkins',
      skills: ['TURBINE_LVL3', 'VIBRATION_ANALYSIS'],
      slaDue: '1h 45m remaining',
      slaBreached: false
    },
    {
      id: 'req-srv-1002',
      ticketNumber: 'SR-2026-1002',
      site: 'Detroit Automation Plant 4',
      machine: 'M-2000iA Heavy Payload Robot',
      priority: 'HIGH',
      state: 'VALIDATED',
      technician: 'Unassigned',
      skills: ['ROBOTICS_ADV', 'HYDRAULICS_EXPERT'],
      slaDue: '3h 10m remaining',
      slaBreached: false
    },
    {
      id: 'req-srv-1003',
      ticketNumber: 'SR-2026-1003',
      site: 'Silicon Valley Fab Beta',
      machine: 'High-NA EUV Scanner Subsystem',
      priority: 'MEDIUM',
      state: 'VERIFICATION_PENDING',
      technician: 'Dr. Priya Nair',
      skills: ['EUV_VACUUM', 'OPTICS_CALIBRATION'],
      slaDue: 'Verified On-Time',
      slaBreached: false
    }
  ],
  apiKeys: [
    {
      id: 'apk-001',
      name: 'IoT Edge Ingestion Gateway - Houston',
      keyPrefix: 'dqbh_live_9988',
      role: 'OPERATIONS_MANAGER',
      scopes: ['iot:telemetry:write', 'requests:read', 'requests:write'],
      rateLimit: 300,
      isActive: true
    },
    {
      id: 'apk-002',
      name: 'SAP / ERP Integration Service',
      keyPrefix: 'dqbh_live_4455',
      role: 'SYSTEM_ADMIN',
      scopes: ['requests:read', 'requests:write', 'technicians:read', 'dispatch:admin'],
      rateLimit: 600,
      isActive: true
    }
  ],
  auditLog: [
    {
      id: 'block-104',
      action: 'WORK_PROOF_SEALED',
      entity: 'SR-2026-1003',
      actor: 'Dr. Priya Nair',
      hash: '0x8f2d4e1a9c3b77e201f984a6c23e84b71948d3e2a5619e0c7a8b4f123c45d6e7',
      time: '10 mins ago'
    },
    {
      id: 'block-103',
      action: 'TECHNICIAN_AUTO_DISPATCHED',
      entity: 'SR-2026-1001',
      actor: 'ROUTING_ENGINE',
      hash: '0x3a7e91c4f2b805d1e6793a4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d',
      time: '28 mins ago'
    }
  ]
};

// Tab Switching
window.switchConsoleTab = function(tabName) {
  document.querySelectorAll('.mock-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.mock-view-panel').forEach(p => p.classList.remove('active'));

  const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
  const activePanel = document.getElementById(`panel-${tabName}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) activePanel.classList.add('active');
};

// Render Request Queue Table
function renderQueueTable() {
  const tbody = document.getElementById('queue-tbody');
  if (!tbody) return;

  tbody.innerHTML = clientState.requests.map(req => {
    let pillClass = 'pill-blue';
    if (req.priority === 'EMERGENCY') pillClass = 'pill-red';
    else if (req.priority === 'HIGH') pillClass = 'pill-amber';

    let stateClass = 'pill-blue';
    if (req.state === 'COMPLETED') stateClass = 'pill-emerald';
    else if (req.state === 'VERIFICATION_PENDING') stateClass = 'pill-amber';

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 600;">${req.ticketNumber}</td>
        <td>
          <div style="font-weight: 600;">${req.machine}</div>
          <div style="font-size: 10px; color: #878c9b;">${req.site}</div>
        </td>
        <td><span class="status-pill ${pillClass}">${req.priority}</span></td>
        <td><span class="status-pill ${stateClass}">${req.state}</span></td>
        <td>
          <div style="font-weight: 500;">${req.technician}</div>
          <div style="font-size: 10px; color: #878c9b;">${req.skills.join(', ')}</div>
        </td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${req.slaDue}</td>
        <td>
          ${req.state === 'VALIDATED' 
            ? `<button class="action-btn-sm" onclick="autoDispatchTicket('${req.id}')">Auto-Dispatch</button>`
            : req.state === 'ASSIGNED'
              ? `<button class="action-btn-sm action-btn-warn" onclick="simulateDropout('${req.id}')">Sim Dropout</button>`
              : req.state === 'VERIFICATION_PENDING'
                ? `<button class="action-btn-sm" style="background: #059669;" onclick="verifyTicket('${req.id}')">Verify Seal</button>`
                : `<span style="color: #64748b; font-size: 11px;">Completed</span>`
          }
        </td>
      </tr>
    `;
  }).join('');
}

// Auto-Dispatch Simulation
window.autoDispatchTicket = function(reqId) {
  const req = clientState.requests.find(r => r.id === reqId);
  if (!req) return;

  // Simulate Haversine dynamic scoring
  req.technician = 'David Chen (Score 96.4/100)';
  req.state = 'ASSIGNED';
  renderQueueTable();
  showConsoleToast(`✅ Dispatched David Chen (Distance: 12.4km, Skill Match: 100%) to ${req.ticketNumber}`);

  clientState.auditLog.unshift({
    id: `block-${Date.now().toString().slice(-3)}`,
    action: 'TECHNICIAN_AUTO_DISPATCHED',
    entity: req.ticketNumber,
    actor: 'ROUTING_ENGINE',
    hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
    time: 'Just now'
  });
  renderAuditTrail();
};

// Simulate Dropout & Auto-Reroute
window.simulateDropout = function(reqId) {
  const req = clientState.requests.find(r => r.id === reqId);
  if (!req) return;

  const prevTech = req.technician;
  req.technician = 'Carlos Morales (Auto-Rerouted)';
  req.state = 'ASSIGNED';
  renderQueueTable();

  showConsoleToast(`⚠️ DROPOUT ALERT: ${prevTech} dropped out. Auto-rerouted to Carlos Morales!`);

  clientState.auditLog.unshift({
    id: `block-${Date.now().toString().slice(-3)}`,
    action: 'EXCEPTION_AUTO_REROUTED',
    entity: req.ticketNumber,
    actor: 'EXCEPTION_ENGINE',
    hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
    time: 'Just now'
  });
  renderAuditTrail();
};

// Manager Verification & Blockchain Seal
window.verifyTicket = function(reqId) {
  const req = clientState.requests.find(r => r.id === reqId);
  if (!req) return;

  req.state = 'COMPLETED';
  renderQueueTable();
  showConsoleToast(`🔒 ${req.ticketNumber} verified and cryptographically sealed on immutable ledger.`);

  clientState.auditLog.unshift({
    id: `block-${Date.now().toString().slice(-3)}`,
    action: 'BLOCKCHAIN_PROOF_SEALED',
    entity: req.ticketNumber,
    actor: 'Marcus Vance (Site Mgr)',
    hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
    time: 'Just now'
  });
  renderAuditTrail();
};

// Render Audit Trail
function renderAuditTrail() {
  const container = document.getElementById('audit-list');
  if (!container) return;

  container.innerHTML = clientState.auditLog.map(item => `
    <div style="background: #121316; border: 1px solid rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 4px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span class="status-pill pill-emerald" style="font-size: 9px;">${item.action}</span>
        <span style="font-family: var(--font-mono); font-size: 10px; color: #878c9b;">${item.time}</span>
      </div>
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Target: ${item.entity} | Actor: ${item.actor}</div>
      <div style="font-family: var(--font-mono); font-size: 10px; color: #60a5fa; word-break: break-all;">Hash: ${item.hash}</div>
    </div>
  `).join('');
}

// Render API Keys List
function renderApiKeys() {
  const tbody = document.getElementById('apikey-tbody');
  if (!tbody) return;

  tbody.innerHTML = clientState.apiKeys.map(key => `
    <tr>
      <td style="font-weight: 600;">${key.name}</td>
      <td style="font-family: var(--font-mono); color: #34d399;">${key.keyPrefix}••••••••</td>
      <td><span class="status-pill pill-blue">${key.role}</span></td>
      <td style="font-family: var(--font-mono); font-size: 10px; color: #9499a8;">${key.scopes.join(', ')}</td>
      <td style="font-family: var(--font-mono); font-size: 11px;">${key.rateLimit} RPM</td>
      <td><button class="action-btn-sm action-btn-warn" onclick="revokeApiKey('${key.id}')">Revoke</button></td>
    </tr>
  `).join('');
}

// API Key Generator
window.generateNewApiKey = function(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('key-name-input')?.value || 'External Webhook Gateway';
  const role = document.getElementById('key-role-select')?.value || 'SITE_SUPERVISOR';
  
  const scopes = [];
  if (document.getElementById('scope-iot')?.checked) scopes.push('iot:telemetry:write');
  if (document.getElementById('scope-req-read')?.checked) scopes.push('requests:read');
  if (document.getElementById('scope-req-write')?.checked) scopes.push('requests:write');
  if (document.getElementById('scope-dispatch')?.checked) scopes.push('dispatch:admin');

  const randomHex = Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
  const prefix = `dqbh_live_${randomHex.slice(0, 4)}`;
  const plaintext = `${prefix}_${randomHex.slice(4)}`;

  const newKey = {
    id: `apk-${Date.now()}`,
    name,
    keyPrefix: prefix,
    role,
    scopes,
    rateLimit: 120,
    isActive: true
  };

  clientState.apiKeys.unshift(newKey);
  renderApiKeys();

  const displayEl = document.getElementById('generated-key-display');
  const codeEl = document.getElementById('generated-key-code');
  if (displayEl && codeEl) {
    codeEl.textContent = plaintext;
    displayEl.style.display = 'flex';
  }

  showConsoleToast(`🔑 Generated new API Key: ${prefix}••••`);
};

window.copyGeneratedApiKey = function() {
  const codeEl = document.getElementById('generated-key-code');
  if (codeEl) {
    navigator.clipboard.writeText(codeEl.textContent);
    showConsoleToast('📋 API Key copied to clipboard!');
  }
};

window.revokeApiKey = function(id) {
  clientState.apiKeys = clientState.apiKeys.filter(k => k.id !== id);
  renderApiKeys();
  showConsoleToast('🚫 API Key revoked.');
};

// IoT Anomaly Injection
window.simulateIoTAnomaly = function() {
  const vib = (7.8 + Math.random() * 2).toFixed(1);
  const temp = (98 + Math.random() * 15).toFixed(1);

  const newReq = {
    id: `req-iot-${Date.now()}`,
    ticketNumber: `SR-IOT-${Math.floor(1000 + Math.random()*9000)}`,
    site: 'Houston Energy Complex A',
    machine: '9HA.02 Heavy-Duty Gas Turbine',
    priority: 'EMERGENCY',
    state: 'VALIDATED',
    technician: 'Sarah Jenkins (Auto-Dispatched)',
    skills: ['TURBINE_LVL3', 'VIBRATION_ANALYSIS'],
    slaDue: '1h 00m remaining',
    slaBreached: false
  };

  clientState.requests.unshift(newReq);
  renderQueueTable();

  showConsoleToast(`🚨 IoT ALERT: Turbine Vibration ${vib} mm/s & Temp ${temp}°C! Emergency Ticket Generated.`);
};

// Toast notification in mockup
function showConsoleToast(msg) {
  const toast = document.getElementById('console-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 4000);
}

// Modal open / close
window.openCreateModal = function() {
  document.getElementById('create-modal')?.classList.add('open');
};
window.closeCreateModal = function() {
  document.getElementById('create-modal')?.classList.remove('open');
};

window.submitNewRequest = function(e) {
  if (e) e.preventDefault();
  const machine = document.getElementById('req-machine-select')?.value || '9HA.02 Heavy-Duty Gas Turbine';
  const site = document.getElementById('req-site-select')?.value || 'Houston Energy Complex A';
  const priority = document.getElementById('req-priority-select')?.value || 'HIGH';
  const title = document.getElementById('req-title-input')?.value || 'Scheduled Overhaul Inspection';

  const newReq = {
    id: `req-usr-${Date.now()}`,
    ticketNumber: `SR-2026-${Math.floor(2000 + Math.random()*8000)}`,
    site,
    machine,
    priority,
    state: 'VALIDATED',
    technician: 'Unassigned',
    skills: ['MECHANICAL_FITTER', 'VIBRATION_ANALYSIS'],
    slaDue: priority === 'EMERGENCY' ? '1h 30m remaining' : '4h 00m remaining',
    slaBreached: false
  };

  clientState.requests.unshift(newReq);
  renderQueueTable();
  closeCreateModal();
  showConsoleToast(`✅ Created and validated new service ticket: ${newReq.ticketNumber}`);
};

// Initialize interactive widgets on load
document.addEventListener('DOMContentLoaded', () => {
  renderQueueTable();
  renderApiKeys();
  renderAuditTrail();
});
