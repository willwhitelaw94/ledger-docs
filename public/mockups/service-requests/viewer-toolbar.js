// Shared Mockup Viewer Toolbar — single toolbar for all mockup pages
// Uses Tailwind classes (already loaded on each page)
//
(function() {
  const screens = [
    { id: 1, short: 'SR Index', file: '01-service-requests-index.html' },
    { id: 2, short: 'CC Create', file: '02-cab-charge-create.html' },
    { id: 3, short: 'CC Show', file: '03-cab-charge-show.html' },
    { id: 4, short: 'Meals Create', file: '05-meals-create.html' },
  ];

  const currentFile = window.location.pathname.split('/').pop() || '';
  const currentIdx = screens.findIndex(s => currentFile.includes(s.file.replace('.html', '')));
  if (currentIdx === -1) return;

  // ===== SELECTOR MODE =====
  if (window.location.hash.includes('figmaselector')) {
    const captureScript = document.createElement('script');
    captureScript.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    document.head.appendChild(captureScript);
    setTimeout(function() {
      const exitBtn = document.createElement('button');
      exitBtn.className = 'fixed bottom-4 right-4 z-[10001] px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-800 text-white border border-gray-600 shadow-lg hover:bg-gray-700 transition flex items-center gap-2';
      exitBtn.innerHTML = '<kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">Esc</kbd> Exit Selector';
      exitBtn.onclick = function() { window.location.href = window.location.pathname; };
      document.body.appendChild(exitBtn);
      document.addEventListener('keydown', function(e) { if (e.key === 'Escape') window.location.href = window.location.pathname; });
    }, 500);
    return;
  }

  // ===== NORMAL MODE =====
  const btns = screens.map((s, i) => {
    const active = i === currentIdx;
    const cls = active
      ? 'px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap bg-[#007F7E] text-white shadow-[0_0_0_2px_rgba(67,192,190,0.5)]'
      : 'px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap bg-gray-700 hover:bg-gray-600 text-gray-300 cursor-pointer';
    const numColor = active ? 'text-white/60' : 'text-gray-500';
    return active
      ? `<span class="${cls}"><span class="${numColor} mr-1">${String(s.id).padStart(2, '0')}</span>${s.short}</span>`
      : `<a href="${s.file}" class="${cls}" style="text-decoration:none;"><span class="${numColor} mr-1">${String(s.id).padStart(2, '0')}</span>${s.short}</a>`;
  }).join('\n        ');

  const style = document.createElement('style');
  style.textContent = `#mockup-toolbar-panel { transition: transform 0.3s ease; } #figma-copy-all-overlay { transition: opacity 0.3s ease; }`;
  document.head.appendChild(style);

  const figmaIcon = '<svg width="14" height="14" viewBox="0 0 38 57" fill="currentColor"><path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/><path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/><path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></svg>';

  const toolbar = document.createElement('div');
  toolbar.id = 'mockup-toolbar-panel';
  toolbar.className = 'fixed top-0 left-0 right-0 z-[9999]';
  toolbar.innerHTML = `
    <div class="bg-gray-800/95 backdrop-blur border-b border-gray-700 px-4 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[#007F7E] rounded flex items-center justify-center text-xs font-bold text-white">TC</div>
            <h1 class="text-base font-semibold text-white">Service Requests (SRQ)</h1>
          </div>
          <span class="text-gray-600">|</span>
          <span class="text-gray-400 text-sm">${String(screens[currentIdx].id).padStart(2, '0')} — ${screens[currentIdx].short}</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="figma-copy-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Copy this page to Figma (F)">
            ${figmaIcon} Copy Page <kbd class="ml-0.5 bg-gray-600 px-1 py-0.5 rounded text-[10px] text-gray-400 font-mono">F</kbd>
          </button>
          <button id="figma-copy-all-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Copy all pages to Figma sequentially">
            ${figmaIcon} Copy All
          </button>
          <button id="figma-select-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Open Figma element selector (S)">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
            Select <kbd class="ml-0.5 bg-gray-600 px-1 py-0.5 rounded text-[10px] text-gray-400 font-mono">S</kbd>
          </button>
          <span class="text-xs text-gray-500 ml-1">${currentIdx + 1} / ${screens.length}</span>
        </div>
      </div>
    </div>
    <div class="bg-gray-800/80 backdrop-blur px-4 py-2 border-b border-gray-700/50">
      <div class="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto">
        ${btns}
      </div>
    </div>
  `;

  const hints = document.createElement('div');
  hints.className = 'fixed bottom-3 left-3 text-[11px] text-gray-600 bg-gray-800/90 px-3 py-2 rounded-lg flex items-center gap-3 border border-gray-700/50 z-[9999]';
  hints.innerHTML = `
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">←</kbd> <kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">→</kbd> Navigate</span>
    <span class="text-gray-700">|</span>
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">1</kbd>–<kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">4</kbd> Jump</span>
    <span class="text-gray-700">|</span>
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">F</kbd> Figma</span>
    <span class="text-gray-700">|</span>
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">Esc</kbd> Toggle</span>
  `;

  document.body.style.paddingTop = '88px';
  document.documentElement.style.setProperty('--toolbar-h', '88px');
  document.body.insertBefore(toolbar, document.body.firstChild);
  document.body.appendChild(hints);

  let visible = true;
  function toggle() {
    visible = !visible;
    toolbar.style.transform = visible ? 'translateY(0)' : 'translateY(-100%)';
    document.body.style.paddingTop = visible ? '88px' : '0';
    document.documentElement.style.setProperty('--toolbar-h', visible ? '88px' : '0px');
  }

  const figmaBtn = document.getElementById('figma-copy-btn');
  const figmaAllBtn = document.getElementById('figma-copy-all-btn');
  const figmaSelectBtn = document.getElementById('figma-select-btn');
  let capturing = false;

  function runCapture(onComplete) {
    toolbar.style.display = 'none'; hints.style.display = 'none';
    document.body.style.paddingTop = '0'; document.documentElement.style.setProperty('--toolbar-h', '0px');
    const overlay = document.getElementById('figma-copy-all-overlay');
    if (overlay) overlay.style.opacity = '0';
    const hash = '#figmacapture&figmadelay=2000';
    if (!window.location.hash.includes('figmacapture')) history.replaceState(null, '', window.location.pathname + hash);
    const script = document.createElement('script');
    script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    script.onload = function() {
      setTimeout(function() {
        toolbar.style.display = ''; hints.style.display = '';
        document.body.style.paddingTop = visible ? '88px' : '0'; document.documentElement.style.setProperty('--toolbar-h', visible ? '88px' : '0px');
        history.replaceState(null, '', window.location.pathname);
        const figmaBar = document.querySelector('[data-figma-capture-bar]'); if (figmaBar) figmaBar.remove();
        if (overlay) overlay.style.opacity = '1';
        if (onComplete) onComplete();
      }, 4000);
    };
    script.onerror = function() {
      toolbar.style.display = ''; hints.style.display = '';
      document.body.style.paddingTop = visible ? '88px' : '0'; document.documentElement.style.setProperty('--toolbar-h', visible ? '88px' : '0px');
      if (overlay) overlay.style.opacity = '1'; if (onComplete) onComplete();
    };
    document.head.appendChild(script);
  }

  function copyToFigma() {
    if (capturing) return; capturing = true;
    const origText = figmaBtn.innerHTML;
    figmaBtn.innerHTML = '<svg class="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg> Capturing...';
    figmaBtn.style.opacity = '0.7';
    runCapture(function() {
      figmaBtn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!';
      figmaBtn.style.opacity = '1';
      setTimeout(function() { figmaBtn.innerHTML = origText; capturing = false; }, 2000);
    });
  }

  function openSelector() { window.location.hash = 'figmaselector=*'; window.location.reload(); }

  const COPY_ALL_KEY = 'figma-copy-all';
  function startCopyAll() {
    sessionStorage.setItem(COPY_ALL_KEY, JSON.stringify({ step: 'capture', pageIdx: 0 }));
    if (currentIdx === 0) runCopyAllStep(); else window.location.href = screens[0].file;
  }
  function showCopyAllOverlay(pageIdx) {
    let overlay = document.getElementById('figma-copy-all-overlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'figma-copy-all-overlay'; overlay.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm'; document.body.appendChild(overlay); }
    const screen = screens[pageIdx]; const isLast = pageIdx >= screens.length - 1;
    overlay.innerHTML = `<div class="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8 max-w-md w-full mx-4 text-center"><div class="w-12 h-12 bg-[#007F7E] rounded-full flex items-center justify-center mx-auto mb-4"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div><h3 class="text-white text-lg font-semibold mb-1">Page ${pageIdx + 1} of ${screens.length} captured</h3><p class="text-gray-400 text-sm mb-1">${String(screen.id).padStart(2, '0')} — ${screen.short}</p><p class="text-gray-500 text-xs mb-6">Paste into Figma now (Cmd+V), then continue.</p><div class="flex gap-3 justify-center"><button onclick="window.__copyAllCancel()" class="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition">Cancel</button>${isLast ? '<button onclick="window.__copyAllDone()" class="px-6 py-2 text-sm rounded-lg bg-[#007F7E] hover:bg-[#006665] text-white font-medium transition">Done</button>' : '<button onclick="window.__copyAllNext()" class="px-6 py-2 text-sm rounded-lg bg-[#007F7E] hover:bg-[#006665] text-white font-medium transition flex items-center gap-2">Next Page <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>'}</div><div class="mt-4 flex justify-center gap-1">${screens.map((_, i) => `<div class="w-2 h-2 rounded-full ${i < pageIdx ? 'bg-[#43C0BE]' : i === pageIdx ? 'bg-[#007F7E] ring-2 ring-[#43C0BE]/50' : 'bg-gray-600'}"></div>`).join('')}</div></div>`;
    overlay.style.display = 'flex';
  }
  function showCopyAllCapturing(pageIdx) {
    let overlay = document.getElementById('figma-copy-all-overlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'figma-copy-all-overlay'; overlay.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm'; document.body.appendChild(overlay); }
    const screen = screens[pageIdx];
    overlay.innerHTML = `<div class="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8 max-w-md w-full mx-4 text-center"><div class="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="animate-spin w-6 h-6 text-[#43C0BE]" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></div><h3 class="text-white text-lg font-semibold mb-1">Capturing page ${pageIdx + 1} of ${screens.length}</h3><p class="text-gray-400 text-sm mb-4">${String(screen.id).padStart(2, '0')} — ${screen.short}</p><div class="flex justify-center gap-1">${screens.map((_, i) => `<div class="w-2 h-2 rounded-full ${i < pageIdx ? 'bg-[#43C0BE]' : i === pageIdx ? 'bg-[#007F7E] animate-pulse' : 'bg-gray-600'}"></div>`).join('')}</div></div>`;
    overlay.style.display = 'flex';
  }
  function removeCopyAllOverlay() { const o = document.getElementById('figma-copy-all-overlay'); if (o) o.remove(); }
  window.__copyAllCancel = function() { sessionStorage.removeItem(COPY_ALL_KEY); removeCopyAllOverlay(); capturing = false; };
  window.__copyAllDone = function() { sessionStorage.removeItem(COPY_ALL_KEY); removeCopyAllOverlay(); capturing = false; };
  window.__copyAllNext = function() { const state = JSON.parse(sessionStorage.getItem(COPY_ALL_KEY)); const nextIdx = state.pageIdx + 1; sessionStorage.setItem(COPY_ALL_KEY, JSON.stringify({ step: 'capture', pageIdx: nextIdx })); window.location.href = screens[nextIdx].file; };
  function runCopyAllStep() {
    const raw = sessionStorage.getItem(COPY_ALL_KEY); if (!raw) return;
    const state = JSON.parse(raw); if (state.step !== 'capture') return;
    capturing = true; showCopyAllCapturing(state.pageIdx);
    runCapture(function() { sessionStorage.setItem(COPY_ALL_KEY, JSON.stringify({ step: 'paste', pageIdx: state.pageIdx })); showCopyAllOverlay(state.pageIdx); });
  }

  figmaBtn.addEventListener('click', copyToFigma);
  figmaAllBtn.addEventListener('click', startCopyAll);
  figmaSelectBtn.addEventListener('click', openSelector);

  const copyAllState = sessionStorage.getItem(COPY_ALL_KEY);
  if (copyAllState) { const state = JSON.parse(copyAllState); if (state.step === 'capture') setTimeout(runCopyAllStep, 500); else if (state.step === 'paste') showCopyAllOverlay(state.pageIdx); }

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (sessionStorage.getItem(COPY_ALL_KEY)) return;
    if (e.key === 'Escape') { toggle(); return; }
    if (e.key === 'f' || e.key === 'F') { copyToFigma(); return; }
    if (e.key === 's' || e.key === 'S') { openSelector(); return; }
    if (e.key === 'ArrowRight' && currentIdx < screens.length - 1) { window.location.href = screens[currentIdx + 1].file; return; }
    if (e.key === 'ArrowLeft' && currentIdx > 0) { window.location.href = screens[currentIdx - 1].file; return; }
    const num = parseInt(e.key);
    if (num >= 1 && num <= screens.length) { window.location.href = screens[num - 1].file; return; }
  });
})();
