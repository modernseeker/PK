(()=>{
  const KEY='yk_admin_state_v1';
  const DIRTY_KEY='yk_admin_dirty_v1';
  const categories=[
    {name:'Wires & Cables',icon:'〰'},
    {name:'Protection',icon:'⚡'},
    {name:'Control & Panel',icon:'▦'},
    {name:'Automation',icon:'⌁'},
    {name:'Capacitors',icon:'◫'},
    {name:'Motors & Pumps',icon:'◉'},
    {name:'Bearings & Spares',icon:'⊙'},
    {name:'Lighting & Electronics',icon:'✦'}
  ];
  const seedBrands=['CHINT','Selec','Lotus','Tibcon','Litmus','Delixi','Industrial','Repair Spares'];
  const seedProducts=[
    [1,'Lotus','Enamel Copper Winding Wire','Super Enamel','Motor & transformer rewinding','Wires & Cables','Popular','../assets/product-wire.svg'],
    [2,'Lotus','Submersible Winding Wire','PVC / Poly','Submersible motor use','Wires & Cables','Workshop','../assets/product-wire.svg'],
    [3,'Litmus','House Wiring Cable','Building Wire','Residential & commercial','Wires & Cables','Best Seller','../assets/product-wire.svg'],
    [4,'CHINT','Miniature Circuit Breaker (MCB)','NB1 Series','6A–63A • SP/DP','Protection','Top Pick','../assets/product-breaker.svg'],
    [5,'CHINT','Moulded Case Circuit Breaker (MCCB)','NM8','100A–250A • 3P/4P','Protection','Industrial','../assets/product-breaker.svg'],
    [6,'CHINT','RCCB / RCBO','NXBLE / NL1','Leakage protection','Protection','Safety','../assets/product-breaker.svg'],
    [7,'CHINT','Surge Protection Device','NU6','Panel surge safety','Protection','Protection','../assets/product-breaker.svg'],
    [8,'CHINT','AC Contactor','NC1','9A–40A • 220V coil','Control & Panel','Best Seller','../assets/product-contactor.svg'],
    [9,'CHINT','Thermal Overload Relay','NR2','Adjustable motor protection','Control & Panel','Panel','../assets/product-contactor.svg'],
    [10,'Industrial','Push Button NO / NC','22mm','Start / Stop / Reset','Control & Panel','Essential','../assets/product-contactor.svg'],
    [11,'Industrial','Terminal Blocks','DIN Rail','Panel wiring accessory','Control & Panel','Panel','../assets/product-contactor.svg'],
    [12,'Selec','Digital Timer','800 Series','Delay / cyclic control','Automation','Automation','../assets/product-automation.svg'],
    [13,'Selec','Temperature Controller','TC544AX','PID temperature control','Automation','Smart Control','../assets/product-automation.svg'],
    [14,'Industrial','Proximity Sensor','PNP / NPN','Inductive sensing','Automation','Sensor','../assets/product-automation.svg'],
    [15,'Industrial','Variable Frequency Drive (VFD)','Motor Drive','Speed control','Automation','Industrial','../assets/product-automation.svg'],
    [16,'Tibcon','Motor Run Capacitor','CBB60','Fan / pump / motor','Capacitors','Popular','../assets/product-capacitor.svg'],
    [17,'Tibcon','Submersible Capacitor','Control Box Type','Submersible pump use','Capacitors','Repair','../assets/product-capacitor.svg'],
    [18,'Tibcon','Power Factor Capacitor','PFC Type','Industrial correction','Capacitors','Industrial','../assets/product-capacitor.svg'],
    [19,'Industrial','Water Pump','Domestic / Commercial','Water transfer','Motors & Pumps','Utility','../assets/product-motor.svg'],
    [20,'Industrial','Submersible Motor','Water System','Borewell / water use','Motors & Pumps','Pumping','../assets/product-motor.svg'],
    [21,'Repair Spares','6204 Bearing','Deep Groove','Motor & machinery use','Bearings & Spares','Common Size','../assets/product-bearing.svg'],
    [22,'Repair Spares','Mechanical Seal','Pump Seal','Pump maintenance','Bearings & Spares','Repair','../assets/product-bearing.svg'],
    [23,'Lighting','LED Flood Light','Outdoor Series','Outdoor / industrial','Lighting & Electronics','Lighting','../assets/product-light.svg'],
    [24,'Lighting','LED Driver / Power Supply','Replacement Unit','LED support accessory','Lighting & Electronics','Electronic','../assets/product-light.svg']
  ].map(([id,brand,name,model,spec,cat,badge,img])=>({
    id,brand,name,model,spec,cat,badge,img,
    price:'Price on request',stock:'Check Stock',featured:[4,8,16,1].includes(id),
    desc:'',code:`YK-${String(id).padStart(3,'0')}`,
    stockQuantity:0,reorderLevel:0,costPrice:0,stockUnit:'pcs',trackInventory:false
  }));

  const defaultState=()=>({
    products:seedProducts,
    brands:[...seedBrands],
    settings:{businessName:'YK Electric & Electronic',location:'Butwal, Nepal',phone:'9747359443',whatsapp:'9747359443',email:'ykelectricnepal@gmail.com'}
  });

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const safeImg=v=>{
    const s=String(v||'').trim();
    if(/^https?:\/\//i.test(s)||/^\.\.\//.test(s)||/^\.\//.test(s)||/^assets\//.test(s)) return s;
    return '../assets/product-breaker.svg';
  };
  const clone=o=>JSON.parse(JSON.stringify(o));
  const normalizeProduct=p=>({stockQuantity:0,reorderLevel:0,costPrice:0,stockUnit:'pcs',trackInventory:false,...p});

  function loadState(){
    try{
      const parsed=JSON.parse(localStorage.getItem(KEY)||'null');
      if(parsed&&Array.isArray(parsed.products)&&Array.isArray(parsed.brands)) return {...parsed,products:parsed.products.map(normalizeProduct)};
    }catch(e){}
    return defaultState();
  }
  let state=loadState();

  function saveState(){
    localStorage.setItem(KEY,JSON.stringify(state));
    localStorage.setItem(DIRTY_KEY,'1');
    renderAll();
    document.dispatchEvent(new CustomEvent('yk-admin-draft-changed'));
  }

  let toastTimer;
  function toast(message){
    const el=$('#toast');
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
  }

  function gotoPage(name){
    $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${name}`));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
    const label={dashboard:'Dashboard',products:'Products',categories:'Categories',brands:'Brands',homepage:'Homepage',settings:'Settings'}[name]||'Admin';
    $('#pageTitle').textContent=label;
    $('#sidebar').classList.remove('open');
    if(name==='settings') fillSettings();
  }

  function productCountByCategory(name){return state.products.filter(p=>p.cat===name).length}

  function renderStats(){
    $('#statProducts').textContent=state.products.length;
    $('#statBrands').textContent=state.brands.length;
    $('#statCategories').textContent=categories.length;
    $('#statTrending').textContent=state.products.filter(p=>p.featured).length;
  }

  function renderDashboardTrending(){
    const list=state.products.filter(p=>p.featured).slice(0,4);
    $('#dashboardTrending').innerHTML=list.length?list.map(p=>`<div class="mini-product"><img src="${esc(safeImg(p.img))}" alt=""><div><b>${esc(p.name)}</b><span>${esc(p.brand)} · ${esc(p.model)}</span></div><em>${esc(p.badge||'Trending')}</em></div>`).join(''):'<p style="font-size:9px;color:#728196">No trending products selected.</p>';
  }

  function fillSelects(){
    const catFilter=$('#categoryFilter');
    const current=catFilter.value;
    catFilter.innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${esc(c.name)}</option>`).join('');
    catFilter.value=current;
    const formCat=$('#productForm [name="cat"]');
    formCat.innerHTML=categories.map(c=>`<option>${esc(c.name)}</option>`).join('');
    $('#brandOptions').innerHTML=state.brands.map(b=>`<option value="${esc(b)}"></option>`).join('');
  }

  function statusClass(stock){
    return stock==='In Stock'?'in':stock==='Out of Stock'?'out':'check';
  }

  function catalogChecks(product){
    const price=String(product.price||'').trim().toLowerCase();
    const image=String(product.img||'').trim();
    const checks={
      price:!!price&&!['price on request','contact for price','ask for price'].includes(price),
      image:/^https?:\/\//i.test(image),
      stock:product.trackInventory===true||String(product.stock||'')!=='Check Stock',
      description:String(product.desc||'').trim().length>=20
    };
    const complete=Object.values(checks).filter(Boolean).length;
    return {...checks,complete,total:4,ready:complete===4};
  }

  function renderCatalogReadiness(){
    const total=Math.max(state.products.length,1);
    const rows=state.products.map(product=>({product,checks:catalogChecks(product)}));
    const metric=(key,label)=>{
      const count=rows.filter(row=>row.checks[key]).length;
      const percent=Math.round(count/total*100);
      return `<div class="readiness-bar"><span><b>${label}</b><em>${count}/${state.products.length}</em></span><i><u style="width:${percent}%"></u></i></div>`;
    };
    const finished=rows.reduce((sum,row)=>sum+row.checks.complete,0);
    const score=Math.round(finished/(total*4)*100);
    const attention=rows.filter(row=>!row.checks.ready).sort((a,b)=>a.checks.complete-b.checks.complete||a.product.name.localeCompare(b.product.name));
    const scoreEl=$('#readinessScore');
    if(scoreEl)scoreEl.style.setProperty('--score',`${score}%`);
    if($('#catalogScore'))$('#catalogScore').textContent=`${score}%`;
    if($('#catalogReadinessCopy'))$('#catalogReadinessCopy').textContent=attention.length?`${attention.length} product${attention.length===1?' needs':'s need'} attention before the catalog is sales ready.`:'Every active product has a price, real photo, confirmed stock and useful description.';
    if($('#catalogReadinessBars'))$('#catalogReadinessBars').innerHTML=[metric('price','Customer price'),metric('image','Real product photo'),metric('stock','Confirmed stock'),metric('description','Useful description')].join('');
    if($('#catalogAttentionCount'))$('#catalogAttentionCount').textContent=`${attention.length} product${attention.length===1?'':'s'}`;
    if($('#catalogAttentionList'))$('#catalogAttentionList').innerHTML=attention.slice(0,4).map(({product,checks})=>{
      const missing=[!checks.price&&'price',!checks.image&&'photo',!checks.stock&&'stock',!checks.description&&'description'].filter(Boolean);
      return `<button type="button" data-readiness-edit="${product.id}"><span>${esc(product.name)}</span><small>Add ${esc(missing.join(', '))}</small><b>${checks.complete}/4</b></button>`;
    }).join('')||'<div class="readiness-complete">✓ Catalog launch checklist complete.</div>';
    $$('[data-readiness-edit]').forEach(button=>button.onclick=()=>openProductModal(Number(button.dataset.readinessEdit)));
  }

  function renderProducts(){
    const q=$('#productSearch').value.trim().toLowerCase();
    const cat=$('#categoryFilter').value;
    const stock=$('#stockFilter').value;
    const readiness=$('#readinessFilter').value;
    const rows=state.products.filter(p=>{
      const hay=`${p.name} ${p.brand} ${p.model} ${p.spec} ${p.cat}`.toLowerCase();
      const checks=catalogChecks(p);
      return (!q||hay.includes(q))&&(!cat||p.cat===cat)&&(!stock||p.stock===stock)&&(!readiness||(readiness==='ready'?checks.ready:!checks.ready));
    });
    $('#productCountText').textContent=`${rows.length} product${rows.length===1?'':'s'}`;
    $('#productTableBody').innerHTML=rows.map(p=>{const readiness=catalogChecks(p);return `<tr>
      <td><div class="product-cell"><img src="${esc(safeImg(p.img))}" alt=""><div><b>${esc(p.name)}</b><span>${esc(p.model||'No model')} · ${esc(p.spec||'No specification')}</span></div></div></td>
      <td>${esc(p.brand)}</td>
      <td>${esc(p.cat)}</td>
      <td>${esc(p.price||'Price on request')}</td>
      <td><span class="status-pill ${statusClass(p.stock)}">${esc(p.stock)}</span>${p.trackInventory?`<small class="stock-quantity">${Number(p.stockQuantity||0)} ${esc(p.stockUnit||'pcs')}</small>`:''}</td>
      <td><span class="readiness-pill ${readiness.ready?'ready':'attention'}">${readiness.ready?'Sales ready':`${readiness.complete}/4 complete`}</span></td>
      <td>${p.featured?'<span class="trend-pill">Trending</span>':'—'}</td>
      <td><div class="row-actions"><button class="icon-btn" data-edit="${p.id}" title="Edit">✎</button><button class="icon-btn delete" data-delete="${p.id}" title="Delete">×</button></div></td>
    </tr>`}).join('');
    $$('[data-edit]').forEach(b=>b.onclick=()=>openProductModal(Number(b.dataset.edit)));
    $$('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(Number(b.dataset.delete)));
  }

  function renderCategories(){
    $('#categoryCards').innerHTML=categories.map(c=>`<article class="category-admin-card"><div class="cat-icon">${c.icon}</div><h3>${esc(c.name)}</h3><p>Products assigned to this storefront category.</p><strong>${productCountByCategory(c.name)} products</strong></article>`).join('');
  }

  function renderBrands(){
    $('#brandCards').innerHTML=state.brands.map(b=>{
      const count=state.products.filter(p=>p.brand.toLowerCase()===b.toLowerCase()).length;
      return `<article class="brand-admin-card"><div class="brand-mark">${esc(b)}</div><footer><span>${count} product${count===1?'':'s'}</span><button class="small-delete" data-delete-brand="${esc(b)}">Remove</button></footer></article>`;
    }).join('');
    $$('[data-delete-brand]').forEach(b=>b.onclick=()=>removeBrand(b.dataset.deleteBrand));
  }

  function renderTrending(){
    const selectedCount=state.products.filter(p=>p.featured).length;
    $('#trendingCounter').textContent=`${selectedCount} / 4`;
    $('#trendingSelector').innerHTML=state.products.map(p=>`<div class="trend-option ${p.featured?'active':''}"><img src="${esc(safeImg(p.img))}" alt=""><div><b>${esc(p.name)}</b><span>${esc(p.brand)} · ${esc(p.cat)}</span></div><button class="trend-toggle" data-trend="${p.id}" aria-label="Toggle trending"></button></div>`).join('');
    $$('[data-trend]').forEach(b=>b.onclick=()=>toggleTrending(Number(b.dataset.trend)));
  }

  function renderAll(){
    renderStats();
    fillSelects();
    renderDashboardTrending();
    renderProducts();
    renderCategories();
    renderBrands();
    renderTrending();
    renderCatalogReadiness();
  }

  function openProductModal(id=null){
    const form=$('#productForm');
    form.reset();
    form.elements.id.value='';
    $('#modalTitle').textContent=id?'Edit Product':'Add Product';
    if(id){
      const p=state.products.find(x=>x.id===id);
      if(!p)return;
      Object.keys(p).forEach(k=>{
        const el=form.elements[k];
        if(!el)return;
        if(el.type==='checkbox')el.checked=!!p[k]; else el.value=p[k]??'';
      });
    }else{
      form.elements.stock.value='Check Stock';
      form.elements.price.value='Price on request';
    }
    $('#productModal').hidden=false;
    setTimeout(()=>form.elements.name.focus(),30);
  }

  function closeProductModal(){ $('#productModal').hidden=true }

  function saveProduct(event){
    event.preventDefault();
    const fd=new FormData(event.currentTarget);
    const id=Number(fd.get('id'))||null;
    const previous=id?state.products.find(p=>p.id===id)||{}:{};
    const item={
      id:id||Math.max(0,...state.products.map(p=>p.id))+1,
      name:String(fd.get('name')||'').trim(),brand:String(fd.get('brand')||'').trim(),cat:String(fd.get('cat')||'').trim(),
      model:String(fd.get('model')||'').trim(),spec:String(fd.get('spec')||'').trim(),price:String(fd.get('price')||'Price on request').trim(),
      stock:String(fd.get('stock')||'Check Stock'),badge:String(fd.get('badge')||'').trim(),img:String(fd.get('img')||'../assets/product-breaker.svg').trim(),
      desc:String(fd.get('desc')||'').trim(),featured:fd.get('featured')==='on',code:id?(previous.code||`YK-${id}`):`YK-ADM-${Date.now().toString().slice(-6)}`,
      stockQuantity:Number(previous.stockQuantity||0),reorderLevel:Number(previous.reorderLevel||0),costPrice:Number(previous.costPrice||0),stockUnit:previous.stockUnit||'pcs',trackInventory:previous.trackInventory===true
    };
    if(item.featured&&!state.products.find(p=>p.id===id)?.featured&&state.products.filter(p=>p.featured).length>=4){
      item.featured=false;
      toast('Saved, but Trending is already limited to 4 products.');
    }
    if(!state.brands.some(b=>b.toLowerCase()===item.brand.toLowerCase())) state.brands.push(item.brand);
    if(id){
      const i=state.products.findIndex(p=>p.id===id);
      state.products[i]=item;
    }else state.products.unshift(item);
    closeProductModal();
    saveState();
    if(!item.featured||state.products.filter(p=>p.featured).length<=4)toast(id?'Product updated':'Product added');
  }

  function deleteProduct(id){
    const p=state.products.find(x=>x.id===id);
    if(!p)return;
    if(!confirm(`Delete “${p.name}”?`))return;
    state.products=state.products.filter(x=>x.id!==id);
    saveState();
    toast('Product deleted');
  }

  function toggleTrending(id){
    const p=state.products.find(x=>x.id===id);
    if(!p)return;
    if(!p.featured&&state.products.filter(x=>x.featured).length>=4){toast('Maximum 4 Trending products. Turn one off first.');return}
    p.featured=!p.featured;
    saveState();
    toast(p.featured?'Added to Trending':'Removed from Trending');
  }

  function addBrand(){
    const name=prompt('Brand name');
    if(!name||!name.trim())return;
    const clean=name.trim();
    if(state.brands.some(b=>b.toLowerCase()===clean.toLowerCase())){toast('Brand already exists');return}
    state.brands.push(clean);
    saveState();
    toast('Brand added');
  }

  function removeBrand(name){
    const used=state.products.some(p=>p.brand.toLowerCase()===name.toLowerCase());
    if(used){toast('This brand is still used by products.');return}
    state.brands=state.brands.filter(b=>b!==name);
    saveState();
    toast('Brand removed');
  }

  function fillSettings(){
    const f=$('#settingsForm');
    Object.entries(state.settings).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v||''});
  }

  function saveSettings(e){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    ['businessName','location','phone','whatsapp','email'].forEach(k=>state.settings[k]=String(fd.get(k)||'').trim());
    saveState();
    toast('Settings saved locally');
  }

  function exportData(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='yk-electric-admin-data.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
    toast('Admin data exported');
  }

  function resetData(){
    if(!confirm('Reset all local admin changes and restore the original catalog?'))return;
    state=clone(defaultState());
    localStorage.setItem(KEY,JSON.stringify(state));
    fillSettings();renderAll();toast('Admin data reset');
  }

  $$('.nav-item').forEach(b=>b.onclick=()=>gotoPage(b.dataset.page));
  $$('[data-goto]').forEach(b=>b.onclick=()=>gotoPage(b.dataset.goto));
  $$('[data-action="add-product"]').forEach(b=>b.onclick=()=>openProductModal());
  $('#globalAddProduct').onclick=()=>openProductModal();
  $('#closeModal').onclick=closeProductModal;
  $('#cancelModal').onclick=closeProductModal;
  $('#productModal').addEventListener('click',e=>{if(e.target.id==='productModal')closeProductModal()});
  $('#productForm').addEventListener('submit',saveProduct);
  $('#productSearch').addEventListener('input',renderProducts);
  $('#categoryFilter').addEventListener('change',renderProducts);
  $('#stockFilter').addEventListener('change',renderProducts);
  $('#readinessFilter').addEventListener('change',renderProducts);
  $('#addBrandBtn').onclick=addBrand;
  $('#settingsForm').addEventListener('submit',saveSettings);
  $('#resetAdminData').onclick=resetData;
  $('#exportBtn').onclick=exportData;
  $('#menuToggle').onclick=()=>$('#sidebar').classList.toggle('open');
  $('#viewAttentionProducts').onclick=()=>{gotoPage('products');$('#readinessFilter').value='attention';renderProducts();};
  $('#openInventoryFromProduct').onclick=()=>{closeProductModal();document.querySelector('[data-page="inventory"]')?.click();};
  document.addEventListener('yk-inventory-synced',event=>{
    const cloudProducts=Array.isArray(event.detail?.products)?event.detail.products:[];
    let changed=false;
    cloudProducts.forEach(cloud=>{const local=state.products.find(product=>Number(product.id)===Number(cloud.id));if(!local)return;local.stockQuantity=Number(cloud.stock_quantity||0);local.reorderLevel=Number(cloud.reorder_level||0);local.costPrice=Number(cloud.cost_price||0);local.stockUnit=cloud.stock_unit||'pcs';local.trackInventory=cloud.track_inventory===true;local.stock=cloud.stock_status||local.stock;changed=true;});
    if(changed){localStorage.setItem(KEY,JSON.stringify(state));renderAll();}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProductModal()});

  fillSettings();
  renderAll();
})();
