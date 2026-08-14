(()=>{
const WA="9779747359443";
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
 return [{name:"Specification",options:[p.spec]}];
}

function variantsFor(p){return variantMap[p.id]||genericVariants(p)}
function detailVariantText(){return Object.entries(selections).map(([k,v])=>`${k}: ${v}`).join(" · ")}

function ensureModal(){
 if(document.getElementById("productDetail")) return;
 const overlay=document.createElement("div");
 overlay.id="detailOverlay"; overlay.className="detail-overlay";
 const modal=document.createElement("section");
 modal.id="productDetail"; modal.className="product-detail"; modal.setAttribute("aria-hidden","true");
 modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-labelledby","detailTitle");
 modal.innerHTML='<div class="detail-shell" id="detailShell"></div>';
 document.body.append(overlay,modal);
 overlay.addEventListener("click",closeDetail);
}

function relatedFor(p){return products.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,3)}

function openDetail(id){
 const p=products.find(x=>x.id===Number(id));
 if(!p) return;
 detailTrigger=document.activeElement;
 ensureModal(); currentProduct=p; selections={};
 const groups=variantsFor(p);
 groups.forEach(g=>selections[g.name]=g.options[0]);
 const related=relatedFor(p);
 const actualImage=typeof hasActualProductImage==="function"?hasActualProductImage(p):true;
 const fallback=typeof fallbackImage==="function"?fallbackImage(p):"assets/product-breaker.svg";
 const shell=document.getElementById("detailShell");
 shell.innerHTML=`
  <div class="detail-top"><span class="detail-breadcrumb">${p.cat} / ${p.brand}</span><button class="detail-close" id="detailClose" aria-label="Close product details">×</button></div>
  <div class="detail-grid">
   <div class="detail-visual ${actualImage?'image-real':'image-placeholder'}"><span class="detail-badge">${p.badge}</span><img src="${p.img||fallback}" data-fallback="${fallback}" alt="${p.name}"><span class="detail-image-note">Reference illustration — appearance varies by model.</span></div>
   <div class="detail-info">
    <span class="detail-brand">${p.brand}</span>
    <h2 id="detailTitle">${p.name}</h2>
    <div class="detail-model">${p.model}</div>
    <span class="detail-code">${p.code}</span>
    <p class="detail-description">${p.desc} Select the required specification below, then send it to YK Electric for current price and availability.</p>
    <div class="detail-status"><span>● Check availability</span><span>${p.spec}</span></div>
    ${groups.map(g=>`<div class="variant-group" data-group="${g.name}"><label>${g.name}</label><div class="variant-options">${g.options.map((o,i)=>`<button class="variant-option ${i===0?'active':''}" data-group-name="${g.name}" data-value="${o}">${o}</button>`).join('')}</div></div>`).join('')}
    <div class="detail-buy"><div class="detail-qty"><button id="detailMinus">−</button><input id="detailQty" value="1" inputmode="numeric"><button id="detailPlus">+</button></div><div class="detail-spec-preview" id="detailSpecPreview">${detailVariantText()}</div></div>
    <div class="detail-actions"><button class="detail-action cart" id="detailAdd">Add to request cart</button><button class="detail-action whatsapp" id="detailWhatsApp">Ask price on WhatsApp</button></div>
    <p class="detail-note">Price is confirmed after the exact model/specification and availability are checked.</p>
   </div>
  </div>
  ${related.length?`<div class="detail-related"><div class="detail-related-head"><h3>Related products</h3><span>More in ${p.cat}</span></div><div class="related-grid">${related.map(r=>`<button type="button" class="related-item ${typeof hasActualProductImage==="function"&&hasActualProductImage(r)?'image-real':'image-placeholder'}" data-related-id="${r.id}"><img src="${r.img}" data-fallback="${typeof fallbackImage==="function"?fallbackImage(r):'assets/product-breaker.svg'}" alt=""><div><small>${r.brand}</small><strong>${r.name}</strong></div></button>`).join('')}</div></div>`:''}
 `;
 document.getElementById("detailClose").onclick=closeDetail;
 shell.querySelectorAll(".variant-option").forEach(btn=>btn.onclick=()=>selectVariant(btn));
 document.getElementById("detailMinus").onclick=()=>changeQty(-1);
 document.getElementById("detailPlus").onclick=()=>changeQty(1);
 document.getElementById("detailAdd").onclick=addDetailToCart;
 document.getElementById("detailWhatsApp").onclick=sendDetailWhatsApp;
 shell.querySelectorAll("[data-related-id]").forEach(el=>el.onclick=()=>openDetail(el.dataset.relatedId));
 requestAnimationFrame(()=>{
  document.getElementById("detailOverlay").classList.add("show");
  document.getElementById("productDetail").classList.add("open");
  document.getElementById("productDetail").setAttribute("aria-hidden","false");
  document.body.classList.add("body-detail-open");
  document.getElementById("detailClose").focus();
 });
}

