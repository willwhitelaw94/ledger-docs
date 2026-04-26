// Shared Mockup Viewer Toolbar — single toolbar for all mockup pages
// Uses Tailwind classes (already loaded on each page)
//
(function() {
  const screens = [
    { id: 1, short: 'Calls Inbox', file: '01-calls-inbox.html' },
    { id: 2, short: 'Call Review', file: '02-call-review.html' },
    { id: 3, short: 'Empty State', file: '03-empty-state.html' },
    { id: 4, short: 'Batch Review', file: '04-batch-review.html' },
    { id: 5, short: 'Escalate', file: '05-escalate.html' },
    { id: 6, short: 'Table View', file: '06-calls-table-view.html' },
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
      exitBtn.onclick = function() {
        window.location.href = window.location.pathname;
      };
      document.body.appendChild(exitBtn);

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          window.location.href = window.location.pathname;
        }
      });
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
  style.textContent = `
    #mockup-toolbar-panel { transition: transform 0.3s ease; }
    #figma-copy-all-overlay { transition: opacity 0.3s ease; }
  `;
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
            <h1 class="text-base font-semibold text-white">Calls Uplift (CUL)</h1>
          </div>
          <span class="text-gray-600">|</span>
          <span class="text-gray-400 text-sm">${String(screens[currentIdx].id).padStart(2, '0')} — ${screens[currentIdx].short}</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="figma-copy-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Copy this page to Figma (F)">
            ${figmaIcon}
            Copy Page
            <kbd class="ml-0.5 bg-gray-600 px-1 py-0.5 rounded text-[10px] text-gray-400 font-mono">F</kbd>
          </button>
          <button id="figma-copy-all-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Copy all pages to Figma sequentially">
            ${figmaIcon}
            Copy All
          </button>
          <button id="figma-select-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Open Figma element selector (S)">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
            Select
            <kbd class="ml-0.5 bg-gray-600 px-1 py-0.5 rounded text-[10px] text-gray-400 font-mono">S</kbd>
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
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">1</kbd>–<kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">6</kbd> Jump</span>
    <span class="text-gray-700">|</span>
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">F</kbd> Figma</span>
    <span class="text-gray-700">|</span>
    <span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">Esc</kbd> Toggle</span>
  `;

  document.body.style.paddingTop = '88px'; document.documentElement.style.setProperty('--toolbar-h', '88px');
  document.body.insertBefore(toolbar, document.body.firstChild);
  document.body.appendChild(hints);

  let visible = true;
  function toggle() {
    visible = !visible;
    toolbar.style.transform = visible ? 'translateY(0)' : 'translateY(-100%)';
    document.body.style.paddingTop = visible ? '88px' : '0'; document.documentElement.style.setProperty('--toolbar-h', visible ? '88px' : '0px');
  }

  const figmaBtn = document.getElementById('figma-copy-btn');
  const figmaAllBtn = document.getElementById('figma-copy-all-btn');
  const figmaSelectBtn = document.getElementById('figma-select-btn');
  let capturing = false;

  function runCapture(onComplete) {
    toolbar.style.display = 'none';
    hints.style.display = 'none';
    document.body.style.paddingTop = '0'; document.documentElement.style.setProperty('--toolbar-h', '0px');
    const overlay = document.getElementById('figma-copy-all-overlay');
    if (overlay) overlay.style.opacity = '0';
    const hash = '#figmacapture&figmadelay=2000';
    if (!window.location.hash.includes('figmacapture')) {
      history.replaceState(null, '', window.location.pathname + hash);
    }
    const script = document.createElement('script');
    script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    script.onload = function() {
      setTimeout(function() {
        toolbar.style.display = '';
        hints.style.display = '';
        document.body.style.paddingTop = visible ? '88px' : '0'; document.documentElement.style.setProperty('--toolbar-h', visible ? '88px' : '0px');
        history.replaceState(null, '', window.location.pathname);
        const figmaBar = document.querySelector('[data-figma-capture-bar]');
        if (figmaBar) figmaBar.remove();
        if (overlay) overlay.style.opacity = '1';
        if (onComplete) onComplete();
      }, 4000);
    };
    script.onerror = function() {
      toolbar.style.display = '';
      hints.style.display = '';
      document.body.style.paddingTop = visible ? '88px' : '0'; document.documentElement.style.setProperty('--toolbar-h', visible ? '88px' : '0px');
      if (overlay) overlay.style.opacity = '1';
      if (onComplete) onComplete();
    };
    document.head.appendChild(script);
  }

  function copyToFigma() {
    if (capturing) return;
    capturing = true;
    const origText = figmaBtn.innerHTML;
    figmaBtn.innerHTML = `<svg class="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg> Capturing...`;
    figmaBtn.style.opacity = '0.7';
    runCapture(function() {
      figmaBtn.innerHTML = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!`;
      figmaBtn.style.opacity = '1';
      setTimeout(function() { figmaBtn.innerHTML = origText; capturing = false; }, 2000);
    });
  }

  function openSelector() {
    window.location.hash = 'figmaselector=*';
    window.location.reload();
  }

  figmaBtn.addEventListener('click', copyToFigma);
  figmaAllBtn.addEventListener('click', function() {});
  figmaSelectBtn.addEventListener('click', openSelector);

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Escape') { toggle(); return; }
    if (e.key === 'f' || e.key === 'F') { copyToFigma(); return; }
    if (e.key === 's' || e.key === 'S') { openSelector(); return; }
    if (e.key === 'ArrowRight' && currentIdx < screens.length - 1) { window.location.href = screens[currentIdx + 1].file; return; }
    if (e.key === 'ArrowLeft' && currentIdx > 0) { window.location.href = screens[currentIdx - 1].file; return; }
    const num = parseInt(e.key);
    if (num >= 1 && num <= screens.length) { window.location.href = screens[num - 1].file; return; }
  });
})();
