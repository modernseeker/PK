(()=>{
  const topInput=document.getElementById('topSearch');
  const topButton=document.getElementById('topSearchButton');
  const heroInput=document.getElementById('heroSearch');
  const heroButton=document.getElementById('heroSearchBtn');
  const heroCategory=document.getElementById('heroCategory');

  async function readHeroParts(files){
    const parts=await Promise.all(files.map(async file=>{
      const response=await fetch(file,{cache:'no-store'});
      if(!response.ok)throw new Error(`Hero asset failed: ${response.status}`);
      return (await response.text()).replace(/\s+/g,'');
    }));
    return parts.join('');
  }

  async function loadHeroBanner(){
    const hero=document.querySelector('.hero');
    if(!hero)return;
    try{
      const hqFiles=[1,2,3,4,5,6,7,8].map(i=>`assets/hero-hq-${i}.txt?v=1`);
      let data;
      try{
        data=await readHeroParts(hqFiles);
      }catch(hqError){
        console.warn('HQ hero unavailable; using standard hero.',hqError);
        const fallbackFiles=[1,2,3,4,5].map(i=>`assets/hero-chunk-${i}.txt?v=2`);
        data=await readHeroParts(fallbackFiles);
      }
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
      hero.dataset.heroLoaded='hq';
    }catch(error){
      console.error('YK hero banner failed to load',error);
    }
  }

  function searchCatalog(query){
    const catalog=document.getElementById('catalogSearch');
    if(catalog){
      catalog.value=query;
      catalog.dispatchEvent(new Event('input',{bubbles:true}));
    }
    document.getElementById('products')?.scrollIntoView({behavior:'smooth'});
  }

  function runTopSearch(){
    searchCatalog((topInput?.value||'').trim());
  }

  function runHeroSearch(){
    const query=(heroInput?.value||'').trim();
    const category=(heroCategory?.value||'').trim();
    searchCatalog([query,category].filter(Boolean).join(' '));
  }

  topButton?.addEventListener('click',runTopSearch);
  topInput?.addEventListener('keydown',e=>{if(e.key==='Enter')runTopSearch()});
  heroButton?.addEventListener('click',runHeroSearch);
  heroInput?.addEventListener('keydown',e=>{if(e.key==='Enter')runHeroSearch()});
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
        price.innerHTML=card.classList.contains('compact')
          ? '<strong>Rs. Price on request</strong>'
          : '<span>Price</span><strong>On request</strong>';
        const actions=body.querySelector('.product-actions');
        body.insertBefore(price,actions||null);
      }
    });
  }

  function renderReferenceTrendingOnce(){
    const grid=document.getElementById('featuredGrid');
    if(!grid||grid.dataset.curated==='1')return;
    if(typeof products==='undefined'||typeof card!=='function'||typeof bind!=='function')return;
    const desired=[
      {id:4,badge:'Top Pick'},
      {id:8,badge:'Best Seller'},
      {id:16,badge:'Popular'},
      {id:1,badge:'Popular'}
    ];
    const selectedProducts=desired.map(({id,badge})=>{
      const p=products.find(item=>item.id===id);
      return p?{...p,badge}:null;
    }).filter(Boolean);
    if(selectedProducts.length!==desired.length)return;
    grid.innerHTML=selectedProducts.map(p=>card(p,true)).join('');
    grid.dataset.curated='1';
    bind(grid);
  }

  function enhanceDetail(){
    const wa=document.getElementById('detailWhatsApp');
    if(wa&&wa.textContent.trim()!=='Get Price on WhatsApp')wa.textContent='Get Price on WhatsApp';
  }

  loadHeroBanner();
  renderReferenceTrendingOnce();
  enhanceCards();
  enhanceDetail();

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      enhanceCards();
      enhanceDetail();
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
