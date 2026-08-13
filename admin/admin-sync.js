(()=>{
  const ADMIN_KEY='yk_admin_state_v1';
  const TOKEN_KEY='yk_admin_github_token_session';
  const REPO='modernseeker/PK';
  const BRANCH='main';
  const STORE_PATH='data/store.json';
  const API=`https://api.github.com/repos/${REPO}/contents/${STORE_PATH}`;
  const categories=[
    {name:'Wires & Cables',icon:'〰',desc:'Winding, house wiring, multicore, power and submersible cables.',image:'assets/product-wire.svg'},
    {name:'Protection',icon:'⚡',desc:'MCB, MCCB, RCCB, RCBO, SPD, fuses and changeover.',image:'assets/product-breaker.svg'},
    {name:'Control & Panel',icon:'▦',desc:'Contactors, relays, overloads, push buttons and panel accessories.',image:'assets/product-contactor.svg'},
    {name:'Automation',icon:'⌁',desc:'Timers, sensors, controllers, meters, PLC accessories and VFDs.',image:'assets/product-automation.svg'},
    {name:'Capacitors',icon:'◫',desc:'Motor, refrigerator, submersible and power-factor capacitors.',image:'assets/product-capacitor.svg'},
    {name:'Motors & Pumps',icon:'◉',desc:'Motors, water pumps, submersible motors and related parts.',image:'assets/product-motor.svg'},
    {name:'Bearings & Spares',icon:'⊙',desc:'Bearings, seals and repair spares for electrical equipment.',image:'assets/product-bearing.svg'},
    {name:'Lighting & Electronics',icon:'✦',desc:'LED lighting, drivers, electronic parts and selected HT items.',image:'assets/product-light.svg'}
  ];

  const authScript=document.createElement('script');
  authScript.src='admin-auth.js?v=3';
  authScript.async=false;
  document.head.appendChild(authScript);

  const $=s=>document.querySelector(s);
  let lastLive=null;

  function status(message,type='info'){
    const el=$('#syncStatus');
    if(el){el.textContent=message;el.dataset.type=type;}
    const notice=$('.local-notice');
    if(notice){notice.innerHTML=`<b>${type==='ok'?'Live publishing connected':type==='error'?'Publishing needs attention':'Draft + Live publishing'}</b><span>${message}</span>`;}
  }

  function renderIdentity(){
    const el=$('#syncIdentity');
    if(!el)return;
    const user=window.YKAdminAuth?.getUser?.();
    el.innerHTML=user?`Authenticated as <b>${user.adminUsername||user.login}</b>. Publishing is authorized only while this secure admin session remains active.`:'Sign in through the secure admin screen to enable GitHub publishing.';
  }

  function injectUI(){
    const actions=$('.topbar-actions');
    if(actions&&!$('#publishLiveBtn')){
      const load=document.createElement('button');load.className='ghost-btn';load.id='loadLiveBtn';load.textContent='↻ Load Live';
      const publish=document.createElement('button');publish.className='primary-btn';publish.id='publishLiveBtn';publish.textContent='↑ Publish Live';
      actions.insertBefore(load,actions.firstChild);actions.insertBefore(publish,load.nextSibling);
      load.onclick=loadLiveIntoAdmin;publish.onclick=publishLive;
    }

    const settings=$('#page-settings');
    if(settings&&!$('#githubSyncCard')){
      const card=document.createElement('article');
      card.className='settings-card github-sync-card';card.id='githubSyncCard';
      card.innerHTML=`
        <div class="panel-head"><div><h2>Live Publishing</h2><p>Publish this admin draft to the shared storefront data file in GitHub.</p></div><span class="counter-pill">Protected</span></div>
        <div class="sync-help" id="syncIdentity">Sign in through the secure admin screen to enable GitHub publishing.</div>
        <div class="sync-row"><span id="syncStatus" data-type="info">Waiting for authenticated admin session.</span><div><button type="button" class="ghost-btn" id="testGithubBtn">Test connection</button><button type="button" class="primary-btn" id="publishFromSettingsBtn">Publish Live</button></div></div>`;
      settings.appendChild(card);
      $('#testGithubBtn').onclick=testConnection;$('#publishFromSettingsBtn').onclick=publishLive;
    }
    const notice=$('.local-notice');
    if(notice) notice.innerHTML='<b>Secure draft + live publishing</b><span>Only an authenticated YK Admin session can publish changes to the shared storefront.</span>';
    renderIdentity();
  }

  function token(){return (window.YKAdminAuth?.getToken?.()||sessionStorage.getItem(TOKEN_KEY)||'').trim();}

  async function fetchLive(){
    const res=await fetch(`../${STORE_PATH}?v=${Date.now()}`,{cache:'no-store'});
    if(!res.ok) throw new Error(`Could not load live data (${res.status})`);
    lastLive=await res.json();return lastLive;
  }

  function toAdminImage(src){const s=String(src||'');return s.startsWith('assets/')?`../${s}`:s;}
  function toPublicImage(src){const s=String(src||'').trim();return s.startsWith('../assets/')?s.slice(3):s;}

  function liveToAdmin(live){
    return {products:(live.products||[]).map(p=>({...p,img:toAdminImage(p.img),featured:(live.trending||[]).map(Number).includes(Number(p.id))})),brands:Array.isArray(live.brands)?[...live.brands]:[],settings:{...(live.settings||{})}};
  }

  function readDraft(){
    try{const draft=JSON.parse(localStorage.getItem(ADMIN_KEY)||'null');if(draft&&Array.isArray(draft.products)&&Array.isArray(draft.brands)) return draft;}catch(e){}
    throw new Error('Admin draft data is unavailable. Reload the admin page.');
  }

  function buildLivePayload(draft,currentLive){
    const trending=draft.products.filter(p=>p.featured).slice(0,4).map(p=>Number(p.id));
    const products=draft.products.map(p=>({...p,id:Number(p.id),img:toPublicImage(p.img),featured:trending.includes(Number(p.id)),price:String(p.price||'Price on request'),stock:String(p.stock||'Check Stock'),tags:String(p.tags||`${p.brand||''} ${p.name||''} ${p.model||''} ${p.spec||''}`).trim()}));
    return {version:Number(currentLive?.version||0)+1,updatedAt:new Date().toISOString(),settings:{...(draft.settings||{})},brands:[...new Set(draft.brands.filter(Boolean))],categories:Array.isArray(currentLive?.categories)&&currentLive.categories.length?currentLive.categories:categories,trending,products};
  }

  function encodeBase64(text){
    const bytes=new TextEncoder().encode(text);let binary='';const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary);
  }

  async function githubRequest(url,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.()) throw new Error('Your secure admin session is locked. Sign in again before publishing.');
    const t=token();if(!t) throw new Error('Authenticated GitHub credential is unavailable. Sign in again.');
    const res=await fetch(url,{...options,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${t}`,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}});
    const body=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(body.message||`GitHub request failed (${res.status})`);
    return body;
  }

  async function testConnection(){
    try{status('Testing authenticated GitHub access…');const file=await githubRequest(`${API}?ref=${encodeURIComponent(BRANCH)}`);status(`Verified. Live data file found at ${STORE_PATH}.`,'ok');return file;}
    catch(e){status(e.message,'error');throw e;}
  }

  async function publishLive(){
    const btns=[...document.querySelectorAll('#publishLiveBtn,#publishFromSettingsBtn')];
    btns.forEach(b=>{b.disabled=true;b.dataset.old=b.textContent;b.textContent='Publishing…'});
    try{
      status('Publishing your current admin draft to GitHub…');
      const meta=await githubRequest(`${API}?ref=${encodeURIComponent(BRANCH)}`);
      let current;try{current=await fetchLive()}catch(e){current=lastLive||{version:0,categories}};
      const payload=buildLivePayload(readDraft(),current);
      await githubRequest(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Publish YK storefront data v${payload.version}`,content:encodeBase64(JSON.stringify(payload,null,2)+'\n'),sha:meta.sha,branch:BRANCH})});
      lastLive=payload;status(`Published successfully. Storefront data is now v${payload.version}. GitHub Pages may take a short moment to refresh.`,'ok');
    }catch(e){console.error(e);status(e.message,'error');alert(`Publish failed: ${e.message}`);}
    finally{btns.forEach(b=>{b.disabled=false;b.textContent=b.dataset.old||'Publish Live'});}
  }

  async function loadLiveIntoAdmin(){
    if(!window.YKAdminAuth?.isAuthenticated?.()){alert('Sign in to the secure admin session first.');return;}
    if(!confirm('Replace this browser’s current admin draft with the latest live storefront data?')) return;
    try{status('Loading current live storefront data…');const live=await fetchLive();localStorage.setItem(ADMIN_KEY,JSON.stringify(liveToAdmin(live)));sessionStorage.setItem('yk_admin_loaded_live','1');location.reload();}
    catch(e){status(e.message,'error');alert(e.message);}
  }

  async function bootstrapFromLiveIfNeeded(){
    if(localStorage.getItem(ADMIN_KEY)) return;
    try{const live=await fetchLive();localStorage.setItem(ADMIN_KEY,JSON.stringify(liveToAdmin(live)));if(!sessionStorage.getItem('yk_admin_bootstrapped')){sessionStorage.setItem('yk_admin_bootstrapped','1');location.reload();}}
    catch(e){console.warn('Using built-in admin seed because live data could not be loaded.',e);}
  }

  document.addEventListener('yk-admin-authenticated',()=>{renderIdentity();status('Authenticated admin session active. Live publishing is available.','ok');});
  injectUI();bootstrapFromLiveIfNeeded();
})();
