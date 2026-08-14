(()=>{
  const topInput=document.getElementById('topSearch');
  const topButton=document.getElementById('topSearchButton');

  function searchCatalog(query){
    try{
      selected='All';
      selectedBrand='All Brands';
      resetProductLimit();
      renderBrandStrip();
      renderBrandFilter();
      renderFilters();
    }catch(error){}
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
