(function() {
  const screens = [
    { id: 1, short: 'Job Dashboard', file: '01-job-dashboard.html' },
    { id: 2, short: 'Registration CTA', file: '02-registration-cta.html' },
    { id: 3, short: 'Onboarding', file: '03-onboarding-personal.html' },
  ];

  const currentFile = window.location.pathname.split('/').pop() || '';
  const currentIdx = screens.findIndex(s => currentFile.includes(s.file.replace('.html', '')));
  if (currentIdx === -1) return;

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

  if (window.location.hash.includes('figmacapture')) {
    const captureScript = document.createElement('script');
    captureScript.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    document.head.appendChild(captureScript);
    return;
  }

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
  style.textContent = `#mockup-toolbar-panel { transition: transform 0.3s ease; }`;
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
            <div class="w-6 h-6 bg-[#007F7E] rounded flex items-center justify-center text-xs font-bold text-white">MQ</div>
            <h1 class="text-base font-semibold text-white">CPV — Minimal Maya</h1>
          </div>
          <span class="text-gray-600">|</span>
          <span class="text-gray-400 text-sm">${String(screens[currentIdx].id).padStart(2, '0')} — ${screens[currentIdx].short}</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="figma-copy-btn" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium bg-gray-700/80 text-gray-300 cursor-pointer border border-gray-600 hover:bg-gray-600 hover:text-white" title="Copy to Figma (F)">
            ${figmaIcon} Copy Page <kbd class="ml-0.5 bg-gray-600 px-1 py-0.5 rounded text-[10px] text-gray-400 font-mono">F</kbd>
          </button>
          <span class="text-xs text-gray-500 ml-1">${currentIdx + 1} / ${screens.length}</span>
        </div>
      </div>
    </div>
    <div class="bg-gray-800/80 backdrop-blur px-4 py-2 border-b border-gray-700/50">
      <div class="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto">${btns}</div>
    </div>`;

  const hints = document.createElement('div');
  hints.className = 'fixed bottom-3 left-3 text-[11px] text-gray-600 bg-gray-800/90 px-3 py-2 rounded-lg flex items-center gap-3 border border-gray-700/50 z-[9999]';
  hints.innerHTML = `<span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">←</kbd><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">→</kbd> Navigate</span><span class="text-gray-700">|</span><span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">F</kbd> Figma</span><span class="text-gray-700">|</span><span><kbd class="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-mono text-[10px]">Esc</kbd> Toggle</span>`;

  document.body.style.paddingTop = '88px';
  document.body.insertBefore(toolbar, document.body.firstChild);
  document.body.appendChild(hints);

  let visible = true;
  function toggle() {
    visible = !visible;
    toolbar.style.transform = visible ? 'translateY(0)' : 'translateY(-100%)';
    document.body.style.paddingTop = visible ? '88px' : '0';
  }

  let capturing = false;
  document.getElementById('figma-copy-btn').addEventListener('click', function() {
    if (capturing) return;
    capturing = true;
    toolbar.style.display = 'none'; hints.style.display = 'none'; document.body.style.paddingTop = '0';
    const s = document.createElement('script'); s.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    s.onload = function() { setTimeout(function() { toolbar.style.display = ''; hints.style.display = ''; document.body.style.paddingTop = '88px'; capturing = false; }, 4000); };
    document.head.appendChild(s);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Escape') { toggle(); return; }
    if (e.key === 'f' || e.key === 'F') { document.getElementById('figma-copy-btn').click(); return; }
    if (e.key === 'ArrowRight' && currentIdx < screens.length - 1) { window.location.href = screens[currentIdx + 1].file; return; }
    if (e.key === 'ArrowLeft' && currentIdx > 0) { window.location.href = screens[currentIdx - 1].file; return; }
    const num = parseInt(e.key);
    if (num >= 1 && num <= screens.length) { window.location.href = screens[num - 1].file; }
  });
})();
