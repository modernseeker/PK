(()=>{
  const cfg=window.YKSupabaseConfig;
  if(!cfg?.url||!cfg?.key)return;
  const headers={'apikey':cfg.key,'Authorization':`Bearer ${cfg.key}`};
  const api=(table,query='')=>fetch(`${cfg.url}/rest/v1/${table}?${query}`,{headers,cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error(`${table} ${r.status}`);return r.json()});
  const mapProduct=p=>({id:Number(p.id),brand:p.brand,name:p.name,model:p.model||'',spec:p.specification||'',cat:p.category,code:p.code||'',desc:p.description||'',img:p.image_url||'assets/product-breaker.svg',badge:p.badge||'',featured:false,price:p.price_text||'Price on request',stock:p.stock_status||'Check Stock',tags:p.tags||''});
  async function load(){
    try{
      const [dbProducts,dbCategories,dbBrands,dbTrending,settingsRows]=await Promise.all([
        api('products','select=*&active=eq.true&order=id.asc'),
        api('categories','select=*&active=eq.true&order=sort_order.asc'),
        api('brands','select=*&active=eq.true&order=sort_order.asc'),
        api('homepage_trending','select=slot,product_id&order=slot.asc'),
        api('store_settings','select=*&id=eq.1')
      ]);
      if(!Array.isArray(dbProducts)||!dbProducts.length)return;
      const trendIds=dbTrending.map(x=>Number(x.product_id));
      const nextProducts=dbProducts.map(mapProduct).map(p=>({...p,featured:trendIds.includes(p.id)}));
      if(typeof products!=='undefined'){products.splice(0,products.length,...nextProducts)}
      if(typeof categories!=='undefined'&&dbCategories.length){categories.splice(0,categories.length,...dbCategories.map(c=>({name:c.name,icon:c.icon||'•',desc:c.description||'',image:c.image||'assets/product-breaker.svg'})))}
      if(typeof brands!=='undefined'&&dbBrands.length){brands.splice(0,brands.length,...dbBrands.map(b=>b.name))}
      try{renderBrandStrip();renderCats();renderFilters();renderProducts();renderCart()}catch(e){}
      try{
        const w=document.getElementById('featuredGrid');
        if(w&&typeof card==='function'){
          const ordered=trendIds.map(id=>products.find(p=>p.id===id)).filter(Boolean);
          w.innerHTML=ordered.map(p=>card(p,true)).join('');
          if(typeof bind==='function')bind(w);
        }
      }catch(e){}
      const s=settingsRows?.[0];
      if(s){
        const phone=String(s.phone||'').replace(/\D/g,'');
        const wa=String(s.whatsapp||phone).replace(/\D/g,'');
        document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.href=`tel:+977${phone.replace(/^977/,'')}`);
        document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>a.href=`https://wa.me/${wa.startsWith('977')?wa:'977'+wa}`);
        const pt=document.getElementById('phoneText');if(pt)pt.textContent=s.phone||'';
        const et=document.getElementById('emailText');if(et)et.textContent=s.email||'';
      }
      document.documentElement.dataset.dataSource='supabase';
    }catch(e){console.warn('Supabase unavailable; keeping GitHub/local storefront data.',e)}
  }
  load();
})();
