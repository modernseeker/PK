(()=>{
  const client=()=>window.YKSupabase;

  function mapProduct(p,trending){
    return {
      id:Number(p.id),brand:p.brand,name:p.name,model:p.model||'',spec:p.specification||'',cat:p.category,
      code:p.code||'',desc:p.description||'',img:p.image_url||'assets/product-breaker.svg',badge:p.badge||'',
      featured:trending.includes(Number(p.id)),price:p.price_text||'Price on request',stock:p.stock_status||'Check Stock',
      tags:p.tags||''
    };
  }

  function mapCategory(c){return {name:c.name,icon:c.icon||'',desc:c.description||'',image:c.image||'assets/product-breaker.svg'};}

  function renderTrending(order){
    const grid=document.getElementById('featuredGrid');
    if(!grid||typeof card!=='function'||typeof bind!=='function')return;
    const list=order.map(id=>products.find(p=>Number(p.id)===Number(id))).filter(Boolean);
    grid.innerHTML=list.map(p=>card(p,true)).join('');
    grid.dataset.curated='1';
    bind(grid);
  }

  function applySettings(s){
    if(!s)return;
    const phone=String(s.phone||'').replace(/\D/g,'');
    const wa=String(s.whatsapp||phone).replace(/\D/g,'');
    const email=s.email||'';
    document.querySelectorAll('#phoneText').forEach(el=>el.textContent=s.phone||'');
    document.querySelectorAll('#emailText').forEach(el=>el.textContent=email);
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>{if(phone)a.href=`tel:+977${phone.replace(/^977/,'')}`});
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{if(email){a.href=`mailto:${email}`;a.textContent=email}});
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{if(wa)a.href=`https://wa.me/${wa.startsWith('977')?wa:'977'+wa}`});
  }

  async function load(){
    const sb=client();
    if(!sb)return;
    try{
      const [pRes,bRes,cRes,tRes,sRes]=await Promise.all([
        sb.from('products').select('*').eq('active',true).order('id'),
        sb.from('brands').select('*').eq('active',true).order('sort_order'),
        sb.from('categories').select('*').eq('active',true).order('sort_order'),
        sb.from('homepage_trending').select('*').order('slot'),
        sb.from('store_settings').select('*').eq('id',1).maybeSingle()
      ]);
      const error=pRes.error||bRes.error||cRes.error||tRes.error||sRes.error;
      if(error)throw error;
      const trendOrder=(tRes.data||[]).map(x=>Number(x.product_id));
      if(Array.isArray(products)){
        products.splice(0,products.length,...(pRes.data||[]).map(p=>mapProduct(p,trendOrder)));
      }
      if(Array.isArray(brands))brands.splice(0,brands.length,...(bRes.data||[]).map(b=>b.name));
      if(Array.isArray(categories))categories.splice(0,categories.length,...(cRes.data||[]).map(mapCategory));
      if(typeof renderBrandStrip==='function')renderBrandStrip();
      if(typeof renderCats==='function')renderCats();
      if(typeof renderFilters==='function')renderFilters();
      if(typeof renderProducts==='function')renderProducts();
      renderTrending(trendOrder);
      applySettings(sRes.data);
      document.documentElement.dataset.backend='supabase';
      window.dispatchEvent(new CustomEvent('yk-supabase-loaded'));
    }catch(err){
      console.warn('Supabase storefront load failed; keeping GitHub/static fallback.',err);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
