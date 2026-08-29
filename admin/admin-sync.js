(()=>{
  const ADMIN_KEY='yk_admin_state_v1';
  const CLOUD_LOADED_KEY='yk_supabase_admin_loaded';
  const DIRTY_KEY='yk_admin_dirty_v1';
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);

  const authScript=document.createElement('script');
  authScript.src='admin-auth.js?v=5';authScript.async=false;document.head.appendChild(authScript);

  function status(message,type='info'){
    const el=$('#syncStatus');if(el){el.textContent=message;el.dataset.type=type;}
    const notice=$('.local-notice');if(notice)notice.innerHTML=`<b>${type==='ok'?'Supabase cloud connected':type==='error'?'Cloud sync needs attention':'Supabase cloud sync'}</b><span>${message}</span>`;
  }
  function token(){return window.YKAdminAuth?.getToken?.()||'';}
  function authHeaders(extra={}){
    const t=token();
    return {'apikey':cfg.publishableKey,'Authorization':`Bearer ${t}`,'Content-Type':'application/json','Accept':'application/json',...extra};
  }
  async function rest(path,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Sign in to YK Admin first.');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{...authHeaders(),...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw new Error(body?.message||body?.hint||`Supabase request failed (${res.status})`);
    return body;
  }

  function toAdminImage(src){const s=String(src||'');return s.startsWith('assets/')?`../${s}`:s;}
  function toCloudImage(src){const s=String(src||'').trim();return s.startsWith('../assets/')?s.slice(3):s;}
  function mapCloudProduct(p,trending){return {
    id:Number(p.id),brand:p.brand||'',name:p.name||'',model:p.model||'',spec:p.specification||'',cat:p.category||'',code:p.code||'',
    desc:p.description||'',img:toAdminImage(p.image_url||''),badge:p.badge||'',price:p.price_text||'Price on request',stock:p.stock_status||'Check Stock',
    tags:p.tags||'',featured:trending.includes(Number(p.id)),stockQuantity:Number(p.stock_quantity||0),reorderLevel:Number(p.reorder_level||0),
    costPrice:Number(p.cost_price||0),stockUnit:p.stock_unit||'pcs',trackInventory:p.track_inventory===true
  };}
  function mapDraftProduct(p){return {
    id:Number(p.id),brand:String(p.brand||''),name:String(p.name||''),model:String(p.model||''),specification:String(p.spec||''),category:String(p.cat||''),
    code:String(p.code||`YK-${p.id}`),description:String(p.desc||''),image_url:toCloudImage(p.img),badge:String(p.badge||''),price_text:String(p.price||'Price on request'),
    stock_status:String(p.stock||'Check Stock'),tags:String(p.tags||`${p.brand||''} ${p.name||''} ${p.model||''} ${p.spec||''}`).trim(),active:true,updated_at:new Date().toISOString()
  };}
  function readDraft(){try{const d=JSON.parse(localStorage.getItem(ADMIN_KEY)||'null');if(d?.products&&d?.brands)return d;}catch(e){}throw new Error('Admin draft is unavailable. Reload the page.');}

  async function fetchCloud(){
    const [productRows,brandRows,trendingRows,settingsRows]=await Promise.all([
      rest('products?select=*&order=id.asc'),
      rest('brands?select=name&active=eq.true&order=sort_order.asc'),
      rest('homepage_trending?select=slot,product_id&order=slot.asc'),
      rest('store_settings?select=*&id=eq.1&limit=1')
    ]);
    const trending=trendingRows.map(r=>Number(r.product_id));const s=settingsRows[0]||{};
    return {
      products:productRows.filter(p=>p.active!==false).map(p=>mapCloudProduct(p,trending)),
      brands:brandRows.map(r=>r.name),
      settings:{businessName:s.business_name||'YK Electric & Electronic',location:s.location||'',phone:s.phone||'',whatsapp:s.whatsapp||'',email:s.email||''}
    };
  }

  async function saveCloud(){
    const btns=[...document.querySelectorAll('#publishLiveBtn,#publishFromSettingsBtn')];
    btns.forEach(b=>{b.disabled=true;b.dataset.old=b.textContent;b.textContent='Saving…';});
    try{
      status('Saving the current admin draft to Supabase…');
      const draft=readDraft();
      const rows=draft.products.map(mapDraftProduct);
      if(rows.length)await rest('products?on_conflict=id',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});

      const current=await rest('products?select=id');
      const keep=new Set(rows.map(r=>Number(r.id)));
      await Promise.all(current.filter(r=>!keep.has(Number(r.id))).map(r=>rest(`products?id=eq.${encodeURIComponent(r.id)}`,{method:'DELETE',headers:{'Prefer':'return=minimal'}})));

      const brandNames=[...new Set([...(draft.brands||[]),...draft.products.map(p=>p.brand)].filter(Boolean))];
      if(brandNames.length){
        const brandRows=brandNames.map((name,i)=>({name,sort_order:i+1,active:true,updated_at:new Date().toISOString()}));
        await rest('brands?on_conflict=name',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(brandRows)});
        const cloudBrands=await rest('brands?select=name');
        await Promise.all(cloudBrands.filter(b=>!brandNames.includes(b.name)).map(b=>rest(`brands?name=eq.${encodeURIComponent(b.name)}`,{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({active:false,updated_at:new Date().toISOString()})})));
      }

      const s=draft.settings||{};
      await rest('store_settings?id=eq.1',{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({business_name:s.businessName||'YK Electric & Electronic',location:s.location||'',phone:s.phone||'',whatsapp:s.whatsapp||'',email:s.email||'',updated_at:new Date().toISOString()})});

      await rest('homepage_trending?slot=gte.1',{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      const trending=draft.products.filter(p=>p.featured).slice(0,4).map((p,i)=>({slot:i+1,product_id:Number(p.id),updated_at:new Date().toISOString()}));
      if(trending.length)await rest('homepage_trending',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify(trending)});

      localStorage.removeItem(DIRTY_KEY);
      status('Published to Supabase. Customer storefront data is updated immediately.','ok');
      document.dispatchEvent(new CustomEvent('yk-admin-draft-published'));
    }catch(e){console.error(e);status(e.message,'error');alert(`Cloud save failed: ${e.message}`);}
    finally{btns.forEach(b=>{b.disabled=false;b.textContent=b.dataset.old||'Save Cloud';});renderDraftStatus();}
  }

  async function loadCloudIntoAdmin(confirmFirst=true){
    if(!window.YKAdminAuth?.isAuthenticated?.())return;
    if(confirmFirst&&!confirm('Replace this browser draft with the latest Supabase cloud data?'))return;
    try{
      status('Loading current Supabase data…');const cloud=await fetchCloud();localStorage.setItem(ADMIN_KEY,JSON.stringify(cloud));localStorage.removeItem(DIRTY_KEY);sessionStorage.setItem(CLOUD_LOADED_KEY,'1');location.reload();
    }catch(e){status(e.message,'error');if(confirmFirst)alert(e.message);}
  }

  async function testConnection(){
    try{
      status('Testing Supabase admin access…');
      const rows=await rest('admin_profiles?select=user_id,role&limit=1');
      if(!Array.isArray(rows)||!rows.length)throw new Error('This account is not an authorized YK administrator.');
      status('Supabase Auth, database and RLS access verified.','ok');
      return true;
    }catch(e){status(e.message,'error');throw e;}
  }

  function renderIdentity(){
    const el=$('#syncIdentity');if(!el)return;const user=window.YKAdminAuth?.getUser?.();
    el.innerHTML=user?`Signed in as <b>${user.email||'YK Admin'}</b>. Product changes are protected by Supabase Row Level Security.`:'Sign in with the YK Supabase admin account to edit cloud data.';
  }
  function renderDraftStatus(){
    const dirty=localStorage.getItem(DIRTY_KEY)==='1';
    const save=$('#publishLiveBtn');
    if(save){save.classList.toggle('has-draft',dirty);save.textContent=dirty?'↑ Publish Draft':'✓ Cloud Current';}
    if(dirty)status('Draft changes are saved in this browser. Publish them when ready.','warning');
  }
  function injectUI(){
    const actions=$('.topbar-actions');
    if(actions&&!$('#publishLiveBtn')){
      const load=document.createElement('button');load.className='ghost-btn';load.id='loadLiveBtn';load.textContent='↻ Refresh Cloud';
      const save=document.createElement('button');save.className='primary-btn';save.id='publishLiveBtn';save.textContent='↑ Save Cloud';
      actions.insertBefore(load,actions.firstChild);actions.insertBefore(save,load.nextSibling);load.onclick=()=>loadCloudIntoAdmin(true);save.onclick=saveCloud;
    }
    const settings=$('#page-settings');
    if(settings&&!$('#supabaseSyncCard')){
      const card=document.createElement('article');card.className='settings-card github-sync-card';card.id='supabaseSyncCard';
      card.innerHTML=`<div class="panel-head"><div><h2>Supabase Cloud</h2><p>Products, pricing, stock, Trending and settings now live in the YK database.</p></div><span class="counter-pill">Live DB</span></div><div class="sync-help" id="syncIdentity"></div><div class="sync-row"><span id="syncStatus" data-type="info">Waiting for authenticated admin session.</span><div><button type="button" class="ghost-btn" id="testGithubBtn">Test cloud</button><button type="button" class="primary-btn" id="publishFromSettingsBtn">Save Cloud</button></div></div>`;
      settings.appendChild(card);$('#testGithubBtn').onclick=testConnection;$('#publishFromSettingsBtn').onclick=saveCloud;
    }
    const notice=$('.local-notice');if(notice)notice.innerHTML='<b>Supabase cloud backend</b><span>YK Admin now saves to a protected database; the storefront reads the same live data.</span>';renderIdentity();renderDraftStatus();
  }

  document.addEventListener('yk-admin-authenticated',async()=>{
    renderIdentity();status('Supabase admin session active.','ok');
    if(!sessionStorage.getItem(CLOUD_LOADED_KEY))await loadCloudIntoAdmin(false);
    else renderDraftStatus();
  });
  document.addEventListener('yk-admin-draft-changed',renderDraftStatus);
  document.addEventListener('yk-admin-draft-published',renderDraftStatus);
  injectUI();
})();
