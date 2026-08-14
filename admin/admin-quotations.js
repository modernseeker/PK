(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const units=['pcs','kg','meter','roll','set','unit'];
  let modal=null,currentEnquiry=null,currentQuote=null,saving=false;

  function token(){return window.YKAdminAuth?.getToken?.()||''}
  async function rest(path,options={}){
    if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Admin sign-in required.');
    const res=await fetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw new Error(body?.message||body?.hint||`Request failed (${res.status})`);
    return body;
  }
  function money(v){return `Rs. ${Number(v||0).toLocaleString('en-NP',{minimumFractionDigits:2,maximumFractionDigits:2})}`}
  function dateInput(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,10);return d.toISOString().slice(0,10)}
  function defaultValid(){const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().slice(0,10)}
  function settings(){try{return JSON.parse(localStorage.getItem('yk_admin_state_v1')||'{}').settings||{}}catch(e){return {}}}
  function waNumber(v){let n=String(v||'').replace(/\D/g,'');if(n.length===10)n='977'+n;return n}

  function injectModal(){
    if($('#quotationModal')){modal=$('#quotationModal');return}
    modal=document.createElement('div');modal.className='quote-modal';modal.id='quotationModal';modal.hidden=true;
    modal.innerHTML='<div class="quote-card"><div class="quote-head"><div><small>YK ELECTRIC SALES</small><h2 id="quoteEditorTitle">Quotation</h2></div><button type="button" id="closeQuoteModal" aria-label="Close">×</button></div><div id="quoteEditorBody"></div></div>';
    document.body.appendChild(modal);
    $('#closeQuoteModal').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  }

  function selectedEnquiryId(){return $('.enquiry-row.selected[data-id]')?.dataset.id||''}
  function injectButton(){
    const detail=$('#enquiryDetail'),actions=detail?.querySelector('.enquiry-detail-actions');
    if(!actions||$('#manageQuotationBtn'))return;
    const b=document.createElement('button');b.type='button';b.id='manageQuotationBtn';b.className='quote-launch';b.textContent='Create / Open quotation';
    actions.appendChild(b);b.onclick=openForSelected;
  }

  async function openForSelected(){
    const id=selectedEnquiryId();if(!id){alert('Select an enquiry first.');return}
    injectModal();
    $('#quoteEditorBody').innerHTML='<div class="quote-loading">Loading quotation…</div>';modal.hidden=false;
    try{
      const rows=await rest(`enquiries?id=eq.${encodeURIComponent(id)}&select=id,reference_code,customer_name,phone,business_name,location,notes,status,enquiry_items(id,product_id,product_name,quantity,specification)&limit=1`);
      if(!rows?.[0])throw new Error('Enquiry could not be found.');
      currentEnquiry=rows[0];
      const quotes=await rest(`quotations?enquiry_id=eq.${encodeURIComponent(id)}&select=*,quotation_items(*)&order=created_at.desc&limit=1`);
      currentQuote=quotes?.[0]||null;
      renderEditor();
    }catch(e){$('#quoteEditorBody').innerHTML=`<div class="quote-loading error"><b>Could not open quotation</b><span>${esc(e.message)}</span></div>`}
  }

  function initialItems(){
    if(currentQuote?.quotation_items?.length)return [...currentQuote.quotation_items].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    return (currentEnquiry?.enquiry_items||[]).map((i,index)=>({product_id:i.product_id,description:i.product_name,model:'',specification:i.specification||'',quantity:Number(i.quantity)||1,unit:'pcs',unit_price:0,discount_percent:0,sort_order:index+1}));
  }

  function lineMarkup(i,index){
    return `<div class="quote-line" data-line="${index}">
      <div class="quote-line-main"><label><span>Item</span><input class="q-desc" value="${esc(i.description||'')}" maxlength="220"></label><button type="button" class="quote-remove" data-remove-line="${index}" title="Remove">×</button></div>
      <label class="quote-line-spec"><span>Specification</span><input class="q-specification" value="${esc(i.specification||'')}" maxlength="500" placeholder="Rating, pole, curve, size or model"></label>
      <div class="quote-line-grid">
        <label><span>Qty</span><input class="q-qty" type="number" min="0.001" step="0.001" value="${Number(i.quantity||1)}"></label>
        <label><span>Unit</span><select class="q-unit">${units.map(u=>`<option ${u===(i.unit||'pcs')?'selected':''}>${u}</option>`).join('')}</select></label>
        <label><span>Unit price (Rs.)</span><input class="q-price" type="number" min="0" step="0.01" value="${Number(i.unit_price||0)}"></label>
        <label><span>Discount %</span><input class="q-discount" type="number" min="0" max="100" step="0.01" value="${Number(i.discount_percent||0)}"></label>
        <div class="quote-line-total"><span>Line total</span><b data-line-total>${money((Number(i.quantity||1)*Number(i.unit_price||0))*(1-Number(i.discount_percent||0)/100))}</b></div>
      </div>
      <input class="q-product-id" type="hidden" value="${i.product_id??''}">
    </div>`;
  }

  function renderEditor(){
    const items=initialItems();
    const status=currentQuote?.status||'draft',valid=currentQuote?.valid_until||defaultValid();
    $('#quoteEditorTitle').textContent=currentQuote?.quote_number||'New quotation';
    $('#quoteEditorBody').innerHTML=`
      <div class="quote-meta-bar"><div><span>Enquiry</span><b>${esc(currentEnquiry.reference_code||currentEnquiry.id)}</b></div><div><span>Customer</span><b>${esc(currentEnquiry.customer_name||'Customer')}</b></div><div><span>Status</span><b class="quote-status quote-status-${status}">${esc(status.toUpperCase())}</b></div></div>
      <form id="quoteForm" class="quote-form">
        <div class="quote-customer-grid">
          <label><span>Customer name</span><input name="customer_name" value="${esc(currentQuote?.customer_name||currentEnquiry.customer_name||'')}" required></label>
          <label><span>Phone</span><input name="phone" value="${esc(currentQuote?.phone||currentEnquiry.phone||'')}"></label>
          <label><span>Business</span><input name="business_name" value="${esc(currentQuote?.business_name||currentEnquiry.business_name||'')}"></label>
          <label><span>Location</span><input name="location" value="${esc(currentQuote?.location||currentEnquiry.location||'')}"></label>
        </div>
        <div class="quote-items-head"><div><h3>Quotation items</h3><p>Enter current selling price and any line discount.</p></div><button type="button" id="addQuoteLine">＋ Add line</button></div>
        <div id="quoteLines">${items.map(lineMarkup).join('')}</div>
        <div class="quote-bottom-grid">
          <div class="quote-extra-fields">
            <label><span>Valid until</span><input name="valid_until" type="date" value="${esc(dateInput(valid))}"></label>
            <label><span>Notes</span><textarea name="notes" rows="3">${esc(currentQuote?.notes||'Price and stock will be confirmed at the time of order.')}</textarea></label>
            <label><span>Terms</span><textarea name="terms" rows="3">${esc(currentQuote?.terms||'Payment terms as agreed. Goods once sold are subject to applicable warranty terms. Delivery schedule depends on stock availability.')}</textarea></label>
          </div>
          <div class="quote-totals-card">
            <label><span>VAT %</span><input id="quoteVat" name="vat_percent" type="number" min="0" max="100" step="0.01" value="${Number(currentQuote?.vat_percent??13)}"></label>
            <label><span>Delivery charge (Rs.)</span><input id="quoteDelivery" name="delivery_charge" type="number" min="0" step="0.01" value="${Number(currentQuote?.delivery_charge||0)}"></label>
            <div><span>Subtotal</span><b id="quoteSubtotal">Rs. 0.00</b></div>
            <div><span>Discount</span><b id="quoteDiscount">Rs. 0.00</b></div>
            <div><span>VAT</span><b id="quoteVatAmount">Rs. 0.00</b></div>
            <div><span>Delivery</span><b id="quoteDeliveryAmount">Rs. 0.00</b></div>
            <div class="quote-grand"><span>Grand total</span><strong id="quoteGrand">Rs. 0.00</strong></div>
          </div>
        </div>
        <p class="quote-save-status" id="quoteSaveStatus"></p>
        <div class="quote-actions">
          <button type="button" class="quote-secondary" id="quotePrint">Print / Save PDF</button>
          <button type="button" class="quote-secondary" id="quoteWhatsApp">WhatsApp summary</button>
          <button type="button" class="quote-save" id="quoteSave">Save draft</button>
          <button type="button" class="quote-send" id="quoteSend">Mark sent</button>
        </div>
      </form>`;
    bindEditor();calculate();
  }

  function bindEditor(){
    $('#addQuoteLine').onclick=()=>{const holder=$('#quoteLines'),index=holder.children.length;holder.insertAdjacentHTML('beforeend',lineMarkup({description:'',quantity:1,unit:'pcs',unit_price:0,discount_percent:0},index));bindLines();calculate()};
    bindLines();
    $('#quoteVat').oninput=calculate;$('#quoteDelivery').oninput=calculate;
    $('#quoteSave').onclick=()=>saveQuote(false);
    $('#quoteSend').onclick=()=>saveQuote(true);
    $('#quotePrint').onclick=printQuote;
    $('#quoteWhatsApp').onclick=whatsappQuote;
  }
  function bindLines(){
    document.querySelectorAll('#quoteLines .quote-line input,#quoteLines .quote-line select').forEach(el=>el.oninput=calculate);
    document.querySelectorAll('[data-remove-line]').forEach(b=>b.onclick=()=>{b.closest('.quote-line')?.remove();calculate()});
  }

  function collect(){
    const form=$('#quoteForm');if(!form)throw new Error('Quotation editor is unavailable.');
    const fd=new FormData(form);
    const items=[...document.querySelectorAll('#quoteLines .quote-line')].map((row,index)=>({
      product_id:row.querySelector('.q-product-id').value?Number(row.querySelector('.q-product-id').value):null,
      description:row.querySelector('.q-desc').value.trim(),specification:row.querySelector('.q-specification').value.trim()||null,quantity:Number(row.querySelector('.q-qty').value)||0,unit:row.querySelector('.q-unit').value,
      unit_price:Number(row.querySelector('.q-price').value)||0,discount_percent:Number(row.querySelector('.q-discount').value)||0,sort_order:index+1
    })).filter(i=>i.description||i.quantity||i.unit_price);
    if(!String(fd.get('customer_name')||'').trim())throw new Error('Customer name is required.');
    if(!items.length)throw new Error('Add at least one quotation item.');
    if(items.some(i=>!i.description||i.quantity<=0||i.unit_price<0||i.discount_percent<0||i.discount_percent>100))throw new Error('Check item description, quantity, price and discount.');
    return {header:{customer_name:String(fd.get('customer_name')).trim(),phone:String(fd.get('phone')||'').trim(),business_name:String(fd.get('business_name')||'').trim()||null,location:String(fd.get('location')||'').trim()||null,valid_until:String(fd.get('valid_until')||'')||null,notes:String(fd.get('notes')||'').trim()||null,terms:String(fd.get('terms')||'').trim()||null,vat_percent:Math.max(0,Number(fd.get('vat_percent'))||0),delivery_charge:Math.max(0,Number(fd.get('delivery_charge'))||0)},items};
  }
  function totals(data=collect()){
    const subtotal=data.items.reduce((s,i)=>s+i.quantity*i.unit_price,0);
    const discount=data.items.reduce((s,i)=>s+(i.quantity*i.unit_price)*(i.discount_percent/100),0);
    const taxable=Math.max(0,subtotal-discount),vat=taxable*(data.header.vat_percent/100),delivery=data.header.delivery_charge,grand=taxable+vat+delivery;
    return {subtotal,discount,vat,delivery,grand};
  }
  function calculate(){
    try{
      [...document.querySelectorAll('#quoteLines .quote-line')].forEach(row=>{const qty=Number(row.querySelector('.q-qty').value)||0,price=Number(row.querySelector('.q-price').value)||0,disc=Number(row.querySelector('.q-discount').value)||0;row.querySelector('[data-line-total]').textContent=money(qty*price*(1-disc/100))});
      const t=totals();$('#quoteSubtotal').textContent=money(t.subtotal);$('#quoteDiscount').textContent=`− ${money(t.discount)}`;$('#quoteVatAmount').textContent=money(t.vat);$('#quoteDeliveryAmount').textContent=money(t.delivery);$('#quoteGrand').textContent=money(t.grand);
    }catch(e){}
  }

  async function saveQuote(markSent=false,silent=false){
    if(saving)return currentQuote;saving=true;
    const saveBtn=$('#quoteSave'),sendBtn=$('#quoteSend'),status=$('#quoteSaveStatus');
    [saveBtn,sendBtn].forEach(b=>{if(b)b.disabled=true});if(status)status.textContent='Saving quotation…';
    try{
      const data=collect(),user=window.YKAdminAuth?.getUser?.();
      let id=currentQuote?.id||null;
      const header={...data.header,enquiry_id:currentEnquiry.id,created_by:currentQuote?.created_by||user?.id||null,updated_at:new Date().toISOString()};
      if(id){
        await rest(`quotations?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(header)});
        await rest(`quotation_items?quotation_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
      }else{
        const created=await rest('quotations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(header)});id=created?.[0]?.id;if(!id)throw new Error('Quotation could not be created.');
      }
      const itemRows=data.items.map(i=>({...i,quotation_id:id,line_total:0,updated_at:new Date().toISOString()}));
      await rest('quotation_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(itemRows)});
      if(markSent){
        await rest(`quotations?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'sent',sent_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        await rest(`enquiries?id=eq.${encodeURIComponent(currentEnquiry.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'quoted',updated_at:new Date().toISOString()})});
      }
      const rows=await rest(`quotations?id=eq.${encodeURIComponent(id)}&select=*,quotation_items(*)&limit=1`);currentQuote=rows?.[0]||currentQuote;
      $('#quoteEditorTitle').textContent=currentQuote?.quote_number||'Quotation';
      if(status)status.textContent=markSent?`${currentQuote.quote_number} marked as sent.`:`${currentQuote.quote_number} saved.`;
      document.dispatchEvent(new CustomEvent('yk-quotation-saved',{detail:{id,status:markSent?'sent':currentQuote?.status||'draft'}}));
      if(markSent)document.querySelector('#refreshEnquiries')?.click();
      if(!silent)setTimeout(()=>{if(status)status.textContent=''},2500);
      return currentQuote;
    }catch(e){if(status)status.textContent=e.message;if(!silent)alert(e.message);throw e}
    finally{saving=false;[saveBtn,sendBtn].forEach(b=>{if(b)b.disabled=false})}
  }

  async function ensureSaved(){return currentQuote?.id?saveQuote(false,true):saveQuote(false,true)}

  async function printQuote(){
    try{await ensureSaved();const data=collect(),t=totals(data),s=settings(),quote=currentQuote;const logo=new URL('../assets/yk-logo.svg',location.href).href;
      const rows=data.items.map((i,n)=>`<tr><td>${n+1}</td><td><b>${esc(i.description)}</b>${i.specification?`<div>${esc(i.specification)}</div>`:''}</td><td>${i.quantity} ${esc(i.unit)}</td><td>${money(i.unit_price)}</td><td>${i.discount_percent?`${i.discount_percent}%`:'—'}</td><td>${money(i.quantity*i.unit_price*(1-i.discount_percent/100))}</td></tr>`).join('');
      const w=window.open('','_blank');if(!w)throw new Error('Allow pop-ups to open the quotation preview.');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(quote.quote_number)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#13283d;font:12px Arial,sans-serif}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #126ed8;padding-bottom:16px}.brand{display:flex;gap:14px;align-items:center}.brand img{width:74px;height:74px;object-fit:contain}.brand h1{margin:0;font-size:22px}.brand p,.right p{margin:5px 0;color:#607386}.right{text-align:right}.title{margin:28px 0 16px;display:flex;justify-content:space-between;align-items:end}.title h2{margin:0;font-size:25px}.pill{padding:7px 10px;border-radius:999px;background:#eaf3ff;color:#126ed8;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}.box{border:1px solid #dce5ed;border-radius:10px;padding:12px}.box small{display:block;color:#718396;font-weight:700;margin-bottom:5px}.box b{font-size:13px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#0d2842;color:#fff;padding:9px 7px;text-align:left;font-size:10px}td{padding:10px 7px;border-bottom:1px solid #e3e9ef;vertical-align:top}th:last-child,td:last-child{text-align:right}.totals{width:330px;margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:6px 0}.totals .grand{margin-top:6px;padding:10px;border-top:2px solid #0d2842;font-size:16px;font-weight:800}.notes{margin-top:25px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.notes div{border:1px solid #dce5ed;border-radius:9px;padding:12px;min-height:80px}.notes h3{margin:0 0 8px;font-size:11px}.notes p{margin:0;white-space:pre-wrap;line-height:1.5;color:#566a7d}.foot{margin-top:34px;padding-top:13px;border-top:1px solid #dce5ed;display:flex;justify-content:space-between;color:#718396;font-size:10px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="head"><div class="brand"><img src="${logo}"><div><h1>${esc(s.businessName||'YK Electric & Electronic')}</h1><p>${esc(s.location||'Butwal, Nepal')}</p><p>${esc(s.phone||'9747359443')} · ${esc(s.email||'ykelectricnepal@gmail.com')}</p></div></div><div class="right"><b>QUOTATION</b><p>${esc(quote.quote_number)}</p><p>Date: ${new Date().toLocaleDateString('en-NP')}</p><p>Valid until: ${esc(data.header.valid_until||'—')}</p></div></div><div class="title"><h2>Sales Quotation</h2><span class="pill">NPR</span></div><div class="grid"><div class="box"><small>QUOTED TO</small><b>${esc(data.header.customer_name)}</b><div>${esc(data.header.business_name||'')}</div><div>${esc(data.header.location||'')}</div><div>${esc(data.header.phone||'')}</div></div><div class="box"><small>REFERENCE</small><b>${esc(currentEnquiry.reference_code||currentEnquiry.id)}</b><div>Prepared by YK Electric</div></div></div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit price</th><th>Disc.</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><b>${money(t.subtotal)}</b></div><div><span>Discount</span><b>− ${money(t.discount)}</b></div><div><span>VAT (${data.header.vat_percent}%)</span><b>${money(t.vat)}</b></div><div><span>Delivery</span><b>${money(t.delivery)}</b></div><div class="grand"><span>Total</span><b>${money(t.grand)}</b></div></div><div class="notes"><div><h3>Notes</h3><p>${esc(data.header.notes||'')}</p></div><div><h3>Terms</h3><p>${esc(data.header.terms||'')}</p></div></div><div class="foot"><span>Thank you for choosing YK Electric & Electronic.</span><span>Authorized quotation</span></div><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();
    }catch(e){if(!String(e.message).includes('Quotation'))alert(e.message)}
  }

  async function whatsappQuote(){
    try{await ensureSaved();const data=collect(),t=totals(data),q=currentQuote,phone=waNumber(data.header.phone||currentEnquiry.phone);if(!phone)throw new Error('Customer phone/WhatsApp number is missing.');
      const text=`Hello ${data.header.customer_name}, this is YK Electric. Your quotation ${q.quote_number} is ready.\n\nTotal: ${money(t.grand)}\nValid until: ${data.header.valid_until||'as discussed'}\nReference: ${currentEnquiry.reference_code||''}\n\nPlease reply here if you would like to confirm the order or need any changes.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');
    }catch(e){alert(e.message)}
  }

  function close(){if(modal)modal.hidden=true}
  function watch(){
    injectModal();
    const attach=()=>{const detail=$('#enquiryDetail');if(!detail)return;injectButton();if(!detail.dataset.quoteObserved){detail.dataset.quoteObserved='1';new MutationObserver(()=>requestAnimationFrame(injectButton)).observe(detail,{childList:true,subtree:true})}};
    attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
  }
  document.addEventListener('DOMContentLoaded',watch);
  document.addEventListener('yk-admin-authenticated',watch);
})();
