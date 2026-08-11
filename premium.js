(()=>{
  const topInput=document.getElementById('topSearch');
  const topButton=document.getElementById('topSearchButton');

  function runTopSearch(){
    const q=(topInput?.value||'').trim();
    const catalog=document.getElementById('catalogSearch');
    if(catalog){
      catalog.value=q;
      catalog.dispatchEvent(new Event('input',{bubbles:true}));
    }
    document.getElementById('products')?.scrollIntoView({behavior:'smooth'});
  }

  topButton?.addEventListener('click',runTopSearch);
  topInput?.addEventListener('keydown',e=>{if(e.key==='Enter')runTopSearch()});
  document.getElementById('allCategoriesButton')?.addEventListener('click',()=>document.getElementById('categoryRail')?.scrollIntoView({behavior:'smooth'}));

  const fallbackMap={
    heroMcb:'assets/product-breaker.svg',
    heroContactor:'assets/product-contactor.svg',
    heroCap:'assets/product-capacitor.svg',
    heroWire:'assets/product-wire.svg',
    heroMotor:'assets/product-motor.svg'
  };
  Object.entries(fallbackMap).forEach(([id,fallback])=>{
    const img=document.getElementById(id);
    if(img)img.addEventListener('error',()=>{
      if(img.dataset.fallbackDone)return;
      img.dataset.fallbackDone='1';
      img.src=fallback;
    });
  });

  function enhanceCards(){
    document.querySelectorAll('.product-card').forEach(card=>{
      const body=card.querySelector('.product-body');
      if(body&&!body.querySelector('.premium-price')){
        const price=document.createElement('div');
        price.className='premium-price';
        price.innerHTML='<span>Price</span><strong>On request</strong>';
        const actions=body.querySelector('.product-actions');
        body.insertBefore(price,actions||null);
      }
      const add=card.querySelector('.add');
      if(add&&add.textContent.trim()==='Add to request') add.textContent='Add to request';
    });
  }

  enhanceCards();
  const observer=new MutationObserver(enhanceCards);
  ['featuredGrid','productGrid'].forEach(id=>{
    const node=document.getElementById(id);
    if(node)observer.observe(node,{childList:true,subtree:true});
  });
})();
