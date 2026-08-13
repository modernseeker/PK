(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number=value=>Number(value||0);
  const money=value=>`Rs. ${number(value).toLocaleString('en-NP',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const day=value=>String(value||'').slice(0,10);
  const displayDate=value=>{
    if(!value)return '—';
    const date=new Date(`${day(value)}T00:00:00`);
    return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('en-NP',{day:'2-digit',month:'short',year:'numeric'}).format(date);
  };
  const partyName=(type,party)=>type==='customer'?(party.business_name||party.name):party.name;
  const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kathmandu'});

  function activeRows(rows){return rows.filter(row=>row.status!=='cancelled')}
  function linkedTransactions(state,type,party){
    const orders=type==='customer'?activeRows(state.orders).filter(row=>row.customer_id===party.id):activeRows(state.purchaseOrders).filter(row=>row.supplier_id===party.id);
    const orderIds=new Set(orders.map(row=>row.id));
    const openingIds=new Set(state.openings.filter(row=>row.counterparty_type===type&&(type==='customer'?row.customer_id:row.supplier_id)===party.id).map(row=>row.id));
    return state.transactions.filter(row=>(type==='customer'&&row.order_id&&orderIds.has(row.order_id))||(type==='supplier'&&row.purchase_order_id&&orderIds.has(row.purchase_order_id))||(row.opening_balance_id&&openingIds.has(row.opening_balance_id)));
  }
  function buildEntries(state,type,party){
    const entries=[];
    const openings=state.openings.filter(row=>row.counterparty_type===type&&(type==='customer'?row.customer_id:row.supplier_id)===party.id);
    const orders=type==='customer'?activeRows(state.orders).filter(row=>row.customer_id===party.id):activeRows(state.purchaseOrders).filter(row=>row.supplier_id===party.id);
    const transactions=linkedTransactions(state,type,party);
    openings.forEach(opening=>{
      entries.push({date:opening.as_of_date,createdAt:opening.created_at||opening.as_of_date,rank:0,kind:'opening',label:'Opening balance',reference:'Brought forward',increase:number(opening.original_amount),decrease:0,dueDate:opening.due_date,note:opening.note||''});
      const tracked=transactions.filter(row=>row.opening_balance_id===opening.id).reduce((sum,row)=>sum+number(row.amount),0);
      const carried=Math.max(0,number(opening.settled_amount)-tracked);
      if(carried>0)entries.push({date:opening.as_of_date,createdAt:opening.updated_at||opening.as_of_date,rank:1,kind:'adjustment',label:'Settlement already recorded',reference:'Opening adjustment',increase:0,decrease:carried,note:'Settled amount brought into YK before detailed transaction tracking.'});
    });
    orders.forEach(order=>{
      const reference=type==='customer'?order.order_number:order.po_number;
      const dateValue=type==='customer'?day(order.created_at):order.order_date;
      entries.push({date:dateValue,createdAt:order.created_at||dateValue,rank:0,kind:type==='customer'?'sale':'purchase',label:type==='customer'?'Sales invoice':'Purchase bill',reference,increase:number(order.grand_total),decrease:0,dueDate:type==='customer'?(order.payment_due_date||order.due_date):null,note:order.notes||''});
      const tracked=transactions.filter(row=>type==='customer'?row.order_id===order.id:row.purchase_order_id===order.id).reduce((sum,row)=>sum+number(row.amount),0);
      const carried=Math.max(0,number(order.amount_paid)-tracked);
      if(carried>0)entries.push({date:day(order.paid_at||order.received_at||order.created_at),createdAt:order.paid_at||order.received_at||order.created_at,rank:1,kind:'adjustment',label:'Payment already recorded',reference,increase:0,decrease:carried,note:'Payment amount existed before detailed cashbook tracking.'});
    });
    transactions.forEach(transaction=>{
      const account=state.accounts.find(row=>row.id===transaction.account_id);
      entries.push({date:transaction.transaction_date,createdAt:transaction.created_at||transaction.transaction_date,rank:2,kind:'payment',label:type==='customer'?'Collection received':'Supplier payment',reference:transaction.transaction_number||'Payment',increase:0,decrease:number(transaction.amount),note:[account?.name,transaction.note].filter(Boolean).join(' · ')});
    });
    entries.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||a.rank-b.rank||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    let running=0;
    return entries.map(entry=>{running+=entry.increase-entry.decrease;return{...entry,balance:Math.max(0,running)}});
  }
  function summarizeParty(state,type,party){
    const openings=state.openings.filter(row=>row.counterparty_type===type&&(type==='customer'?row.customer_id:row.supplier_id)===party.id);
    const orders=type==='customer'?activeRows(state.orders).filter(row=>row.customer_id===party.id):activeRows(state.purchaseOrders).filter(row=>row.supplier_id===party.id);
    const openingDue=openings.reduce((sum,row)=>sum+number(row.balance_due),0);
    const tradingDue=orders.reduce((sum,row)=>sum+number(row.balance_due),0);
    const gross=orders.reduce((sum,row)=>sum+number(row.grand_total),0);
    const due=openingDue+tradingDue;
    const overdueOpenings=openings.filter(row=>row.due_date&&row.due_date<today()).reduce((sum,row)=>sum+number(row.balance_due),0);
    const overdueOrders=type==='customer'?orders.filter(row=>{
      const dueDate=row.payment_due_date||row.due_date;
      return dueDate&&dueDate<today();
    }).reduce((sum,row)=>sum+number(row.balance_due),0):0;
    const entries=buildEntries(state,type,party);
    const last=entries.at(-1)?.date||party.updated_at||party.created_at||'';
    return{type,party,openings,orders,entries,openingDue,tradingDue,gross,due,overdue:overdueOpenings+overdueOrders,last};
  }

  window.YKPartyLedgerModel={buildEntries,summarizeParty};
  if(typeof document==='undefined')return;

  let state={customers:[],suppliers:[],orders:[],purchaseOrders:[],openings:[],transactions:[],accounts:[]};
  let type='customer',query='',selectedId='',loading=false;

  function token(){return window.YKAdminAuth?.getToken?.()||''}
  async function rest(path){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,Accept:'application/json'},cache:'no-store'});
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(body?.message||body?.hint||`Request failed (${response.status})`);
    return body||[];
  }
  async function restAll(path,pageSize=1000){
    const rows=[];let offset=0;
    while(true){
      const join=path.includes('?')?'&':'?';
      const page=await rest(`${path}${join}limit=${pageSize}&offset=${offset}`);
      rows.push(...page);if(page.length<pageSize)break;offset+=pageSize;
    }
    return rows;
  }
  function inject(){
    const nav=$('#sideNav');
    if(nav&&!nav.querySelector('[data-page="party-ledgers"]')){
      const button=document.createElement('button');
      button.className='nav-item';button.dataset.page='party-ledgers';button.innerHTML='<span>☷</span>Party Ledgers';
      const opening=nav.querySelector('[data-page="opening-balances"]'),finance=nav.querySelector('[data-page="finance"]'),settings=nav.querySelector('[data-page="settings"]');
      nav.insertBefore(button,opening||finance||settings||null);button.onclick=show;
    }
    if(!$('#page-party-ledgers')){
      const page=document.createElement('section');page.className='page';page.id='page-party-ledgers';
      page.innerHTML=`<div class="page-heading compact"><div><p class="eyebrow">ACCOUNTS RECEIVABLE & PAYABLE</p><h1>Party Ledgers</h1><p>Complete statements for every customer and supplier from opening balance to payment.</p></div><button class="ghost-btn" id="ledgerRefresh">↻ Refresh</button></div><div class="ledger-stats"><article><small>Customer Receivable</small><strong id="ledgerReceivable">Rs. 0</strong></article><article><small>Customer Overdue</small><strong id="ledgerCustomerOverdue">Rs. 0</strong></article><article><small>Supplier Payable</small><strong id="ledgerPayable">Rs. 0</strong></article><article><small>Supplier Overdue</small><strong id="ledgerSupplierOverdue">Rs. 0</strong></article></div><div class="ledger-toolbar"><div class="ledger-tabs"><button class="active" data-ledger-type="customer">Customer ledgers</button><button data-ledger-type="supplier">Supplier ledgers</button></div><label class="search-box"><span>⌕</span><input id="ledgerSearch" type="search" placeholder="Search customer, supplier, phone or location"></label></div><div class="ledger-layout"><section class="ledger-party-card"><div class="ledger-party-head"><div><b id="ledgerPartyTitle">Customers</b><small id="ledgerPartyCount">0 parties</small></div><span>Outstanding first</span></div><div id="ledgerPartyList" class="ledger-party-list"><div class="ledger-empty">Loading ledgers…</div></div></section><aside id="ledgerDetail" class="ledger-detail"><div class="ledger-empty"><b>Select a party</b><span>The full statement will appear here.</span></div></aside></div>`;
      $('.main-panel')?.appendChild(page);
      $('#ledgerRefresh').onclick=load;
      $('#ledgerSearch').oninput=event=>{query=event.target.value.trim().toLowerCase();renderList()};
      page.querySelectorAll('[data-ledger-type]').forEach(button=>button.onclick=()=>{type=button.dataset.ledgerType;selectedId='';page.querySelectorAll('[data-ledger-type]').forEach(item=>item.classList.toggle('active',item===button));render()});
    }
  }
  function show(){
    inject();document.querySelectorAll('.page').forEach(page=>page.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
    $('#page-party-ledgers')?.classList.add('active');document.querySelector('[data-page="party-ledgers"]')?.classList.add('active');if($('#pageTitle'))$('#pageTitle').textContent='Party Ledgers';$('#sidebar')?.classList.remove('open');load();
  }
  function allSummaries(forType=type){return(forType==='customer'?state.customers:state.suppliers).map(party=>summarizeParty(state,forType,party))}
  function filtered(){
    return allSummaries().filter(item=>!query||`${partyName(type,item.party)} ${item.party.name||''} ${item.party.phone||''} ${item.party.location||item.party.address||''}`.toLowerCase().includes(query)).sort((a,b)=>b.due-a.due||String(b.last).localeCompare(String(a.last))||partyName(type,a.party).localeCompare(partyName(type,b.party)));
  }
  function renderStats(){
    const customer=allSummaries('customer'),supplier=allSummaries('supplier');
    $('#ledgerReceivable').textContent=money(customer.reduce((sum,item)=>sum+item.due,0));
    $('#ledgerCustomerOverdue').textContent=money(customer.reduce((sum,item)=>sum+item.overdue,0));
    $('#ledgerPayable').textContent=money(supplier.reduce((sum,item)=>sum+item.due,0));
    $('#ledgerSupplierOverdue').textContent=money(supplier.reduce((sum,item)=>sum+item.overdue,0));
  }
  function renderList(){
    renderStats();const rows=filtered(),holder=$('#ledgerPartyList');if(!holder)return;
    $('#ledgerPartyTitle').textContent=type==='customer'?'Customers':'Suppliers';$('#ledgerPartyCount').textContent=`${rows.length} part${rows.length===1?'y':'ies'}`;
    if(!rows.length){holder.innerHTML=`<div class="ledger-empty"><b>No ${type==='customer'?'customers':'suppliers'} found.</b><span>Add or import parties first.</span></div>`;renderDetail();return}
    holder.innerHTML=rows.map(item=>`<button class="ledger-party-row ${selectedId===item.party.id?'selected':''}" data-ledger-party="${item.party.id}"><div class="ledger-party-name"><b>${esc(partyName(type,item.party))}</b><small>${esc(type==='customer'&&item.party.business_name?item.party.name:'')}${item.party.phone?`${type==='customer'&&item.party.business_name?' · ':''}${esc(item.party.phone)}`:''}</small></div><div class="ledger-party-due"><small>${type==='customer'?'RECEIVABLE':'PAYABLE'}</small><b class="${item.due>0?'due':''}">${money(item.due)}</b>${item.overdue>0?`<em>${money(item.overdue)} overdue</em>`:'<em>Nothing overdue</em>'}</div></button>`).join('');
    holder.querySelectorAll('[data-ledger-party]').forEach(button=>button.onclick=()=>{selectedId=button.dataset.ledgerParty;renderList();renderDetail()});
    if(selectedId&&!rows.some(item=>item.party.id===selectedId)){selectedId='';renderDetail()}
  }
  function selected(){const party=(type==='customer'?state.customers:state.suppliers).find(row=>row.id===selectedId);return party?summarizeParty(state,type,party):null}
  function renderDetail(){
    const holder=$('#ledgerDetail'),item=selected();if(!holder)return;
    if(!item){holder.innerHTML='<div class="ledger-empty"><b>Select a party</b><span>The complete debit and payment statement will appear here.</span></div>';return}
    const label=partyName(type,item.party),payments=item.entries.reduce((sum,row)=>sum+row.decrease,0),grossOpening=item.openings.reduce((sum,row)=>sum+number(row.original_amount),0),grossActivity=item.gross;
    holder.innerHTML=`<div class="ledger-detail-head"><div><small>${type==='customer'?'CUSTOMER STATEMENT':'SUPPLIER STATEMENT'}</small><h2>${esc(label)}</h2><p>${esc(item.party.phone||'')}${item.party.location||item.party.address?` · ${esc(item.party.location||item.party.address)}`:''}</p></div><div class="ledger-detail-actions"><button id="ledgerPrint">Print statement</button><button class="primary" id="ledgerPayment">${type==='customer'?'Receive payment':'Pay supplier'}</button></div></div><div class="ledger-detail-kpis"><div><small>Opening</small><b>${money(grossOpening)}</b></div><div><small>${type==='customer'?'Sales':'Purchases'}</small><b>${money(grossActivity)}</b></div><div><small>Payments</small><b>${money(payments)}</b></div><div class="balance"><small>Balance due</small><b>${money(item.due)}</b></div></div><div class="ledger-statement-head"><div><b>Account statement</b><small>${item.entries.length} transaction${item.entries.length===1?'':'s'} · oldest first</small></div><button id="ledgerOpening">Opening balance</button></div><div class="ledger-table-scroll"><table class="ledger-table"><thead><tr><th>Date</th><th>Particulars</th><th>Reference</th><th>Due / Bill</th><th>Payment</th><th>Balance</th></tr></thead><tbody>${item.entries.length?item.entries.map(row=>`<tr><td>${displayDate(row.date)}</td><td><b>${esc(row.label)}</b><small>${esc(row.note||'')}</small></td><td><span class="ledger-kind ${row.kind}">${esc(row.reference)}</span></td><td>${row.increase?money(row.increase):'—'}</td><td class="paid">${row.decrease?money(row.decrease):'—'}</td><td><b>${money(row.balance)}</b></td></tr>`).join(''):'<tr><td colspan="6"><div class="ledger-empty">No ledger activity yet.</div></td></tr>'}</tbody></table></div><div class="ledger-balance-foot"><span>Current ${type==='customer'?'receivable':'payable'}</span><strong>${money(item.due)}</strong></div>`;
    $('#ledgerPrint').onclick=()=>printStatement(item);
    $('#ledgerOpening').onclick=()=>window.YKOpeningBalances?.show?.();
    $('#ledgerPayment').onclick=()=>{
      const action=type==='customer'?'collection':'supplier-payment';let opened=false;
      const open=()=>{if(opened)return;opened=true;window.YKFinanceActions?.open?.(action)};
      document.addEventListener('yk-finance-loaded',open,{once:true});window.YKFinance?.show?.();setTimeout(open,1200);
    };
  }
  function printStatement(item){
    const name=partyName(type,item.party),rows=item.entries.map(row=>`<tr><td>${displayDate(row.date)}</td><td><b>${esc(row.label)}</b><small>${esc(row.note||'')}</small></td><td>${esc(row.reference)}</td><td>${row.increase?money(row.increase):'—'}</td><td>${row.decrease?money(row.decrease):'—'}</td><td><b>${money(row.balance)}</b></td></tr>`).join('');
    const popup=window.open('','_blank');if(!popup)return alert('Allow pop-ups to print the statement.');popup.opener=null;
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} · YK Ledger</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#14283d;font:11px Arial,sans-serif}.head{display:flex;justify-content:space-between;border-bottom:3px solid #126ed8;padding-bottom:14px}.head h1{margin:0 0 5px;font-size:20px}.head p,.meta p{margin:3px 0;color:#637588}.meta{text-align:right}.party{margin:22px 0 14px}.party h2{margin:0 0 5px;font-size:18px}.party p{margin:0;color:#637588}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}.summary div{border:1px solid #dbe4ec;border-radius:8px;padding:9px}.summary small{display:block;color:#718294;font-weight:700}.summary b{display:block;margin-top:4px}table{width:100%;border-collapse:collapse}th{background:#102b46;color:#fff;text-align:left;padding:7px;font-size:9px}td{border-bottom:1px solid #e2e8ee;padding:8px 7px;vertical-align:top}td:nth-last-child(-n+3),th:nth-last-child(-n+3){text-align:right}td small{display:block;color:#728296;margin-top:3px}.total{display:flex;justify-content:flex-end;gap:28px;border-top:2px solid #102b46;margin-top:14px;padding-top:10px;font-size:14px}.foot{display:flex;justify-content:space-between;margin-top:30px;padding-top:10px;border-top:1px solid #dbe4ec;color:#718294}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="head"><div><h1>YK Electric & Electronic</h1><p>Butwal, Nepal</p><p>Party Account Statement</p></div><div class="meta"><b>${type==='customer'?'CUSTOMER LEDGER':'SUPPLIER LEDGER'}</b><p>Printed ${displayDate(today())}</p></div></div><div class="party"><h2>${esc(name)}</h2><p>${esc(item.party.phone||'')}${item.party.location||item.party.address?` · ${esc(item.party.location||item.party.address)}`:''}</p></div><div class="summary"><div><small>Opening due</small><b>${money(item.openingDue)}</b></div><div><small>${type==='customer'?'Sales':'Purchases'}</small><b>${money(item.gross)}</b></div><div><small>Overdue</small><b>${money(item.overdue)}</b></div><div><small>Balance due</small><b>${money(item.due)}</b></div></div><table><thead><tr><th>Date</th><th>Particulars</th><th>Reference</th><th>Due / Bill</th><th>Payment</th><th>Balance</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No activity</td></tr>'}</tbody></table><div class="total"><span>Balance due</span><b>${money(item.due)}</b></div><div class="foot"><span>Generated by YK Electric Admin</span><span>This is an account statement, not a tax invoice.</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);popup.document.close();
  }
  function render(){renderStats();renderList();renderDetail()}
  async function load(silent=false){
    if(loading||!window.YKAdminAuth?.isAuthenticated?.())return;loading=true;const holder=$('#ledgerPartyList');if(holder&&!silent)holder.innerHTML='<div class="ledger-empty">Loading ledgers…</div>';
    try{
      const result=await Promise.all([
        restAll('customers?select=id,name,business_name,phone,location,created_at,updated_at&order=name.asc'),
        restAll('suppliers?select=id,name,contact_person,phone,address,created_at,updated_at&active=eq.true&order=name.asc'),
        restAll('orders?select=id,order_number,customer_id,status,grand_total,amount_paid,balance_due,payment_due_date,due_date,paid_at,notes,created_at&order=created_at.asc'),
        restAll('purchase_orders?select=id,po_number,supplier_id,status,grand_total,amount_paid,balance_due,order_date,expected_delivery,received_at,notes,created_at&order=order_date.asc'),
        restAll('opening_balances?select=id,counterparty_type,customer_id,supplier_id,original_amount,settled_amount,balance_due,as_of_date,due_date,note,created_at,updated_at&order=as_of_date.asc'),
        restAll('cash_transactions?select=id,transaction_number,account_id,direction,transaction_type,amount,order_id,purchase_order_id,opening_balance_id,note,transaction_date,created_at&order=transaction_date.asc,created_at.asc'),
        restAll('financial_accounts?select=id,name,account_type&order=created_at.asc')
      ]);
      state={customers:result[0],suppliers:result[1],orders:result[2],purchaseOrders:result[3],openings:result[4],transactions:result[5],accounts:result[6]};render();
    }catch(error){if(holder)holder.innerHTML=`<div class="ledger-empty error"><b>Could not load Party Ledgers</b><span>${esc(error.message)}</span></div>`}
    finally{loading=false}
  }
  inject();window.YKPartyLedgers={show,load,getState:()=>state};
  document.addEventListener('yk-admin-authenticated',load);document.addEventListener('yk-finance-changed',()=>load(true));document.addEventListener('yk-opening-balances-changed',()=>load(true));document.addEventListener('yk-order-created',()=>load(true));document.addEventListener('yk-po-saved',()=>load(true));
  if(window.YKAdminAuth?.isAuthenticated?.())load();
})();
