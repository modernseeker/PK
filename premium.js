(()=>{
  const topInput=document.getElementById('topSearch');
  const topButton=document.getElementById('topSearchButton');

  async function loadHeroBanner(){
    const hero=document.querySelector('.hero');
    if(!hero)return;
    try{
      const files=['assets/hero-sharp-a.txt?v=1','assets/hero-sharp-b.txt?v=1'];
      const parts=await Promise.all(files.map(async file=>{
        const response=await fetch(file,{cache:'no-store'});
        if(!response.ok)throw new Error(`Hero asset failed: ${response.status}`);
        return (await response.text()).replace(/\s+/g,'');
      }));
      const data=parts.join('');
      let image=hero.querySelector('.hero-banner-img');
      if(!image){
        image=document.createElement('img');
        image.className='hero-banner-img';
        image.alt='Trusted Products. Powering Nepal. Complete electrical solution from YK Electric.';
        image.decoding='async';
        image.fetchPriority='high';
        hero.prepend(image);
      }
      image.src=`data:image/webp;base64,${data}`;
      hero.style.backgroundImage='none';
      hero.dataset.heroLoaded='sharp';
    }catch(error){
      console.error('YK sharp hero banner failed to load',error);
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