function closeDetail(){
 const overlay=document.getElementById("detailOverlay"),modal=document.getElementById("productDetail");
 if(overlay) overlay.classList.remove("show");
 if(modal){modal.classList.remove("open");modal.setAttribute("aria-hidden","true")}
 document.body.classList.remove("body-detail-open");
 if(detailTrigger&&typeof detailTrigger.focus==="function")detailTrigger.focus();
}

function selectVariant(btn){
 const name=btn.dataset.groupName,value=btn.dataset.value;
 selections[name]=value;
 btn.closest(".variant-options").querySelectorAll(".variant-option").forEach(x=>x.classList.toggle("active",x===btn));
 const preview=document.getElementById("detailSpecPreview"); if(preview) preview.textContent=detailVariantText();
}

function changeQty(delta){
 const input=document.getElementById("detailQty");
 input.value=Math.max(1,(Number(input.value)||1)+delta);
}

function addDetailToCart(){
 if(!currentProduct) return;
 const qty=Math.max(1,Number(document.getElementById("detailQty").value)||1);
 const variant=detailVariantText();
 const existing=cart.find(x=>x.id===currentProduct.id&&(x.variant||"")===variant);
 if(existing) existing.qty+=qty; else cart.push({id:currentProduct.id,qty,variant});
 save(); renderCart();
 const btn=document.getElementById("detailAdd");
 btn.textContent="Added ✓"; setTimeout(()=>btn.textContent="Add to request cart",1000);
}

function sendDetailWhatsApp(){
 if(!currentProduct) return;
 const qty=Math.max(1,Number(document.getElementById("detailQty").value)||1);
 const text=["Hello YK Electric & Electronic,","",`I want price and availability for:`,`Product: ${currentProduct.brand} ${currentProduct.name}`,`Model: ${currentProduct.model}`,`Specification: ${detailVariantText()}`,`Quantity: ${qty}`,`Code: ${currentProduct.code}`,"","Please confirm the exact model, price and availability."].join("\n");
 window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`,"_blank");
}

function enhancedRenderCart(){
 save();
 const wrap=document.getElementById("cartItems"); if(!wrap) return;
 if(!cart.length){wrap.innerHTML='<div class="cart-empty"><b>Your request cart is empty.</b><p>Add products from the catalog.</p></div>';return}
 wrap.innerHTML=cart.map((x,index)=>{const p=products.find(v=>v.id===x.id);if(!p)return'';return `<div class="cart-item"><h4>${p.name}</h4><span>${p.brand} · ${p.code}${x.variant?`<br>${x.variant}`:''}</span><div class="cart-controls"><button data-ecminus="${index}">−</button><b>${x.qty}</b><button data-ecplus="${index}">+</button><button class="remove" data-eremove="${index}">Remove</button></div></div>`}).join('');
 wrap.querySelectorAll('[data-ecminus]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.ecminus);cart[i].qty=Math.max(1,cart[i].qty-1);enhancedRenderCart()});
 wrap.querySelectorAll('[data-ecplus]').forEach(b=>b.onclick=()=>{cart[Number(b.dataset.ecplus)].qty++;enhancedRenderCart()});
 wrap.querySelectorAll('[data-eremove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.eremove),1);enhancedRenderCart()});
}

function enhancedOrderText(){
 return ["Hello YK Electric & Electronic,","","Please confirm availability and final price for:",...cart.map((x,i)=>{const p=products.find(v=>v.id===x.id);return `${i+1}. ${p.brand} ${p.name} (${p.code}) — Qty ${x.qty}${x.variant?` — ${x.variant}`:''}`}),"","Please confirm exact model, stock, price and delivery."].join("\n");
}

try{renderCart=enhancedRenderCart;orderText=enhancedOrderText}catch(e){}
const orderButton=document.getElementById("copyOrder");
if(orderButton) orderButton.onclick=()=>{
 if(!cart.length){const s=document.getElementById("copyStatus");if(s)s.textContent="Add at least one product first.";return}
 window.open(`https://wa.me/${WA}?text=${encodeURIComponent(enhancedOrderText())}`,"_blank");
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

document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDetail()});
})();
