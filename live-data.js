(()=>{
  async function loadLiveStore(){
    try{
      const response=await fetch(`data/store.json?v=${Date.now()}`,{cache:'no-store'});
      if(!response.ok) throw new Error(`Store data ${response.status}`);
      const data=await response.json();

      if(typeof products!=='undefined'&&Array.isArray(data.products)){
        products.splice(0,products.length,...data.products.map(p=>({...p})));
      }
      if(typeof brands!=='undefined'&&Array.isArray(data.brands)){
        brands.splice(0,brands.length,...data.brands);
      }
      if(typeof categories!=='undefined'&&Array.isArray(data.categories)){
        categories.splice(0,categories.length,...data.categories.map(c=>({...c})));
      }

      const trendingIds=Array.isArray(data.trending)?data.trending.map(Number):[];
      if(typeof products!=='undefined'&&trendingIds.length){
        products.forEach(p=>p.featured=trendingIds.includes(Number(p.id)));
      }

      try{if(typeof renderBrandStrip==='function')renderBrandStrip()}catch(e){}
      try{if(typeof renderCats==='function')renderCats()}catch(e){}
      try{
        const w=document.getElementById('featuredGrid');
        if(w&&typeof card==='function'&&typeof bind==='function'){
          const featured=trendingIds.map(id=>products.find(p=>Number(p.id)===id)).filter(Boolean).slice(0,4);
          w.innerHTML=featured.map(p=>card(p,true)).join('');
          bind(w);
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
      if(contactP&&location){
        contactP.innerHTML=`Talk directly with ${businessName} — ${location} · <span id="phoneText">${phone}</span> · <span id="emailText">${email}</span>`;
      }

      document.documentElement.dataset.liveStore='loaded';
      window.dispatchEvent(new CustomEvent('yk:store-loaded',{detail:data}));
    }catch(error){
      console.warn('YK live store data unavailable; using built-in catalog.',error);
      document.documentElement.dataset.liveStore='fallback';
    }
  }

  loadLiveStore();
})();
