(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses=['confirmed','preparing','ready','delivered','cancelled'];
  let orders=[],filter='all',query='',loading=false;

  function token(){return window.YKAdminAuth?.getToken?.()||''}
  async function rest(path,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>null);if(!res.ok)throw new Error(body?.message||body?.hint||`Request failed (${res.status})`);return body;
  }
  const label=s=>String(s||'confirmed').replace(/^./,c=>c.toUpperCase());
  const money=v=>`Rs. ${Number(v||0).toLocaleString('en-NP',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-NP',{dateStyle:'medium'}).format(d)}
  function searchText(o){return `${o.order_number||''} ${o.customer_name||''} ${o.phone||''} ${o.business_name||''} ${o.location||''} ${o.status||''} ${o.payment_status||''} ${o.quotations?.quote_number||''} ${o.enquiries?.reference_code||''}`.toLowerCase()}
  function filtered(){return orders.filter(o=>(filter==='all'||o.status===filter)&&(!query||searchText(o).includes(query)))}

  function inject(){
    const nav=$('#sideNav');
    if(nav&&!$('.nav-item[data-page="orders"]')){
      const b=document.createElement('button');b.className='nav-item';b.dataset.page='orders';b.innerHTML='<span>▣</span>Orders <em id="orderNavBadge">0</em>';
      const settings=$('.nav-item[data-page="settings"]');if(settings)nav.insertBefore(b,settings);else nav.appendChild(b);b.onclick=showPage;
    }
    if(!$('#page-orders')){
      const page=document.createElement('section');page.className='page';page.id='page-orders';page.innerHTML=`
        <div class="page-heading compact order-page-heading"><div><p class="eyebrow">SALES FULFILMENT</p><h1>Orders</h1><p>Track confirmed sales, delivery progress and payment collection.</p></div><button class="ghost-btn" id="refreshOrders">↻ Refresh</button></div>
        <div class="order-stats">
          <article><small>Active orders</small><strong id="ordActive">0</strong><em>Not delivered/cancelled</em></article>
          <article><small>Ready</small><strong id="ordReady">0</strong><em>Waiting for dispatch</em></article>
          <article><small>Sales value</small><strong id="ordSales">Rs. 0</strong><em>All non-cancelled</em></article>
          <article><small>Outstanding</small><strong id="ordOutstanding">Rs. 0</strong><em>Balance to collect</em></article>
        </div>
        <div class="order-toolbar"><label class="search-box"><span>⌕</span><input id="orderSearch" type="search" placeholder="Search order, customer, phone or quotation"></label><select id="orderStatusFilter"><option value="all">All statuses</option>${statuses.map(s=>`<option value="${s}">${label(s)}</option>`).join('')}</select></div>
        <div class="order-card"><div class="order-meta"><span id="orderResultText">0 orders</span><small>Update fulfillment and payment directly below</small></div><div id="orderList" class="order-list"><div class="order-empty">Loading orders…</div></div></div>`;
      $('.main-panel').appendChild(page);
      $('#refreshOrders').onclick=load;$('#orderSearch').oninput=e=>{query=e.target.value.trim().toLowerCase();render()};$('#orderStatusFilter').onchange=e=>{filter=e.target.value;render()};
    }
  }

  function showPage(){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));$('#page-orders')?.classList.add('active');$('.nav-item[data-page="orders"]')?.classList.add('active');if($('#pageTitle'))$('#pageTitle').textContent='Orders';$('#sidebar')?.classList.remove('open');load()}

  function renderStats(){
    const active=orders.filter(o=>!['delivered','cancelled'].includes(o.status)).length,ready=orders.filter(o=>o.status==='ready').length,sales=orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+Number(o.grand_total||0),0),out=orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+Number(o.balance_due||0),0);
    if($('#ordActive'))$('#ordActive').textContent=active;if($('#ordReady'))$('#ordReady').textContent=ready;if($('#ordSales'))$('#ordSales').textContent=money(sales).replace('.00','');if($('#ordOutstanding'))$('#ordOutstanding').textContent=money(out).replace('.00','');const badge=$('#orderNavBadge');if(badge){badge.textContent=active;badge.hidden=!active;}
  }

  function render(){
    renderStats();const list=filtered(),holder=$('#orderList');if(!holder)return;if($('#orderResultText'))$('#orderResultText').textContent=`${list.length} order${list.length===1?'':'s'}`;
    if(!list.length){holder.innerHTML='<div class="order-empty"><b>No orders found.</b><span>Accepted quotations can be converted into orders from the Quotations page.</span></div>';return}
    holder.innerHTML=list.map(o=>`<article class="order-row" data-order="${esc(o.id)}">
      <div class="order-primary"><div><b>${esc(o.order_number)}</b><span class="order-status os-${esc(o.status)}">${esc(label(o.status))}</span></div><h3>${esc(o.customer_name||'Customer')}</h3><p>${esc(o.business_name||o.location||o.phone||'No contact details')}</p><small>${o.quotations?.quote_number?`Quote ${esc(o.quotations.quote_number)} · `:''}${o.enquiries?.reference_code?`Enquiry ${esc(o.enquiries.reference_code)} · `:''}Created ${esc(date(o.created_at))}</small></div>
      <div class="order-money"><small>ORDER TOTAL</small><strong>${money(o.grand_total)}</strong><span class="pay-${esc(o.payment_status)}">${esc(label(o.payment_status))} · Balance ${money(o.balance_due)}</span></div>
      <div class="order-controls">
        <label><span>Fulfillment</span><select data-order-status="${esc(o.id)}">${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${label(s)}</option>`).join('')}</select></label>
        <label><span>Amount paid</span><input data-order-paid="${esc(o.id)}" type="number" min="0" max="${Number(o.grand_total||0)}" step="0.01" value="${Number(o.amount_paid||0)}"></label>
        <label><span>Expected delivery</span><input data-order-delivery="${esc(o.id)}" type="date" value="${esc(String(o.expected_delivery||'').slice(0,10))}"></label>
      </div>
      <div class="order-actions"><button type="button" data-save-order="${esc(o.id)}">Save</button>${o.quotation_id?`<button type="button" class="secondary" data-view-quote="${esc(o.quotations?.quote_number||'')}">View quote</button>`:''}${o.phone?`<a target="_blank" rel="noopener" href="https://wa.me/${String(o.phone).replace(/\D/g,'').length===10?'977'+String(o.phone).replace(/\D/g,''):String(o.phone).replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${o.customer_name||''}, this is YK Electric regarding order ${o.order_number}.`)}">WhatsApp</a>`:''}</div>
    </article>`).join('');
    holder.querySelectorAll('[data-save-order]').forEach(b=>b.onclick=()=>saveRow(b.dataset.saveOrder,b));holder.querySelectorAll('[data-view-quote]').forEach(b=>b.onclick=()=>openQuoteSearch(b.dataset.viewQuote));
  }

  async function saveRow(id,button){
    const row=document.querySelector(`.order-row[data-order="${CSS.escape(id)}"]`),o=orders.find(x=>x.id===id);if(!row||!o)return;const status=row.querySelector('[data-order-status]').value,paid=Math.max(0,Number(row.querySelector('[data-order-paid]').value)||0),expected=row.querySelector('[data-order-delivery]').value||null;
    if(paid>Number(o.grand_total||0)){alert('Amount paid cannot exceed the order total.');return}
    const old=button.textContent;button.disabled=true;button.textContent='Saving…';
    try{await rest(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status,amount_paid:paid,expected_delivery:expected,updated_at:new Date().toISOString()})});await load(true)}catch(e){alert(e.message)}finally{button.disabled=false;button.textContent=old}
  }

  function openQuoteSearch(number){const nav=$('.nav-item[data-page="quotations"]');if(!nav)return;nav.click();setTimeout(()=>{const input=$('#quoteSearch');if(input){input.value=number;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}},250)}

  async function convertQuote(id,button){
    const old=button.textContent;button.disabled=true;button.textContent='Converting…';
    try{const result=await rest('rpc/convert_quotation_to_order',{method:'POST',body:JSON.stringify({p_quotation_id:id})});button.textContent=result?.existing?'Order exists':'Converted ✓';document.dispatchEvent(new CustomEvent('yk-order-created',{detail:result}));setTimeout(showPage,350)}catch(e){alert(e.message);button.disabled=false;button.textContent=old}
  }

  function enhanceQuotes(){
    document.querySelectorAll('.quote-list-row').forEach(row=>{
      const select=row.querySelector('[data-quote-status]'),actions=row.querySelector('.quote-list-actions');if(!select||!actions)return;const id=select.dataset.quoteStatus;
      let btn=actions.querySelector('[data-convert-order]');
      if(select.value==='accepted'){
        if(!btn){btn=document.createElement('button');btn.type='button';btn.className='order-convert-btn';btn.dataset.convertOrder=id;btn.textContent='Convert to Order';actions.prepend(btn);btn.onclick=()=>convertQuote(id,btn)}
      }else btn?.remove();
      if(!select.dataset.orderBound){select.dataset.orderBound='1';select.addEventListener('change',()=>setTimeout(enhanceQuotes,0))}
    })
  }

  async function load(silent=false){
    if(loading||!window.YKAdminAuth?.isAuthenticated?.())return;loading=true;const holder=$('#orderList');if(holder&&!silent)holder.innerHTML='<div class="order-empty">Loading orders…</div>';
    try{orders=await rest('orders?select=id,order_number,quotation_id,enquiry_id,customer_name,phone,business_name,location,status,payment_status,currency,subtotal,discount_total,vat_percent,vat_amount,delivery_charge,grand_total,amount_paid,balance_due,expected_delivery,notes,delivered_at,paid_at,created_at,updated_at,quotations(quote_number),enquiries(reference_code)&order=created_at.desc');render()}catch(e){if(holder)holder.innerHTML=`<div class="order-empty error"><b>Could not load orders</b><span>${esc(e.message)}</span></div>`}finally{loading=false}
  }

  inject();
  const qList=$('#quoteList');if(qList)new MutationObserver(enhanceQuotes).observe(qList,{childList:true,subtree:true});
  document.addEventListener('yk-admin-authenticated',()=>{load();setTimeout(enhanceQuotes,300)});document.addEventListener('yk-quotation-saved',()=>setTimeout(enhanceQuotes,150));document.addEventListener('yk-order-created',()=>load(true));
  setInterval(()=>{if(window.YKAdminAuth?.isAuthenticated?.())enhanceQuotes()},1500);
  if(window.YKAdminAuth?.isAuthenticated?.()){load();setTimeout(enhanceQuotes,300)}
})();
