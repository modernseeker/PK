(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const statuses=['new','contacted','quoted','confirmed','completed','cancelled'];
  const priorities=['low','normal','high','urgent'];
  const timelineLabels={urgent:'Urgently / today','2-3-days':'Within 2–3 days','this-week':'This week',planning:'Planning / checking price'};
  const contactLabels={whatsapp:'WhatsApp',phone:'Phone call',either:'Phone or WhatsApp'};
  const actionLabels={created:'Enquiry received',status_changed:'Status changed',priority_changed:'Priority changed',follow_up_scheduled:'Follow-up updated',note_updated:'Internal note updated',contact_logged:'Customer contact logged'};
  let enquiries=[];
  let selectedId=null;
  let statusFilter='all';
  let priorityFilter='all';
  let query='';

  function token(){return window.YKAdminAuth?.getToken?.()||'';}
  async function rest(path,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{
      ...options,
      headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},
      cache:'no-store'
    });
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(body?.message||body?.hint||`Request failed (${response.status})`);
    return body;
  }

  function label(value){return String(value||'new').replace(/[_-]/g,' ').replace(/^./,char=>char.toUpperCase());}
  function reference(enquiry){return enquiry?.reference_code||`YK-${String(enquiry?.id||'').split('-')[0].toUpperCase()}`;}
  function formatDate(value){return value?new Intl.DateTimeFormat('en-NP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Not scheduled';}
  function localDateTime(value){
    if(!value)return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }
  function followUpState(enquiry){
    if(!enquiry?.next_follow_up_at)return {label:'No follow-up',tone:'none'};
    if(['completed','cancelled'].includes(enquiry.status))return {label:formatDate(enquiry.next_follow_up_at),tone:'done'};
    const due=new Date(enquiry.next_follow_up_at).getTime();
    const today=new Date();today.setHours(23,59,59,999);
    if(due<Date.now())return {label:`Overdue · ${formatDate(enquiry.next_follow_up_at)}`,tone:'overdue'};
    if(due<=today.getTime())return {label:`Due today · ${formatDate(enquiry.next_follow_up_at)}`,tone:'today'};
    return {label:`Follow up · ${formatDate(enquiry.next_follow_up_at)}`,tone:'future'};
  }

  function inject(){
    const settingsNav=$('.nav-item[data-page="settings"]');
    if(settingsNav&&!$('.nav-item[data-page="enquiries"]')){
      const button=document.createElement('button');
      button.className='nav-item';button.dataset.page='enquiries';button.innerHTML='<span>✉</span>Enquiries <em id="enquiryNavBadge">0</em>';
      settingsNav.before(button);button.onclick=showPage;
    }
    if(!$('#page-enquiries')){
      const page=document.createElement('section');
      page.className='page';page.id='page-enquiries';
      page.innerHTML=`
        <div class="page-heading compact"><div><p class="eyebrow">SALES INBOX</p><h1>Customer Enquiries</h1><p>Track every website request, next action and customer follow-up.</p></div><button class="ghost-btn" id="refreshEnquiries">↻ Refresh</button></div>
        <div class="enquiry-admin-stats"><article><small>New</small><strong id="eqNew">0</strong></article><article><small>Due / overdue</small><strong id="eqDue">0</strong></article><article><small>Active</small><strong id="eqActive">0</strong></article><article><small>Completed</small><strong id="eqCompleted">0</strong></article></div>
        <div class="enquiry-toolbar"><label class="search-box"><span>⌕</span><input id="enquirySearch" type="search" placeholder="Search reference, customer, phone or product"></label><select id="enquiryStatus"><option value="all">All statuses</option>${statuses.map(status=>`<option value="${status}">${label(status)}</option>`).join('')}</select><select id="enquiryPriority"><option value="all">All priorities</option>${priorities.map(priority=>`<option value="${priority}">${label(priority)}</option>`).join('')}</select></div>
        <div class="enquiry-admin-layout"><div class="enquiry-list-card"><div id="enquiryList" class="enquiry-admin-list"><div class="enquiry-loading">Loading enquiries…</div></div></div><aside id="enquiryDetail" class="enquiry-detail"><div class="enquiry-empty-detail"><span>✉</span><b>Select an enquiry</b><p>Customer details, requested products and follow-up tools will appear here.</p></div></aside></div>`;
      $('.main-panel').appendChild(page);
      $('#refreshEnquiries').onclick=load;
      $('#enquirySearch').oninput=event=>{query=event.target.value.toLowerCase();renderList();};
      $('#enquiryStatus').onchange=event=>{statusFilter=event.target.value;renderList();};
      $('#enquiryPriority').onchange=event=>{priorityFilter=event.target.value;renderList();};
    }
    const stats=$('.stats-grid');
    if(stats&&!$('#dashboardEnquiryStat')){
      const card=document.createElement('article');
      card.className='stat-card enquiry-dashboard-stat';card.id='dashboardEnquiryStat';
      card.innerHTML='<span class="stat-icon">✉</span><div><small>Enquiry Follow-ups</small><strong id="statEnquiries">0</strong><em id="statEnquiryCaption">Needs attention</em></div>';
      card.onclick=showPage;stats.appendChild(card);
    }
  }

  function showPage(){
    document.querySelectorAll('.page').forEach(page=>page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
    $('#page-enquiries').classList.add('active');$('.nav-item[data-page="enquiries"]').classList.add('active');
    $('#pageTitle').textContent='Enquiries';$('#sidebar')?.classList.remove('open');load();
  }
  function haystack(enquiry){
    return `${reference(enquiry)} ${enquiry.customer_name} ${enquiry.phone} ${enquiry.business_name||''} ${enquiry.location||''} ${enquiry.notes||''} ${enquiry.admin_notes||''} ${(enquiry.enquiry_items||[]).map(item=>`${item.product_name} ${item.specification||''}`).join(' ')}`.toLowerCase();
  }
  function filtered(){
    return enquiries.filter(enquiry=>(statusFilter==='all'||enquiry.status===statusFilter)&&(priorityFilter==='all'||enquiry.priority===priorityFilter)&&(!query||haystack(enquiry).includes(query)));
  }
  function dueLeads(){return enquiries.filter(enquiry=>!['completed','cancelled'].includes(enquiry.status)&&enquiry.next_follow_up_at&&new Date(enquiry.next_follow_up_at).getTime()<=Date.now()).length;}
  function renderStats(){
    const fresh=enquiries.filter(enquiry=>enquiry.status==='new').length;
    const active=enquiries.filter(enquiry=>['new','contacted','quoted','confirmed'].includes(enquiry.status)).length;
    const completed=enquiries.filter(enquiry=>enquiry.status==='completed').length;
    const due=dueLeads();
    [['eqNew',fresh],['eqDue',due],['eqActive',active],['eqCompleted',completed],['statEnquiries',fresh+due],['enquiryNavBadge',fresh+due]].forEach(([id,value])=>{const element=$('#'+id);if(element)element.textContent=value;});
    const caption=$('#statEnquiryCaption');if(caption)caption.textContent=due?`${due} follow-up${due===1?'':'s'} overdue`:`${fresh} new request${fresh===1?'':'s'}`;
    const badge=$('#enquiryNavBadge');if(badge)badge.hidden=!(fresh+due);
  }
  function renderList(){
    const list=filtered(),holder=$('#enquiryList');if(!holder)return;
    if(!list.length){holder.innerHTML='<div class="enquiry-loading"><b>No enquiries found.</b><span>New website requests will appear here.</span></div>';return;}
    holder.innerHTML=list.map(enquiry=>{
      const followUp=followUpState(enquiry);
      return `<button class="enquiry-row ${enquiry.id===selectedId?'selected':''}" data-id="${enquiry.id}"><div class="enquiry-row-top"><span class="status-pill status-${enquiry.status}">${label(enquiry.status)}</span><span class="priority-pill priority-${enquiry.priority||'normal'}">${label(enquiry.priority||'normal')}</span><time>${formatDate(enquiry.created_at)}</time></div><h3>${esc(enquiry.customer_name||'Customer')}</h3><p>${esc(reference(enquiry))} · ${esc(enquiry.phone)}${enquiry.location?' · '+esc(enquiry.location):''}</p><div class="enquiry-row-followup followup-${followUp.tone}"><span>${esc(followUp.label)}</span><b>${esc((enquiry.enquiry_items||[])[0]?.product_name||'Product enquiry')}</b></div></button>`;
    }).join('');
    holder.querySelectorAll('[data-id]').forEach(button=>button.onclick=()=>select(button.dataset.id));
  }
  function select(id){selectedId=id;renderList();renderDetail(enquiries.find(enquiry=>enquiry.id===id));}
  function waNumber(value){let number=String(value||'').replace(/\D/g,'');if(number.length===10)number='977'+number;return number;}
  function activityMarkup(enquiry){
    const activity=[...(enquiry.enquiry_activity||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    if(!activity.length)return '<div class="enquiry-activity-empty">No activity recorded yet.</div>';
    return activity.map(item=>`<div class="enquiry-activity-item"><span></span><div><b>${esc(actionLabels[item.action]||label(item.action))}</b>${item.note?`<p>${esc(item.note)}</p>`:''}<time>${formatDate(item.created_at)}</time></div></div>`).join('');
  }
  function renderDetail(enquiry){
    const detail=$('#enquiryDetail');
    if(!enquiry){detail.innerHTML='<div class="enquiry-empty-detail"><span>✉</span><b>Select an enquiry</b></div>';return;}
    const ref=reference(enquiry),message=`Hello ${enquiry.customer_name||''}, this is YK Electric regarding your enquiry ${ref}.`;
    detail.innerHTML=`
      <div class="enquiry-detail-head"><div><small>${esc(ref)}</small><h2>${esc(enquiry.customer_name||'Customer')}</h2><p>Received ${formatDate(enquiry.created_at)}</p></div><select id="detailStatus">${statuses.map(status=>`<option value="${status}" ${status===enquiry.status?'selected':''}>${label(status)}</option>`).join('')}</select></div>
      <div class="enquiry-contact-grid"><a href="tel:${esc(enquiry.phone)}"><small>PHONE</small><b>${esc(enquiry.phone)}</b></a><div><small>LOCATION</small><b>${esc(enquiry.location||'Not provided')}</b></div><div><small>PREFERRED CONTACT</small><b>${esc(contactLabels[enquiry.contact_preference]||label(enquiry.contact_preference||'whatsapp'))}</b></div><div><small>NEEDED</small><b>${esc(timelineLabels[enquiry.required_timeline]||label(enquiry.required_timeline||'planning'))}</b></div><div><small>BUSINESS</small><b>${esc(enquiry.business_name||'Not provided')}</b></div><a class="whatsapp-contact" target="_blank" rel="noopener" href="https://wa.me/${waNumber(enquiry.phone)}?text=${encodeURIComponent(message)}"><small>WHATSAPP</small><b>Open chat ↗</b></a></div>
      <div class="enquiry-products"><h3>Requested products</h3>${(enquiry.enquiry_items||[]).map(item=>`<div><span>${esc(item.product_name)}${item.specification?`<small>${esc(item.specification)}</small>`:''}</span><b>Qty ${Math.max(1,Number(item.quantity)||1)}</b></div>`).join('')}</div>
      <div class="enquiry-notes"><small>CUSTOMER NOTES</small><p>${esc(enquiry.notes||'No additional notes.')}</p></div>
      <section class="lead-management"><div class="lead-management-head"><div><small>PRIVATE SALES WORKSPACE</small><h3>Next action</h3></div><span class="priority-pill priority-${enquiry.priority||'normal'}">${label(enquiry.priority||'normal')}</span></div><div class="lead-management-grid"><label><span>Priority</span><select id="leadPriority">${priorities.map(priority=>`<option value="${priority}" ${priority===(enquiry.priority||'normal')?'selected':''}>${label(priority)}</option>`).join('')}</select></label><label><span>Next follow-up</span><input id="leadFollowUp" type="datetime-local" value="${localDateTime(enquiry.next_follow_up_at)}"></label><label class="wide"><span>Internal notes</span><textarea id="leadNotes" rows="4" maxlength="4000" placeholder="Record pricing checks, alternatives, customer response or next step…">${esc(enquiry.admin_notes||'')}</textarea></label></div><div class="lead-management-actions"><button type="button" id="saveLead">Save next action</button><button type="button" id="logContact">Log customer contact</button></div><p id="leadSaveStatus" role="status"></p></section>
      <section class="enquiry-activity"><h3>Activity</h3><div>${activityMarkup(enquiry)}</div></section>
      <div class="enquiry-detail-actions"><a target="_blank" rel="noopener" href="https://wa.me/${waNumber(enquiry.phone)}?text=${encodeURIComponent(message)}">Reply on WhatsApp</a><button id="markCompleted" type="button">Mark completed</button></div>`;
    $('#detailStatus').onchange=event=>updateStatus(enquiry,event.target.value);
    $('#markCompleted').onclick=()=>updateStatus(enquiry,'completed');
    $('#saveLead').onclick=()=>saveLead(enquiry);
    $('#logContact').onclick=()=>logContact(enquiry);
  }

  async function patchEnquiry(enquiry,changes){
    await rest(`enquiries?id=eq.${encodeURIComponent(enquiry.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...changes,updated_at:new Date().toISOString()})});
  }
  async function updateStatus(enquiry,status){
    try{
      const changes={status};
      if(status==='contacted'&&!enquiry.last_contact_at)changes.last_contact_at=new Date().toISOString();
      await patchEnquiry(enquiry,changes);await load(enquiry.id);
    }catch(error){alert(error.message);renderDetail(enquiry);}
  }
  async function saveLead(enquiry){
    const button=$('#saveLead'),status=$('#leadSaveStatus');button.disabled=true;status.textContent='Saving…';
    try{
      const followUp=$('#leadFollowUp').value;
      await patchEnquiry(enquiry,{priority:$('#leadPriority').value,next_follow_up_at:followUp?new Date(followUp).toISOString():null,admin_notes:$('#leadNotes').value.trim()||null});
      status.textContent='Next action saved.';await load(enquiry.id);
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  }
  async function logContact(enquiry){
    const button=$('#logContact'),status=$('#leadSaveStatus');button.disabled=true;status.textContent='Logging contact…';
    try{
      const changes={last_contact_at:new Date().toISOString()};
      if(enquiry.status==='new')changes.status='contacted';
      await patchEnquiry(enquiry,changes);
      await rest('enquiry_activity',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({enquiry_id:enquiry.id,action:'contact_logged',note:'Customer contact recorded from the sales inbox.'})});
      await load(enquiry.id);
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  }
  async function load(reselectId=selectedId){
    const holder=$('#enquiryList');if(holder)holder.innerHTML='<div class="enquiry-loading">Loading enquiries…</div>';
    try{
      enquiries=await rest('enquiries?select=id,reference_code,customer_name,phone,business_name,location,notes,status,source,contact_preference,required_timeline,priority,next_follow_up_at,last_contact_at,admin_notes,created_at,updated_at,enquiry_items(id,product_id,product_name,quantity,specification),enquiry_activity(id,action,note,created_at,created_by)&order=created_at.desc');
      renderStats();renderList();
      if(reselectId){selectedId=reselectId;renderList();renderDetail(enquiries.find(enquiry=>enquiry.id===reselectId));}
    }catch(error){if(holder)holder.innerHTML=`<div class="enquiry-loading error"><b>Could not load enquiries</b><span>${esc(error.message)}</span></div>`;}
  }

  inject();
  document.addEventListener('yk-admin-authenticated',()=>load());
  if(window.YKAdminAuth?.isAuthenticated?.())load();
  setInterval(()=>{if(window.YKAdminAuth?.isAuthenticated?.())load();},60000);
})();
