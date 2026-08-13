(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let modal=null;

  function cartItems(){
    try{return Array.isArray(cart)?cart.map(x=>({id:Number(x.id),qty:Math.max(1,Number(x.qty)||1)})):[]}catch(e){return []}
  }
  function productFor(id){try{return products.find(p=>Number(p.id)===Number(id))}catch(e){return null}}
  function summaryHtml(){
    const items=cartItems();
    return items.map(x=>{const p=productFor(x.id);return `<div class="enquiry-summary-item"><span>${esc(p?.name||`Product ${x.id}`)}</span><b>Qty ${x.qty}</b></div>`}).join('');
  }
  function whatsappHref(reference=''){
    const link=document.querySelector('a[href*="wa.me/"]');
    const base=link?.href?.split('?')[0]||'https://wa.me/9779747359443';
    const text=reference?`Hello YK Electric, I submitted website enquiry ${reference}.`:'Hello YK Electric, I would like to send a product enquiry.';
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  function injectDrawerButton(){
    const foot=$('.drawer-foot'),existing=$('#copyOrder');
    if(!foot||!existing||$('#submitEnquiryBtn'))return;
    const btn=document.createElement('button');btn.type='button';btn.id='submitEnquiryBtn';btn.className='btn primary full';btn.textContent='Submit enquiry';
    existing.before(btn);existing.textContent='Send on WhatsApp';existing.classList.add('enquiry-whatsapp-fallback');
    const trust=document.createElement('span');trust.className='enquiry-trust';trust.textContent='Your request is saved securely so YK Electric can follow it up.';existing.after(trust);
    btn.onclick=open;
  }
  function injectModal(){
    if($('#customerEnquiryModal'))return;
    modal=document.createElement('div');modal.className='enquiry-modal';modal.id='customerEnquiryModal';modal.hidden=true;
    modal.innerHTML='<div class="enquiry-modal-card" id="customerEnquiryCard"></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  }
  function open(){
    if(!cartItems().length){try{renderCart()}catch(e){}alert('Add at least one product to your request cart first.');return;}
    injectModal();
    $('#customerEnquiryCard').innerHTML=`
      <div class="enquiry-modal-head"><div><small>REQUEST A QUOTATION</small><h2>Send your product enquiry</h2></div><button type="button" id="closeEnquiryModal" aria-label="Close">×</button></div>
      <div class="enquiry-summary"><div class="enquiry-summary-title"><span>Request cart</span><b>${cartItems().length} product${cartItems().length===1?'':'s'}</b></div><div class="enquiry-summary-items">${summaryHtml()}</div></div>
      <form class="enquiry-form" id="customerEnquiryForm">
        <div class="enquiry-form-grid">
          <label class="enquiry-field"><span>Your name *</span><input name="customer_name" autocomplete="name" maxlength="120" required></label>
          <label class="enquiry-field"><span>Phone / WhatsApp *</span><input name="phone" inputmode="tel" autocomplete="tel" maxlength="20" required placeholder="98XXXXXXXX"></label>
          <label class="enquiry-field"><span>Business / company</span><input name="business_name" autocomplete="organization" maxlength="160"></label>
          <label class="enquiry-field"><span>Location</span><input name="location" autocomplete="address-level2" maxlength="180" placeholder="Butwal, Bhairahawa…"></label>
          <label class="enquiry-field wide"><span>Notes</span><textarea name="notes" maxlength="1200" placeholder="Ratings, sizes, delivery requirements, or anything else we should know"></textarea></label>
        </div>
        <p class="enquiry-form-note">Submitting this request does not place a paid order. YK Electric will contact you to confirm price, availability and delivery.</p>
        <div class="enquiry-error" id="customerEnquiryError"></div>
        <div class="enquiry-form-actions"><button type="button" class="enquiry-cancel" id="cancelEnquiry">Cancel</button><button type="submit" class="enquiry-submit" id="submitEnquiryForm">Submit enquiry</button></div>
      </form>`;
    $('#closeEnquiryModal').onclick=close;$('#cancelEnquiry').onclick=close;$('#customerEnquiryForm').onsubmit=submit;
    modal.hidden=false;setTimeout(()=>$('#customerEnquiryForm [name="customer_name"]')?.focus(),30);
  }
  function close(){if(modal)modal.hidden=true}
  async function rpc(payload){
    if(!cfg.url||!cfg.publishableKey)throw new Error('Online enquiry service is temporarily unavailable. Please use WhatsApp.');
    const res=await fetch(`${cfg.url}/rest/v1/rpc/submit_enquiry`,{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw new Error(body?.message||body?.hint||'Could not submit your enquiry. Please try WhatsApp instead.');
    return body;
  }
  async function submit(e){
    e.preventDefault();const form=e.currentTarget,btn=$('#submitEnquiryForm'),err=$('#customerEnquiryError'),fd=new FormData(form),items=cartItems();
    if(!items.length){err.textContent='Your request cart is empty.';return;}
    btn.disabled=true;btn.textContent='Sending…';err.textContent='';
    try{
      const result=await rpc({p_customer_name:String(fd.get('customer_name')||'').trim(),p_phone:String(fd.get('phone')||'').trim(),p_business_name:String(fd.get('business_name')||'').trim(),p_location:String(fd.get('location')||'').trim(),p_notes:String(fd.get('notes')||'').trim(),p_items:items});
      const reference=result?.reference_code||'YK enquiry';
      try{cart.splice(0,cart.length);save();renderCart()}catch(e){}
      $('#customerEnquiryCard').innerHTML=`<div class="enquiry-success"><div class="enquiry-success-icon">✓</div><h2>Enquiry received</h2><p>YK Electric has received your product request. Keep this reference if you contact us about it.</p><div class="enquiry-reference">${esc(reference)}</div><p>We will confirm current price, availability and delivery with you.</p><div class="enquiry-success-actions"><a target="_blank" rel="noopener" href="${esc(whatsappHref(reference))}">Message on WhatsApp</a><button type="button" id="finishEnquiry">Done</button></div></div>`;
      $('#finishEnquiry').onclick=()=>{close();try{$('#closeCart')?.click()}catch(e){}};
    }catch(error){err.textContent=error.message;}
    finally{if(btn){btn.disabled=false;btn.textContent='Submit enquiry';}}
  }
  injectDrawerButton();injectModal();
})();