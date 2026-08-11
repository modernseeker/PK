(()=>{
  const topInput=document.getElementById('topSearch');
  const topButton=document.getElementById('topSearchButton');

  async function loadHeroBanner(){
    const hero=document.querySelector('.hero');
    if(!hero)return;
    try{
      const parts=await Promise.all([1,2,3,4,5].map(async i=>{
        const response=await fetch(`assets/hero-chunk-${i}.txt?v=2`,{cache:'no-store'});
        if(!response.ok)throw new Error(`Hero chunk ${i} failed: ${response.status}`);
        return (await response.text()).replace(/\s+/g,'');
      }));
      const data=parts.join('');
      hero.style.backgroundImage=`url("data:image/webp;base64,${data}")`;
      hero.style.backgroundSize='cover';
      hero.style.backgroundRepeat='no-repeat';
      hero.style.backgroundPosition=window.matchMedia('(max-width:760px)').matches?'58% center':'center center';
      hero.dataset.heroLoaded='true';
    }catch(error){
      console.error('YK hero banner failed to reconstruct',error);
    }
  }

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
    });
  }

  function enhanceDetail(){
    const wa=document.getElementById('detailWhatsApp');
    if(wa&&wa.textContent.trim()!=='Get Price on WhatsApp')wa.textContent='Get Price on WhatsApp';
  }

  loadHeroBanner();
  enhanceCards();
  enhanceDetail();

  const observer=new MutationObserver(()=>{enhanceCards();enhanceDetail();});
  observer.observe(document.body,{childList:true,subtree:true});
})();
