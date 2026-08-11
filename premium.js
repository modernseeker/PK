(()=>{
  const topInput=document.getElementById('topSearch');
  const topButton=document.getElementById('topSearchButton');
  function runTopSearch(){
    const q=(topInput?.value||'').trim();
    const catalog=document.getElementById('catalogSearch');
    if(catalog){catalog.value=q;catalog.dispatchEvent(new Event('input',{bubbles:true}));}
    document.getElementById('products')?.scrollIntoView({behavior:'smooth'});
  }
  topButton?.addEventListener('click',runTopSearch);
  topInput?.addEventListener('keydown',e=>{if(e.key==='Enter')runTopSearch()});
  document.getElementById('allCategoriesButton')?.addEventListener('click',()=>document.getElementById('categoryRail')?.scrollIntoView({behavior:'smooth'}));

  const fallbackMap={
    'heroMcb':'assets/product-breaker.svg',
    'heroContactor':'assets/product-contactor.svg',
    'heroCap':'assets/product-capacitor.svg',
    'heroWire':'assets/product-wire.svg',
    'heroMotor':'assets/product-motor.svg'
  };
  Object.entries(fallbackMap).forEach(([id,fallback])=>{
    const img=document.getElementById(id);
    if(img)img.addEventListener('error',()=>{if(img.dataset.fallbackDone)return;img.dataset.fallbackDone='1';img.src=fallback;});
  });

  const nav=document.getElementById('nav');
  const menu=document.getElementById('menuBtn');
  if(menu&&nav){
    menu.addEventListener('click',()=>nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
  }
})();
