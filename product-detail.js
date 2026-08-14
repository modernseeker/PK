(()=>{
const WA="9779747359443";
const esc=window.YKText?.escape||((value)=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])));
const safeUrl=window.YKText?.safeUrl||((value,fallback="assets/product-breaker.svg")=>/^https:\/\//i.test(String(value||""))||/^assets\//i.test(String(value||""))?String(value):fallback);
const variantMap={
4:[{name:"Rating",options:["6A","10A","16A","20A","25A","32A","40A","50A","63A"]},{name:"Pole",options:["SP","DP","TP","FP"]},{name:"Curve",options:["B Curve","C Curve","D Curve"]}],
5:[{name:"Rating",options:["100A","125A","160A","200A","250A"]},{name:"Pole",options:["3P","4P"]},{name:"Breaking Capacity",options:["25kA","36kA"]}],
6:[{name:"Type",options:["RCCB","RCBO"]},{name:"Rating",options:["25A","32A","40A","63A"]},{name:"Pole",options:["DP","FP"]}],
8:[{name:"Current",options:["9A","12A","18A","25A","32A","40A"]},{name:"Coil Voltage",options:["220V AC","415V AC"]}],
9:[{name:"Motor Range",options:["0.63–1A","1–1.6A","1.6–2.5A","2.5–4A","4–6A","5.5–8A","7–10A"]}],
10:[{name:"Contact",options:["1NO","1NC","1NO+1NC"]},{name:"Color",options:["Green","Red","Black","Yellow"]}],
12:[{name:"Function",options:["On Delay","Interval","Cyclic"]},{name:"Supply",options:["230V AC","24V AC/DC"]}],
13:[{name:"Input",options:["K Type","J Type","PT100"]},{name:"Control",options:["Relay","SSR"]}],
14:[{name:"Output",options:["PNP NO","PNP NC","NPN NO","NPN NC"]},{name:"Sensing",options:["M12","M18","M30"]}],
15:[{name:"Input",options:["1 Phase 230V","3 Phase 415V"]},{name:"Motor",options:["0.75kW","1.5kW","2.2kW","4kW","5.5kW","7.5kW"]}],
16:[{name:"Capacitance",options:["1.5µF","2.5µF","4µF","5µF","6µF","8µF","10µF","12.5µF","15µF","25µF","40µF","50µF","60µF","72µF"]},{name:"Voltage",options:["440V AC","450V AC"]}],
17:[{name:"Capacitance",options:["25µF","30µF","36µF","40µF","50µF","60µF","72µF"]},{name:"Application",options:["Submersible Control Box"]}],
18:[{name:"Rating",options:["1kVAr","2kVAr","5kVAr","10kVAr","15kVAr","20kVAr","25kVAr"]}],
21:[{name:"Seal",options:["Open","ZZ","2RS"]},{name:"Size",options:["6204"]}],
23:[{name:"Power",options:["50W","100W","150W","200W"]},{name:"Light",options:["Cool White","Warm White"]}]
};

let currentProduct=null;
let selections={};
let detailTrigger=null;

function genericVariants(p){
 if(p.cat==="Wires & Cables") return [{name:"Requirement",options:["Send size / gauge"]}];
 if(p.cat==="Motors & Pumps") return [{name:"Requirement",options:["Send HP / size"]}];
 if(p.cat==="Bearings & Spares") return [{name:"Requirement",options:["Confirm size / type"]}];
 if(p.cat==="Lighting & Electronics") return [{name:"Requirement",options:["Confirm watt / model"]}];
 return [{name:"Specification",options:[p.spec||"Confirm exact requirement"]}];
}

function variantsFor(p){return variantMap[p.id]||genericVariants(p)}
function detailVariantText(){return Object.entries(selections).map(([k,v])=>`${k}: ${v}`).join(" · ")}

function specificationRows(p,groups){
 const rows=[
  ["Brand",p.brand||"Confirm with YK"],
  ["Model",p.model||"Confirm with YK"],
  ["Product type",p.name],
  ["Category",p.cat],
  ["Catalog code",p.code||"—"],
  ["Listed specification",p.spec||"Confirm requirement"]
 ];
 groups.forEach(group=>rows.push([`Available ${group.name}`,group.options.join(", ")]));
 return rows;
}

function renderSpecificationRows(rows){
 return rows.map(([label,value])=>`<div class="detail-spec-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");
}

function selectDetailTab(btn){
 const shell=btn.closest(".detail-shell"),tab=btn.dataset.detailTab;
 shell.querySelectorAll("[data-detail-tab]").forEach(item=>{
  const active=item===btn;
  item.classList.toggle("active",active);
  item.setAttribute("aria-selected",String(active));
 });
 shell.querySelectorAll("[data-detail-panel]").forEach(panel=>{panel.hidden=panel.dataset.detailPanel!==tab});
}

function ensureModal(){
 if(document.getElementById("productDetail")) return;
 const overlay=document.createElement("div");
 overlay.id="detailOverlay"; overlay.className="detail-overlay";
 const modal=document.createElement("section");
 modal.id="productDetail"; modal.className="product-detail"; modal.setAttribute("aria-hidden","true");
 modal.setAttribute("inert","");
 modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-labelledby","detailTitle");
 modal.innerHTML='<div class="detail-shell" id="detailShell"></div>';
 document.body.append(overlay,modal);
 overlay.addEventListener("click",closeDetail);
}

function relatedFor(p){return products.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,3)}

function openDetail(id){
 const p=products.find(x=>x.id===Number(id));
 if(!p) return;
 const existingModal=document.getElementById("productDetail");
 if(!existingModal||existingModal.getAttribute("aria-hidden")==="true")detailTrigger=document.activeElement;
 ensureModal(); currentProduct=p; selections={};
 const groups=variantsFor(p);
 groups.forEach(g=>selections[g.name]=g.options[0]);
 const related=relatedFor(p);
 const actualImage=typeof hasActualProductImage==="function"?hasActualProductImage(p):true;
 const fallback=typeof fallbackImage==="function"?fallbackImage(p):"assets/product-breaker.svg";
 const image=safeUrl(p.img,fallback);
 const specificationRowsForProduct=specificationRows(p,groups);
 const shell=document.getElementById("detailShell");
 shell.innerHTML=`
  <div class="detail-top"><nav class="detail-breadcrumb" aria-label="Product breadcrumb"><span>Home</span><i>›</i><span>${esc(p.cat)}</span><i>›</i><span>${esc(p.brand)}</span><i>›</i><b>${esc(p.model||p.name)}</b></nav><button class="detail-close" id="detailClose" type="button" aria-label="Close product details">×</button></div>
  <div class="detail-grid">
   <div class="detail-media ${actualImage?'image-real':'image-placeholder'}">
    <div class="detail-thumbs" aria-label="Product images"><button class="detail-thumb active" type="button" aria-label="Primary product image"><img src="${esc(image)}" data-fallback="${esc(fallback)}" alt=""></button><span>${actualImage?'Product view':'Reference view'}</span></div>
    <div class="detail-visual ${actualImage?'image-real':'image-placeholder'}"><span class="detail-badge">${esc(p.badge)}</span><img src="${esc(image)}" data-fallback="${esc(fallback)}" alt="${esc(p.name)}"><button class="detail-zoom" id="detailZoom" type="button" aria-label="Zoom product image" aria-pressed="false">⌕</button><span class="detail-image-note">Reference illustration — appearance varies by model.</span></div>
   </div>
   <div class="detail-info">
    <span class="detail-brand">${esc(p.brand)}</span>
    <h2 id="detailTitle">${esc(p.name)}</h2>
    <div class="detail-model">${esc(p.model)}</div>
    <span class="detail-code">${esc(p.code)}</span>
    <p class="detail-description">${esc(p.desc)} Select the required specification below, then send it to YK Electric for current price and availability.</p>
    <div class="detail-status"><span>● Check availability</span><span>${esc(p.spec)}</span></div>
    ${groups.map(g=>`<div class="variant-group" data-group="${esc(g.name)}"><label>${esc(g.name)}</label><div class="variant-options">${g.options.map((o,i)=>`<button class="variant-option ${i===0?'active':''}" type="button" aria-pressed="${i===0?'true':'false'}" data-group-name="${esc(g.name)}" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
    <div class="detail-buy"><div class="detail-qty"><button id="detailMinus" type="button" aria-label="Decrease quantity">−</button><input id="detailQty" type="number" value="1" min="1" max="999" inputmode="numeric" aria-label="Quantity"><button id="detailPlus" type="button" aria-label="Increase quantity">+</button></div><div class="detail-spec-preview" id="detailSpecPreview" aria-live="polite">${esc(detailVariantText())}</div></div>
    <div class="detail-actions"><button class="detail-action cart" id="detailAdd" type="button">Add to request cart</button><button class="detail-action whatsapp" id="detailWhatsApp" type="button">Ask price on WhatsApp</button></div>
    <p class="detail-note">Price is confirmed after the exact model/specification and availability are checked.</p>
   </div>
  </div>
  <div class="detail-trust-strip" aria-label="YK Electric service benefits">
   <div><span>✓</span><p><b>Brand-matched products</b><small>Model and rating support</small></p></div>
   <div><span>Rs</span><p><b>Current price</b><small>Confirmed before supply</small></p></div>
   <div><span>⌁</span><p><b>Technical guidance</b><small>Help choosing the right item</small></p></div>
   <div><span>▦</span><p><b>Bulk requirements</b><small>Projects and trade enquiries</small></p></div>
  </div>
  <div class="detail-content">
   <div class="detail-tabs" role="tablist" aria-label="Product information">
    <button class="active" type="button" role="tab" aria-selected="true" data-detail-tab="specifications">Specifications</button>
    <button type="button" role="tab" aria-selected="false" data-detail-tab="description">Description</button>
    <button type="button" role="tab" aria-selected="false" data-detail-tab="guidance">Buying guidance</button>
   </div>
   <div class="detail-tab-panel" data-detail-panel="specifications">${renderSpecificationRows(specificationRowsForProduct)}</div>
   <div class="detail-tab-panel detail-copy-panel" data-detail-panel="description" hidden><h3>${esc(p.name)}</h3><p>${esc(p.desc||`${p.brand} ${p.name} for electrical and industrial requirements.`)}</p><p>Final appearance, marking and specification may vary by selected model. YK Electric confirms the exact item before supply.</p></div>
   <div class="detail-tab-panel detail-guidance-panel" data-detail-panel="guidance" hidden><div><span>1</span><p><b>Choose the specification</b><small>Select the rating, size or model you require.</small></p></div><div><span>2</span><p><b>Send your request</b><small>Add the item to your request cart or continue on WhatsApp.</small></p></div><div><span>3</span><p><b>YK confirms supply</b><small>We verify the exact model, price, availability and delivery.</small></p></div></div>
  </div>
  ${related.length?`<div class="detail-related"><div class="detail-related-head"><h3>Related products</h3><span>More in ${esc(p.cat)}</span></div><div class="related-grid">${related.map(r=>{const relatedFallback=typeof fallbackImage==="function"?fallbackImage(r):'assets/product-breaker.svg';return `<button type="button" class="related-item ${typeof hasActualProductImage==="function"&&hasActualProductImage(r)?'image-real':'image-placeholder'}" data-related-id="${Number(r.id)}"><img src="${esc(safeUrl(r.img,relatedFallback))}" data-fallback="${esc(relatedFallback)}" alt=""><div><small>${esc(r.brand)}</small><strong>${esc(r.name)}</strong></div></button>`}).join('')}</div></div>`:''}
 `;
 shell.scrollTop=0;
 document.getElementById("detailClose").onclick=closeDetail;
 shell.querySelectorAll(".variant-option").forEach(btn=>btn.onclick=()=>selectVariant(btn));
 document.getElementById("detailMinus").onclick=()=>changeQty(-1);
 document.getElementById("detailPlus").onclick=()=>changeQty(1);
 document.getElementById("detailAdd").onclick=addDetailToCart;
 document.getElementById("detailWhatsApp").onclick=sendDetailWhatsApp;
 document.getElementById("detailZoom").onclick=e=>{const visual=e.currentTarget.closest(".detail-visual"),zoomed=visual.classList.toggle("zoomed");e.currentTarget.setAttribute("aria-pressed",String(zoomed))};
 shell.querySelectorAll("[data-detail-tab]").forEach(btn=>btn.onclick=()=>selectDetailTab(btn));
 shell.querySelectorAll("[data-related-id]").forEach(el=>el.onclick=()=>openDetail(el.dataset.relatedId));
 requestAnimationFrame(()=>{
  document.getElementById("detailOverlay").classList.add("show");
  document.getElementById("productDetail").classList.add("open");
  document.getElementById("productDetail").setAttribute("aria-hidden","false");
  document.getElementById("productDetail").removeAttribute("inert");
  document.body.classList.add("body-detail-open");
  setTimeout(()=>document.getElementById("detailClose")?.focus(),0);
 });
}

function closeDetail(){
 const overlay=document.getElementById("detailOverlay"),modal=document.getElementById("productDetail");
 if(!modal||modal.getAttribute("aria-hidden")==="true") return;
 if(overlay) overlay.classList.remove("show");
 modal.classList.remove("open");modal.setAttribute("aria-hidden","true");modal.setAttribute("inert","");
 document.body.classList.remove("body-detail-open");
 const restore=detailTrigger;detailTrigger=null;
 setTimeout(()=>restore?.focus(),0);
}

function selectVariant(btn){
 const name=btn.dataset.groupName,value=btn.dataset.value;
 selections[name]=value;
 btn.closest(".variant-options").querySelectorAll(".variant-option").forEach(x=>{const active=x===btn;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active))});
 const preview=document.getElementById("detailSpecPreview"); if(preview) preview.textContent=detailVariantText();
}

function changeQty(delta){
 const input=document.getElementById("detailQty");
 input.value=Math.min(999,Math.max(1,(Number(input.value)||1)+delta));
}

function addDetailToCart(){
 if(!currentProduct) return;
 const qty=Math.min(999,Math.max(1,Number(document.getElementById("detailQty").value)||1));
 const variant=detailVariantText();
 const existing=cart.find(x=>x.id===currentProduct.id&&(x.variant||"")===variant);
 if(existing) existing.qty+=qty; else cart.push({id:currentProduct.id,qty,variant});
 save(); renderCart();
 const btn=document.getElementById("detailAdd");
 btn.textContent="Added ✓"; setTimeout(()=>btn.textContent="Add to request cart",1000);
}

function sendDetailWhatsApp(){
 if(!currentProduct) return;
 const qty=Math.min(999,Math.max(1,Number(document.getElementById("detailQty").value)||1));
 const text=["Hello YK Electric & Electronic,","",`I want price and availability for:`,`Product: ${currentProduct.brand} ${currentProduct.name}`,`Model: ${currentProduct.model}`,`Specification: ${detailVariantText()}`,`Quantity: ${qty}`,`Code: ${currentProduct.code}`,"","Please confirm the exact model, price and availability."].join("\n");
 const popup=window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
 if(popup)popup.opener=null;
}

function enhancedRenderCart(){
 save();
 const wrap=document.getElementById("cartItems"); if(!wrap) return;
 if(!cart.length){wrap.innerHTML='<div class="cart-empty"><b>Your request cart is empty.</b><p>Add products from the catalog.</p></div>';return}
 wrap.innerHTML=cart.map((x,index)=>{const p=products.find(v=>Number(v.id)===Number(x.id));if(!p)return'';return `<div class="cart-item"><h4>${esc(p.name)}</h4><span>${esc(p.brand)} · ${esc(p.code)}${x.variant?`<br>${esc(x.variant)}`:''}</span><div class="cart-controls"><button type="button" data-ecminus="${index}" aria-label="Decrease ${esc(p.name)} quantity">−</button><b>${Math.max(1,Number(x.qty)||1)}</b><button type="button" data-ecplus="${index}" aria-label="Increase ${esc(p.name)} quantity">+</button><button type="button" class="remove" data-eremove="${index}" aria-label="Remove ${esc(p.name)}">Remove</button></div></div>`}).join('');
 wrap.querySelectorAll('[data-ecminus]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.ecminus);cart[i].qty=Math.max(1,cart[i].qty-1);enhancedRenderCart()});
 wrap.querySelectorAll('[data-ecplus]').forEach(b=>b.onclick=()=>{cart[Number(b.dataset.ecplus)].qty++;enhancedRenderCart()});
 wrap.querySelectorAll('[data-eremove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.eremove),1);enhancedRenderCart()});
}

function enhancedOrderText(){
 return ["Hello YK Electric & Electronic,","","Please confirm availability and final price for:",...cart.map((x,i)=>{const p=products.find(v=>Number(v.id)===Number(x.id));return `${i+1}. ${p.brand} ${p.name} (${p.code}) — Qty ${x.qty}${x.variant?` — ${x.variant}`:''}`}),"","Please confirm exact model, stock, price and delivery."].join("\n");
}

try{renderCart=enhancedRenderCart;orderText=enhancedOrderText}catch(e){}
const orderButton=document.getElementById("copyOrder");
if(orderButton) orderButton.onclick=()=>{
 if(!cart.length){const s=document.getElementById("copyStatus");if(s)s.textContent="Add at least one product first.";return}
 const popup=window.open(`https://wa.me/${WA}?text=${encodeURIComponent(enhancedOrderText())}`,"_blank","noopener,noreferrer");
 if(popup)popup.opener=null;
};
enhancedRenderCart();

document.addEventListener("click",e=>{
 const direct=e.target.closest("[data-open]");
 if(direct){openDetail(direct.dataset.open);return}
 const card=e.target.closest(".product-card");
 if(!card) return;
 if(e.target.closest("button,input,a,.qty,.product-actions")) return;
 const add=card.querySelector("[data-add]");
 if(add) openDetail(add.dataset.add);
});

document.addEventListener("keydown",e=>{const modal=document.getElementById("productDetail");if(!modal||modal.getAttribute("aria-hidden")==="true")return;if(e.key==="Escape")closeDetail();else if(e.key==="Tab")window.YKTrapFocus?.(modal,e)});
})();
