(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses=['draft','sent','accepted','rejected','expired','cancelled'];
  let quotes=[],filter='all',query='',loading=false;

  function token(){return window.YKAdminAuth?.getToken?.()||''}
  async function rest(path,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw new Error(body?.message||body?.hint||`Request failed (${res.status})`);
    return body;
  }
  const label=s=>String(s||'draft').replace(/^./,c=>c.toUpperCase());
  const money=v=>`Rs. ${Number(v||0).toLocaleString('en-NP',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-NP',{dateStyle:'medium'}).format(d)}
  function isPast(v){if(!v)return false;const d=new Date(`${String(v).slice(0,10)}T23:59:59`);return d.getTime()<Date.now()}
  function daysUntil(v){if(!v)return null;const now=new Date();now.setHours(0,0,0,0);const d=new Date(`${String(v).slice(0,10)}T00:00:00`);return Math.ceil((d-now)/86400000)}
  function searchText(q){return `${q.quote_number||''} ${q.customer_name||''} ${q.phone||''} ${q.business_name||''} ${q.location||''} ${q.status||''} ${q.enquiries?.reference_code||''}`.toLowerCase()}
  function filtered(){return quotes.filter(q=>(filter==='all'||q.status===filter)&&(!query||searchText(q).includes(query)))}

  function inject(){
    const nav=$('#sideNav');
    if(nav&&!$('.nav-item[data-page="quotations"]')){
      const btn=document.createElement('button');btn.className='nav-item';btn.dataset.page='quotations';btn.innerHTML='<span>▤</span>Quotations <em id="quoteNavBadge">0</em>';
      const settings=$('.nav-item[data-page="settings"]');
      if(settings)nav.insertBefore(btn,settings);else nav.appendChild(btn);
      btn.onclick=showPage;
    }
    if(!$('#page-quotations')){
      const page=document.createElement('section');page.className='page';page.id='page-quotations';page.innerHTML=`
        <div class="page-heading compact quote-page-heading"><div><p class="eyebrow">SALES PIPELINE</p><h1>Quotations</h1><p>Track every YK quotation from draft to customer decision.</p></div><div class="quote-page-actions"><button class="ghost-btn" id="refreshQuotes">↻ Refresh</button><button class="primary-btn" id="quoteGoEnquiries">＋ New from enquiry</button></div></div>
        <div class="quote-page-stats">
          <article><span>▤</span><div><small>Total quotations</small><strong id="qpTotal">0</strong><em>All records</em></div></article>
          <article><span>✎</span><div><small>Drafts</small><strong id="qpDraft">0</strong><em>Not sent yet</em></div></article>
          <article><span>⌛</span><div><small>Awaiting customer</small><strong id="qpSent">0</strong><em>Sent & valid</em></div></article>
          <article><span>✓</span><div><small>Accepted value</small><strong id="qpAcceptedValue">Rs. 0</strong><em>Accepted quotations</em></div></article>
        </div>
        <div class="quote-page-toolbar"><label class="search-box"><span>⌕</span><input id="quoteSearch" type="search" placeholder="Search quotation, customer, phone or enquiry"></label><select id="quoteStatusFilter"><option value="all">All statuses</option>${statuses.map(s=>`<option value="${s}">${label(s)}</option>`).join('')}</select></div>
        <div class="quote-page-card"><div class="quote-page-meta"><span id="quoteResultText">0 quotations</span><small>Click Open / Edit to work on the quotation</small></div><div id="quoteList" class="quote-list"><div class="quote-list-empty">Loading quotations…</div></div></div>`;
      $('.main-panel').appendChild(page);
      $('#refreshQuotes').onclick=load;
      $('#quoteGoEnquiries').onclick=()=>$('.nav-item[data-page="enquiries"]')?.click();
      $('#quoteSearch').oninput=e=>{query=e.target.value.trim().toLowerCase();render()};
      $('#quoteStatusFilter').onchange=e=>{filter=e.target.value;render()};
    }
  }

  function showPage(){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    $('#page-quotations')?.classList.add('active');$('.nav-item[data-page="quotations"]')?.classList.add('active');
    if($('#pageTitle'))$('#pageTitle').textContent='Quotations';$('#sidebar')?.classList.remove('open');load();
  }

  async function expireOldSent(rows){
    const expired=rows.filter(q=>q.status==='sent'&&isPast(q.valid_until));
    if(!expired.length)return rows;
    await Promise.all(expired.map(q=>rest(`quotations?id=eq.${encodeURIComponent(q.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'expired',updated_at:new Date().toISOString()})}).catch(()=>null)));
    expired.forEach(q=>q.status='expired');return rows;
  }

  function renderStats(){
    const total=quotes.length,drafts=quotes.filter(q=>q.status==='draft').length,sent=quotes.filter(q=>q.status==='sent').length,accepted=quotes.filter(q=>q.status==='accepted').reduce((n,q)=>n+Number(q.grand_total||0),0);
    if($('#qpTotal'))$('#qpTotal').textContent=total;if($('#qpDraft'))$('#qpDraft').textContent=drafts;if($('#qpSent'))$('#qpSent').textContent=sent;if($('#qpAcceptedValue'))$('#qpAcceptedValue').textContent=money(accepted).replace('.00','');
    const badge=$('#quoteNavBadge');if(badge){badge.textContent=sent;badge.hidden=!sent;}
  }

  function validity(q){
    if(!q.valid_until)return '<span class="quote-validity muted">No expiry</span>';
    const days=daysUntil(q.valid_until);
    if(q.status==='expired'||days<0)return `<span class="quote-validity expired">Expired ${esc(date(q.valid_until))}</span>`;
    if(q.status==='sent'&&days<=3)return `<span class="quote-validity warning">${days===0?'Expires today':`Expires in ${days} day${days===1?'':'s'}`}</span>`;
    return `<span class="quote-validity">Valid to ${esc(date(q.valid_until))}</span>`;
  }

  function render(){
    renderStats();const list=filtered(),holder=$('#quoteList');if(!holder)return;
    if($('#quoteResultText'))$('#quoteResultText').textContent=`${list.length} quotation${list.length===1?'':'s'}`;
    if(!list.length){holder.innerHTML='<div class="quote-list-empty"><b>No quotations found.</b><span>Create a quotation from a customer enquiry or change the current filters.</span></div>';return}
    holder.innerHTML=list.map(q=>`<article class="quote-list-row" data-quote="${esc(q.id)}">
      <div class="quote-list-primary"><div class="quote-number-line"><b>${esc(q.quote_number||'Quotation')}</b><span class="quote-list-status qs-${esc(q.status)}">${esc(label(q.status))}</span></div><h3>${esc(q.customer_name||'Customer')}</h3><p>${esc(q.business_name||q.location||q.phone||'No contact details')}</p><small>${q.enquiries?.reference_code?`Enquiry ${esc(q.enquiries.reference_code)} · `:''}Created ${esc(date(q.created_at))}</small></div>
      <div class="quote-list-value"><small>GRAND TOTAL</small><strong>${money(q.grand_total)}</strong>${validity(q)}</div>
      <div class="quote-list-decision"><label><span>Status</span><select data-quote-status="${esc(q.id)}">${statuses.map(s=>`<option value="${s}" ${s===q.status?'selected':''}>${label(s)}</option>`).join('')}</select></label></div>
      <div class="quote-list-actions"><button type="button" class="quote-open-btn" data-open-quote="${esc(q.id)}">Open / Edit</button>${q.enquiry_id?`<button type="button" class="quote-enquiry-btn" data-open-enquiry="${esc(q.enquiry_id)}">View enquiry</button>`:''}</div>
    </article>`).join('');
    holder.querySelectorAll('[data-quote-status]').forEach(s=>s.onchange=()=>updateStatus(s.dataset.quoteStatus,s.value,s));
    holder.querySelectorAll('[data-open-enquiry]').forEach(b=>b.onclick=()=>openEnquiry(b.dataset.openEnquiry,false));
    holder.querySelectorAll('[data-open-quote]').forEach(b=>b.onclick=()=>{const q=quotes.find(x=>x.id===b.dataset.openQuote);if(q?.enquiry_id)openEnquiry(q.enquiry_id,true);else alert('This quotation is not linked to an enquiry.');});
  }

  async function updateStatus(id,status,select){
    const q=quotes.find(x=>x.id===id);if(!q)return;const previous=q.status;q.status=status;renderStats();
    try{
      const patch={status,updated_at:new Date().toISOString()};if(status==='sent'&&!q.sent_at)patch.sent_at=new Date().toISOString();
      await rest(`quotations?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});
      if(q.enquiry_id&&status==='accepted')await rest(`enquiries?id=eq.${encodeURIComponent(q.enquiry_id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'confirmed',updated_at:new Date().toISOString()})});
      if(q.enquiry_id&&status==='sent')await rest(`enquiries?id=eq.${encodeURIComponent(q.enquiry_id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'quoted',updated_at:new Date().toISOString()})});
      q.sent_at=patch.sent_at||q.sent_at;render();
    }catch(e){q.status=previous;if(select)select.value=previous;renderStats();alert(e.message)}
  }

  function waitFor(fn,timeout=5000){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{const value=fn();if(value)return resolve(value);if(Date.now()-start>=timeout)return reject(new Error('The linked enquiry could not be opened.'));setTimeout(tick,80)};tick()})}
  async function openEnquiry(id,openQuote){
    try{
      const nav=$('.nav-item[data-page="enquiries"]');if(!nav)throw new Error('Enquiries page is unavailable.');nav.click();
      const row=await waitFor(()=>document.querySelector(`.enquiry-row[data-id="${CSS.escape(id)}"]`));row.click();
      if(openQuote){const btn=await waitFor(()=>$('#manageQuotationBtn'),2500);btn.click();}
    }catch(e){alert(e.message)}
  }

  async function load(){
    if(loading||!window.YKAdminAuth?.isAuthenticated?.())return;loading=true;const holder=$('#quoteList');if(holder)holder.innerHTML='<div class="quote-list-empty">Loading quotations…</div>';
    try{
      const rows=await rest('quotations?select=id,quote_number,enquiry_id,customer_name,phone,business_name,location,status,currency,subtotal,discount_total,vat_percent,vat_amount,delivery_charge,grand_total,valid_until,created_at,updated_at,sent_at,enquiries(reference_code)&order=created_at.desc');
      quotes=await expireOldSent(rows||[]);render();
    }catch(e){if(holder)holder.innerHTML=`<div class="quote-list-empty error"><b>Could not load quotations</b><span>${esc(e.message)}</span></div>`}
    finally{loading=false}
  }

  inject();document.addEventListener('yk-admin-authenticated',load);document.addEventListener('yk-quotation-saved',load);
  if(window.YKAdminAuth?.isAuthenticated?.())load();
})();