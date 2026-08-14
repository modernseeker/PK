(()=>{
  const cfg=window.YKSupabaseConfig||{},$=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses=['new','contacted','quoted','confirmed','completed','cancelled'];
  let enquiries=[],selectedId=null,filter='all',query='';
  function token(){return window.YKAdminAuth?.getToken?.()||''}
  async function rest(path,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>null);if(!res.ok)throw new Error(body?.message||body?.hint||`Request failed (${res.status})`);return body;
  }
  function label(s){return String(s||'new').replace(/^./,c=>c.toUpperCase())}
  function ref(e){return e?.reference_code||`YK-${String(e?.id||'').split('-')[0].toUpperCase()}`}
  function inject(){
    const settingsNav=$('.nav-item[data-page="settings"]');
    if(settingsNav&&!$('.nav-item[data-page="enquiries"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='enquiries';b.innerHTML='<span>✉</span>Enquiries <em id="enquiryNavBadge">0</em>';settingsNav.before(b);b.onclick=showPage}
    if(!$('#page-enquiries')){const page=document.createElement('section');page.className='page';page.id='page-enquiries';page.innerHTML=`
      <div class="page-heading compact"><div><p class="eyebrow">SALES INBOX</p><h1>Customer Enquiries</h1><p>Follow every website request from first contact to completion.</p></div><button class="ghost-btn" id="refreshEnquiries">↻ Refresh</button></div>
      <div class="enquiry-admin-stats"><article><small>New</small><strong id="eqNew">0</strong></article><article><small>Active</small><strong id="eqActive">0</strong></article><article><small>Completed</small><strong id="eqCompleted">0</strong></article><article><small>Total</small><strong id="eqTotal">0</strong></article></div>
      <div class="enquiry-toolbar"><label class="search-box"><span>⌕</span><input id="enquirySearch" type="search" placeholder="Search reference, name, phone, location or product"></label><select id="enquiryStatus"><option value="all">All statuses</option>${statuses.map(s=>`<option value="${s}">${label(s)}</option>`).join('')}</select></div>
      <div class="enquiry-admin-layout"><div class="enquiry-list-card"><div id="enquiryList" class="enquiry-admin-list"><div class="enquiry-loading">Loading enquiries…</div></div></div><aside id="enquiryDetail" class="enquiry-detail"><div class="enquiry-empty-detail"><span>✉</span><b>Select an enquiry</b><p>Customer details and requested products will appear here.</p></div></aside></div>`;
      $('.main-panel').appendChild(page);$('#refreshEnquiries').onclick=load;$('#enquirySearch').oninput=e=>{query=e.target.value.toLowerCase();renderList()};$('#enquiryStatus').onchange=e=>{filter=e.target.value;renderList()};
    }
    const stats=$('.stats-grid');if(stats&&!$('#dashboardEnquiryStat')){const card=document.createElement('article');card.className='stat-card enquiry-dashboard-stat';card.id='dashboardEnquiryStat';card.innerHTML='<span class="stat-icon">✉</span><div><small>New Enquiries</small><strong id="statEnquiries">0</strong><em>Needs follow-up</em></div>';card.onclick=showPage;stats.appendChild(card)}
  }
  function showPage(){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));$('#page-enquiries').classList.add('active');$('.nav-item[data-page="enquiries"]').classList.add('active');$('#pageTitle').textContent='Enquiries';$('#sidebar')?.classList.remove('open');load()}
  function haystack(e){return `${ref(e)} ${e.customer_name} ${e.phone} ${e.business_name||''} ${e.location||''} ${e.notes||''} ${(e.enquiry_items||[]).map(i=>`${i.product_name} ${i.specification||''}`).join(' ')}`.toLowerCase()}
  function filtered(){return enquiries.filter(e=>(filter==='all'||e.status===filter)&&(!query||haystack(e).includes(query)))}
  function date(v){return new Intl.DateTimeFormat('en-NP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}
  function renderStats(){const n=enquiries.filter(e=>e.status==='new').length,a=enquiries.filter(e=>['new','contacted','quoted','confirmed'].includes(e.status)).length,c=enquiries.filter(e=>e.status==='completed').length;[['eqNew',n],['eqActive',a],['eqCompleted',c],['eqTotal',enquiries.length],['statEnquiries',n],['enquiryNavBadge',n]].forEach(([id,v])=>{const el=$('#'+id);if(el)el.textContent=v});const badge=$('#enquiryNavBadge');if(badge)badge.hidden=!n}
  function renderList(){
    const list=filtered(),holder=$('#enquiryList');if(!holder)return;
    if(!list.length){holder.innerHTML='<div class="enquiry-loading"><b>No enquiries found.</b><span>New website requests will appear here.</span></div>';return}
    holder.innerHTML=list.map(e=>`<button class="enquiry-row ${e.id===selectedId?'selected':''}" data-id="${e.id}"><div class="enquiry-row-top"><span class="status-pill status-${e.status}">${label(e.status)}</span><time>${date(e.created_at)}</time></div><h3>${esc(e.customer_name||'Customer')}</h3><p>${esc(ref(e))} · ${esc(e.phone)}${e.location?' · '+esc(e.location):''}</p><div><span>${(e.enquiry_items||[]).length} product${(e.enquiry_items||[]).length===1?'':'s'}</span><b>${esc((e.enquiry_items||[])[0]?.product_name||'Product enquiry')}</b></div></button>`).join('');holder.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>select(b.dataset.id))
  }
  function select(id){selectedId=id;renderList();renderDetail(enquiries.find(e=>e.id===id))}
  function waNumber(v){let n=String(v||'').replace(/\D/g,'');if(n.length===10)n='977'+n;return n}
  function renderDetail(e){
    const d=$('#enquiryDetail');if(!e){d.innerHTML='<div class="enquiry-empty-detail"><span>✉</span><b>Select an enquiry</b></div>';return}
    const reference=ref(e),msg=`Hello ${e.customer_name||''}, this is YK Electric regarding your enquiry ${reference}.`;
    d.innerHTML=`<div class="enquiry-detail-head"><div><small>${esc(reference)}</small><h2>${esc(e.customer_name||'Customer')}</h2><p>Received ${date(e.created_at)}</p></div><select id="detailStatus">${statuses.map(s=>`<option value="${s}" ${s===e.status?'selected':''}>${label(s)}</option>`).join('')}</select></div>
      <div class="enquiry-contact-grid"><a href="tel:${esc(e.phone)}"><small>PHONE</small><b>${esc(e.phone)}</b></a><div><small>LOCATION</small><b>${esc(e.location||'Not provided')}</b></div><div><small>BUSINESS</small><b>${esc(e.business_name||'Not provided')}</b></div><a class="whatsapp-contact" target="_blank" rel="noopener" href="https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(msg)}"><small>WHATSAPP</small><b>Open chat ↗</b></a></div>
      <div class="enquiry-products"><h3>Requested products</h3>${(e.enquiry_items||[]).map(i=>`<div><span>${esc(i.product_name)}${i.specification?`<small>${esc(i.specification)}</small>`:''}</span><b>Qty ${Math.max(1,Number(i.quantity)||1)}</b></div>`).join('')}</div>
      <div class="enquiry-notes"><small>CUSTOMER NOTES</small><p>${esc(e.notes||'No additional notes.')}</p></div>
      <div class="enquiry-detail-actions"><a target="_blank" rel="noopener" href="https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(msg)}">Reply on WhatsApp</a><button id="markCompleted" type="button">Mark completed</button></div>`;
    $('#detailStatus').onchange=x=>updateStatus(e,x.target.value);$('#markCompleted').onclick=()=>updateStatus(e,'completed')
  }
  async function updateStatus(e,status){const previous=e.status;e.status=status;renderStats();renderList();renderDetail(e);try{await rest(`enquiries?id=eq.${encodeURIComponent(e.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status,updated_at:new Date().toISOString()})})}catch(err){e.status=previous;renderStats();renderList();renderDetail(e);alert(err.message)}}
  async function load(){const holder=$('#enquiryList');if(holder)holder.innerHTML='<div class="enquiry-loading">Loading enquiries…</div>';try{enquiries=await rest('enquiries?select=id,reference_code,customer_name,phone,business_name,location,notes,status,source,created_at,updated_at,enquiry_items(id,product_id,product_name,quantity,specification)&order=created_at.desc');renderStats();renderList();if(selectedId)renderDetail(enquiries.find(e=>e.id===selectedId))}catch(e){if(holder)holder.innerHTML=`<div class="enquiry-loading error"><b>Could not load enquiries</b><span>${esc(e.message)}</span></div>`}}
  inject();document.addEventListener('yk-admin-authenticated',load);if(window.YKAdminAuth?.isAuthenticated?.())load();setInterval(()=>{if(window.YKAdminAuth?.isAuthenticated?.())load()},60000);
})();
