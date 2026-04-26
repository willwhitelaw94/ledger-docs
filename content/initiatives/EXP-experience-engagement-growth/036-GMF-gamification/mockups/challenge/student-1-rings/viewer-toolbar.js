(function() {
  const screens = [
    { id: 1, short: 'Dashboard', file: '01-dashboard.html' },
    { id: 2, short: 'All Clear', file: '02-all-clear.html' },
    { id: 3, short: 'Challenges', file: '03-challenges.html' },
    { id: 4, short: 'Badges', file: '04-badges.html' },
    { id: 5, short: 'Practice', file: '05-practice.html' },
  ];
  const currentFile = window.location.pathname.split('/').pop() || '';
  const currentIdx = screens.findIndex(s => currentFile.includes(s.file.replace('.html', '')));
  if (currentIdx === -1) return;
  if (window.location.hash.includes('figmaselector') || window.location.hash.includes('figmacapture')) return;
  const btns = screens.map((s, i) => {
    const active = i === currentIdx;
    const cls = active
      ? 'px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap bg-[#007F7E] text-white shadow-[0_0_0_2px_rgba(67,192,190,0.5)]'
      : 'px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap bg-gray-700 hover:bg-gray-600 text-gray-300 cursor-pointer';
    return active
      ? '<span class="' + cls + '">' + String(s.id).padStart(2,'0') + ' ' + s.short + '</span>'
      : '<a href="' + s.file + '" class="' + cls + '" style="text-decoration:none;">' + String(s.id).padStart(2,'0') + ' ' + s.short + '</a>';
  }).join(' ');
  const toolbar = document.createElement('div');
  toolbar.id = 'mockup-toolbar-panel';
  toolbar.className = 'fixed top-0 left-0 right-0 z-[9999]';
  toolbar.innerHTML = '<div class="bg-gray-800/95 backdrop-blur border-b border-gray-700 px-4 py-3"><div class="max-w-7xl mx-auto flex items-center justify-between"><div class="flex items-center gap-4"><div class="flex items-center gap-2"><div class="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-xs font-bold text-white">R</div><h1 class="text-base font-semibold text-white">Ring Rachel</h1></div><span class="text-gray-600">|</span><span class="text-purple-400 text-sm italic">"Everything radiates from the rings"</span></div><span class="text-xs text-gray-500">' + (currentIdx+1) + ' / ' + screens.length + '</span></div></div><div class="bg-gray-800/80 backdrop-blur px-4 py-2 border-b border-gray-700/50"><div class="max-w-7xl mx-auto flex items-center gap-1.5">' + btns + '</div></div>';
  document.body.style.paddingTop = '88px';
  document.body.insertBefore(toolbar, document.body.firstChild);
  let visible = true;
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Escape') { visible = !visible; toolbar.style.transform = visible ? 'translateY(0)' : 'translateY(-100%)'; document.body.style.paddingTop = visible ? '88px' : '0'; return; }
    if (e.key === 'ArrowRight' && currentIdx < screens.length - 1) { window.location.href = screens[currentIdx + 1].file; }
    if (e.key === 'ArrowLeft' && currentIdx > 0) { window.location.href = screens[currentIdx - 1].file; }
    const num = parseInt(e.key);
    if (num >= 1 && num <= screens.length) { window.location.href = screens[num - 1].file; }
  });
})();