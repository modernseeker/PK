(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const money=v=>`Rs. ${Number(v||0).toLocaleString('en-NP',{maximumFractionDigits:0})}`;
  let loading=false;

  function token(){return window.YKAdminAuth?.getToken?.()||''}
  async function rest(path){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,Accept:'application/json'},cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw new Error(body?.message||`Request failed (${res.status})`);
    return body||[];
  }
  function metric(label,value,sub,cls=''){
    return `<article class="analytics-kpi ${cls}"><small>${label}</small><strong>${value}</strong><em>${sub}</em></article>`;
  }
  function install(){
    const nav=$('#sideNav');
    if(nav&&!nav.querySelector('[data-page="analytics"]')){
      const b=document.createElement('button');b.className='nav-item';b.dataset.page='analytics';b.innerHTML='<span>◩</span>Analytics';
      const settings=nav.querySelector('[data-page="settings"]');nav.insertBefore(b,settings||null);
      b.onclick=e=>{e.preventDefault();e.stopPropagation();showPage()};
    }
    if(!$('#page-analytics')){
      const page=document.createElement('section');page.className='page';page.id='page-analytics';page.innerHTML=`
        <div class="page-heading compact"><div><p class="eyebrow">BUSINESS INTELLIGENCE</p><h1>Executive Dashboard</h1><p>Sales, collections, conversion and pipeline health in one view.</p></div><button class="ghost-btn" id="analyticsRefresh">↻ Refresh</button></div>
        <div class="analytics-kpis" id="analyticsKpis"></div>
        <div class="analytics-grid">
          <article class="panel-card"><div class="panel-head"><div><h2>Sales Pipeline</h2><p>Where opportunities currently sit.</p></div></div><div class="analytics-pipeline" id="analyticsPipeline"></div></article>
          <article class="panel-card"><div class="panel-head"><div><h2>Cash & Receivables</h2><p>Collections and money still due.</p></div></div><div id="analyticsCash"></div></article>
          <article class="panel-card"><div class="panel-head"><div><h2>Top Products</h2><p>Ranked by confirmed order value.</p></div></div><div class="analytics-rank" id="analyticsProducts"></div></article>
          <article class="panel-card"><div class="panel-head"><div><h2>Top Customers</h2><p>Ranked by confirmed order value.</p></div></div><div class="analytics-rank" id="analyticsCustomers"></div></article>
        </div>`;
      $('.main-panel')?.appendChild(page);$('#analyticsRefresh').onclick=load;
    }
  }
  function showPage(){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    $('#page-analytics')?.classList.add('active');document.querySelector('[data-page="analytics"]')?.classList.add('active');
    if($('#pageTitle'))$('#pageTitle').textContent='Analytics';$('#sidebar')?.classList.remove('open');load();
  }
  function rank(rows,empty){
    if(!rows.length)return `<div class="analytics-empty">${empty}</div>`;
    return rows.map((r,i)=>`<div class="analytics-rank-row"><span class="analytics-rank-no">${i+1}</span><div class="analytics-rank-copy"><b>${r.name}</b><small>${r.meta}</small></div><strong class="analytics-rank-value">${money(r.value)}</strong></div>`).join('');
  }
  async function load(){
    if(loading||!window.YKAdminAuth?.isAuthenticated?.())return;loading=true;
    const btn=$('#analyticsRefresh');if(btn){btn.disabled=true;btn.textContent='Loading…'}
    try{
      const [enquiries,quotes,orders,items]=await Promise.all([
        rest('enquiries?select=id,status,created_at'),
        rest('quotations?select=id,status,grand_total,created_at'),
        rest('orders?select=id,customer_id,customer_name,status,payment_status,grand_total,amount_paid,balance_due,created_at'),
        rest('order_items?select=order_id,product_id,description,quantity,line_total')
      ]);
      const liveOrders=orders.filter(o=>o.status!=='cancelled');
      const sales=liveOrders.reduce((n,o)=>n+Number(o.grand_total||0),0);
      const collected=liveOrders.reduce((n,o)=>n+Number(o.amount_paid||0),0);
      const outstanding=liveOrders.reduce((n,o)=>n+Number(o.balance_due||0),0);
      const accepted=quotes.filter(q=>q.status==='accepted').length;
      const enquiryConversion=enquiries.length?Math.round(liveOrders.length/enquiries.length*100):0;
      const quoteWin=quotes.length?Math.round(accepted/quotes.length*100):0;
      $('#analyticsKpis').innerHTML=[
        metric('Sales Value',money(sales),`${liveOrders.length} confirmed orders`,'good'),
        metric('Collected',money(collected),sales?`${Math.round(collected/sales*100)}% of sales collected`:'No sales yet','good'),
        metric('Outstanding',money(outstanding),`${liveOrders.filter(o=>Number(o.balance_due)>0).length} orders with balance`,'warn'),
        metric('Enquiry → Order',`${enquiryConversion}%`,`${liveOrders.length} orders from ${enquiries.length} enquiries`),
        metric('Quote Win Rate',`${quoteWin}%`,`${accepted} accepted of ${quotes.length} quotes`)
      ].join('');

      const pipeline=[['New enquiries',enquiries.filter(x=>x.status==='new').length],['Contacted',enquiries.filter(x=>x.status==='contacted').length],['Quotes open',quotes.filter(x=>['draft','sent'].includes(x.status)).length],['Accepted',accepted],['Active orders',liveOrders.filter(x=>x.status!=='delivered').length],['Delivered',liveOrders.filter(x=>x.status==='delivered').length]];
      const max=Math.max(...pipeline.map(x=>x[1]),1);
      $('#analyticsPipeline').innerHTML=pipeline.map(([name,value])=>`<div class="analytics-pipe-row"><span>${name}</span><div><i style="width:${value?Math.max(7,value/max*100):0}%"></i></div><b>${value}</b></div>`).join('');

      const rate=sales?Math.round(collected/sales*100):0;
      $('#analyticsCash').innerHTML=`<div class="analytics-cash-main"><span>Collection rate</span><strong>${rate}%</strong></div><div class="analytics-cash-bar"><i style="width:${rate}%"></i></div><div class="analytics-cash-split"><div><small>Collected</small><b>${money(collected)}</b></div><div><small>Outstanding</small><b>${money(outstanding)}</b></div></div>`;

      const orderIds=new Set(liveOrders.map(o=>o.id)),productMap=new Map();
      items.filter(i=>orderIds.has(i.order_id)).forEach(i=>{const key=i.product_id||i.description,current=productMap.get(key)||{name:i.description||'Product',value:0,qty:0};current.value+=Number(i.line_total||0);current.qty+=Number(i.quantity||0);productMap.set(key,current)});
      const topProducts=[...productMap.values()].sort((a,b)=>b.value-a.value).slice(0,5).map(x=>({name:x.name,value:x.value,meta:`${x.qty} units`}));
      $('#analyticsProducts').innerHTML=rank(topProducts,'Product rankings will appear after the first order.');

      const customerMap=new Map();
      liveOrders.forEach(o=>{const key=o.customer_id||o.customer_name||'Customer',current=customerMap.get(key)||{name:o.customer_name||'Customer',value:0,count:0};current.value+=Number(o.grand_total||0);current.count+=1;customerMap.set(key,current)});
      const topCustomers=[...customerMap.values()].sort((a,b)=>b.value-a.value).slice(0,5).map(x=>({name:x.name,value:x.value,meta:`${x.count} order${x.count===1?'':'s'}`}));
      $('#analyticsCustomers').innerHTML=rank(topCustomers,'Customer rankings will appear after the first order.');
    }catch(err){
      console.error(err);if($('#analyticsKpis'))$('#analyticsKpis').innerHTML='<div class="analytics-empty analytics-error">Could not load analytics. Refresh and try again.</div>';
    }finally{loading=false;if(btn){btn.disabled=false;btn.textContent='↻ Refresh'}}
  }
  document.addEventListener('yk-admin-authenticated',()=>{install();load()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();