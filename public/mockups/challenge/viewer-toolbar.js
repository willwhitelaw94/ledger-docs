(function() {
  var screens = [
    { id: 1, short: 'Registration', file: '01-registration.html' },
    { id: 2, short: 'Onboarding Wizard', file: '02-onboarding-wizard.html' },
    { id: 3, short: 'Locations', file: '03-locations-step.html' },
    { id: 4, short: 'Documents', file: '04-documents-step.html' },
    { id: 5, short: 'Verification', file: '05-verification-dashboard.html' },
    { id: 6, short: 'Add Entity', file: '06-add-supplier-entity.html' }
  ];
  var cf = window.location.pathname.split('/').pop() || '';
  var ci = -1; for(var i=0;i<screens.length;i++){if(cf.indexOf(screens[i].file.replace('.html',''))!==-1){ci=i;break;}} if(ci===-1)return;
  if(window.location.hash.indexOf('figma')!==-1){var s=document.createElement('script');s.src='https://mcp.figma.com/mcp/html-to-design/capture.js';document.head.appendChild(s);return;}
  var btns=screens.map(function(s,i){var a=i===ci;var c=a?'px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap bg-[#007F7E] text-white shadow-[0_0_0_2px_rgba(67,192,190,0.5)]':'px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap bg-gray-700 hover:bg-gray-600 text-gray-300';var n=String(s.id).padStart(2,'0');return a?'<span class="'+c+'"><span class="'+(a?'text-white/60':'text-gray-500')+' mr-1">'+n+'</span>'+s.short+'</span>':'<a href="'+s.file+'" class="'+c+'" style="text-decoration:none"><span class="text-gray-500 mr-1">'+n+'</span>'+s.short+'</a>';}).join(' ');
  var tb=document.createElement('div');tb.id='mockup-toolbar-panel';tb.className='fixed top-0 left-0 right-0 z-[9999]';tb.style.cssText='transition:transform 0.3s ease;';
  tb.innerHTML='<div class="bg-gray-800/95 backdrop-blur border-b border-gray-700 px-4 py-3"><div class="max-w-7xl mx-auto flex items-center justify-between"><div class="flex items-center gap-4"><div class="flex items-center gap-2"><div class="w-6 h-6 bg-[#007F7E] rounded flex items-center justify-center text-xs font-bold text-white">TC</div><h1 class="text-base font-semibold text-white">SR1 Registration \u2014 Gamified Gina</h1></div><span class="text-gray-600">|</span><span class="text-gray-400 text-sm">'+String(screens[ci].id).padStart(2,'0')+' \u2014 '+screens[ci].short+'</span></div><span class="text-xs text-gray-500">'+(ci+1)+' / '+screens.length+'</span></div></div><div class="bg-gray-800/80 backdrop-blur px-4 py-2 border-b border-gray-700/50"><div class="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto">'+btns+'</div></div>';
  document.body.style.paddingTop='88px';document.body.insertBefore(tb,document.body.firstChild);
  var vis=true;document.addEventListener('keydown',function(e){if(e.target.matches('input,textarea,select'))return;if(e.key==='Escape'){vis=!vis;tb.style.transform=vis?'translateY(0)':'translateY(-100%)';document.body.style.paddingTop=vis?'88px':'0';return;}if(e.key==='ArrowRight'&&ci<screens.length-1){window.location.href=screens[ci+1].file;return;}if(e.key==='ArrowLeft'&&ci>0){window.location.href=screens[ci-1].file;return;}var n=parseInt(e.key);if(n>=1&&n<=screens.length){window.location.href=screens[n-1].file;}});
})();