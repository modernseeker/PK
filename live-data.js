(()=>{
  const cfg=window.YKSupabaseConfig||{};

  function headers(){return {'apikey':cfg.publishableKey,'Accept':'application/json'};}
  async function rest(path){
    if(!cfg.url||!cfg.publishableKey)throw new Error('Supabase configuration unavailable');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{headers:headers(),cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw new Error(body?.message||body?.hint||`Supabase ${res.status}`);
    return body;
  }

  const categoryFallbacks={'Wires & Cables':'assets/product-wire.svg','Protection':'assets/product-breaker.svg','Control & Panel':'assets/product-contactor.svg','Automation':'assets/product-automation.svg','Capacitors':'assets/product-capacitor.svg','Motors & Pumps':'assets/product-motor.svg','Bearings & Spares':'assets/product-bearing.svg','Lighting & Electronics':'assets/product-light.svg'};
  function mapProduct(p,trendingIds){const fallback=categoryFallbacks[p.category]||'assets/product-breaker.svg';return {
    id:Number(p.id),brand:p.brand||'',name:p.name||'',model:p.model||'',spec:p.specification||'',cat:p.category||'',
    code:p.code||'',desc:p.description||'',img:p.image_url||fallback,fallbackImg:fallback,realProductImage:!!p.image_url,badge:p.badge||'',
    featured:trendingIds.includes(Number(p.id)),price:p.price_text||'Price on request',stock:p.stock_status||'Check Stock',tags:p.tags||''
  };}

  async function fetchSupabaseStore(){
    const [productRows,brandRows,categoryRows,trendingRows,settingsRows]=await Promise.all([
      rest('products?select=*&active=eq.true&order=id.asc'),
      rest('brands?select=name&active=eq.true&order=sort_order.asc'),
      rest('categories?select=name,icon,description,image&active=eq.true&order=sort_order.asc'),
      rest('homepage_trending?select=slot,product_id&order=slot.asc'),
      rest('store_settings?select=*&id=eq.1&limit=1')
    ]);
    const trending=trendingRows.map(r=>Number(r.product_id));
    const s=settingsRows[0]||{};
    return {
      source:'supabase',
      settings:{businessName:s.business_name||'YK Electric & Electronic',location:s.location||'',phone:s.phone||'',whatsapp:s.whatsapp||'',email:s.email||''},
      brands:brandRows.map(r=>r.name),
      categories:categoryRows.map(r=>({name:r.name,icon:r.icon||'',desc:r.description||'',image:r.image||'assets/product-breaker.svg'})),
      trending,
      products:productRows.map(p=>mapProduct(p,trending))
    };
  }

  async function fetchJsonFallback(){
    const response=await fetch(`data/store.json?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Store data ${response.status}`);
    const data=await response.json();
    data.source='github-fallback';
    return data;
  }

  function applyStore(data){
    if(typeof products!=='undefined'&&Array.isArray(data.products))products.splice(0,products.length,...data.products.map(p=>({...p})));
    if(typeof brands!=='undefined'&&Array.isArray(data.brands))brands.splice(0,brands.length,...data.brands);
    if(typeof categories!=='undefined'&&Array.isArray(data.categories))categories.splice(0,categories.length,...data.categories.map(c=>({...c})));

    const trendingIds=Array.isArray(data.trending)?data.trending.map(Number):[];
    if(typeof products!=='undefined')products.forEach(p=>p.featured=trendingIds.includes(Number(p.id)));

    try{if(typeof renderBrandStrip==='function')renderBrandStrip()}catch(e){}
    try{if(typeof renderBrandFilter==='function')renderBrandFilter()}catch(e){}
    try{if(typeof renderCats==='function')renderCats()}catch(e){}
    try{
      const w=document.getElementById('featuredGrid');
      if(w&&typeof card==='function'&&typeof bind==='function'){
        const featured=trendingIds.map(id=>products.find(p=>Number(p.id)===id)).filter(Boolean).slice(0,4);
        w.innerHTML=featured.map(p=>card(p,true)).join('');bind(w);
      }else if(typeof renderFeatured==='function')renderFeatured();
    }catch(e){}
    try{if(typeof renderFilters==='function')renderFilters()}catch(e){}
    try{if(typeof renderProducts==='function')renderProducts()}catch(e){}

    const s=data.settings||{};
    const phone=String(s.phone||'').replace(/\s+/g,'');
    const whatsapp=String(s.whatsapp||phone||'').replace(/[^0-9]/g,'');
    const email=String(s.email||'').trim();
    const location=String(s.location||'').trim();
    const businessName=String(s.businessName||'YK Electric & Electronic').trim();
    document.querySelectorAll('#phoneText').forEach(el=>el.textContent=phone||el.textContent);
    document.querySelectorAll('#emailText').forEach(el=>el.textContent=email||el.textContent);
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>{if(phone)a.href=`tel:+977${phone.replace(/^977/,'')}`});
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{if(email)a.href=`mailto:${email}`});
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{if(whatsapp)a.href=`https://wa.me/${whatsapp.startsWith('977')?whatsapp:'977'+whatsapp}`});
    const contactP=document.querySelector('.contact-card p');
    if(contactP&&location)contactP.innerHTML=`Talk directly with ${businessName} — ${location} · <span id="phoneText">${phone}</span> · <span id="emailText">${email}</span>`;

    document.documentElement.dataset.liveStore=data.source||'loaded';
    window.dispatchEvent(new CustomEvent('yk:store-loaded',{detail:data}));
  }

  async function loadLiveStore(){
    try{applyStore(await fetchSupabaseStore());}
    catch(error){
      console.warn('Supabase storefront unavailable; trying GitHub fallback.',error);
      try{applyStore(await fetchJsonFallback());}
      catch(fallbackError){console.warn('YK live store unavailable; using built-in catalog.',fallbackError);document.documentElement.dataset.liveStore='built-in';}
    }
  }

  loadLiveStore();
})();
