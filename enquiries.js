(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits=v=>String(v||'').replace(/[^0-9+]/g,'');
  const modal=document.createElement('div');
  modal.className='enquiry-modal';modal.id='enquiryModal';modal.hidden=true;
  modal.innerHTML='<div class="enquiry-card" role="dialog" aria-modal="true" aria-labelledby="enquiryTitle"><div class="enquiry-head"><div><small>REQUEST QUOTATION</small><h2 id="enquiryTitle">Send your product enquiry</h2></div><button type="button" id="closeEnquiry" aria-label="Close">×</button></div><div id="enquiryBody"></div></div>';
  document.body.appendChild(modal);

  function currentCart(){try{return Array.isArray(cart)?cart:JSON.parse(localStorage.getItem('yk_request_cart')||'[]')}catch(e){return[]}}
  function productFor(id){try{return products.find(p=>Number(p.id)===Number(id))}catch(e){return null}}
  function items(){
    return currentCart().map(x=>{const p=productFor(x.id);return p?{product_id:Number(p.id),product_name:`${p.brand} ${p.name} (${p.code})`,quantity:Number(x.qty)||1}:null}).filter(Boolean);
  }
  function summary(){
    return items().map(i=>`<div class="enquiry-summary-item"><span>${esc(i.product_name)}</span><b>Qty ${i.quantity}</b></div>`).join('');
  }
  function formMarkup(){
    return `<form id="enquiryForm" class="enquiry-form">
      <div class="enquiry-summary"><div class="enquiry-summary-title"><b>Request cart</b><span>${items().length} item${items().length===1?'':'s'}</span></div>${summary()}</div>
      <div class="enquiry-fields">
        <label><span>Your name *</span><input name="customer_name" maxlength="100" autocomplete="name" required></label>
        <label><span>Phone / WhatsApp *</span><input name="phone" maxlength="18" inputmode="tel" autocomplete="tel" placeholder="98XXXXXXXX" required></label>
        <label><span>Business / company</span><input name="business_name" maxlength="120" autocomplete="organization"></label>
        <label><span>Location</span><input name="location" maxlength="160" autocomplete="address-level2" placeholder="Butwal, Nepal"></label>
        <label class="wide"><span>Notes or exact specifications</span><textarea name="notes" maxlength="1000" rows="3" placeholder="Model, ampere, voltage, size, delivery details…"></textarea></label>
        <label class="enquiry-honey" aria-hidden="true"><span>Website</span><input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <p class="enquiry-privacy">Your details are sent securely to YK Electric and are visible only inside the admin inbox.</p>
      <div class="enquiry-actions"><button type="button" class="enquiry-wa" id="enquiryWhatsApp">Continue on WhatsApp</button><button type="submit" class="enquiry-submit" id="submitEnquiry">Submit enquiry</button></div>
      <p class="enquiry-error" id="enquiryError" role="alert"></p>
    </form>`;
  }
  function open(){
    if(!items().length){openCart?.();return}
    $('#enquiryBody').innerHTML=formMarkup();
    modal.hidden=false;document.documentElement.classList.add('enquiry-open');
    $('#enquiryForm').addEventListener('submit',submit);
    $('#enquiryWhatsApp').onclick=whatsApp;
    setTimeout(()=>$('#enquiryForm input[name="customer_name"]')?.focus(),30);
  }
  function close(){modal.hidden=true;document.documentElement.classList.remove('enquiry-open')}
  function whatsApp(){
    const form=$('#enquiryForm'),fd=form?new FormData(form):null;
    const extra=fd?[`Name: ${fd.get('customer_name')||''}`,`Phone: ${fd.get('phone')||''}`,`Location: ${fd.get('location')||''}`,`Notes: ${fd.get('notes')||''}`].filter(x=>!x.endsWith(': ')).join('\n'):'';
    const text=`${typeof orderText==='function'?orderText():'YK Electric product enquiry'}${extra?'\n\n'+extra:''}`;
    window.open(`https://wa.me/9779747359443?text=${encodeURIComponent(text)}`,'_blank','noopener');
  }
  async function submit(e){
    e.preventDefault();
    const form=e.currentTarget,fd=new FormData(form),error=$('#enquiryError'),btn=$('#submitEnquiry');
    if(fd.get('website'))return;
    const name=String(fd.get('customer_name')||'').trim(),phone=digits(fd.get('phone'));
    if(name.length<2){error.textContent='Please enter your name.';return}
    if(phone.length<7){error.textContent='Please enter a valid phone or WhatsApp number.';return}
    const last=Number(localStorage.getItem('yk_last_enquiry_time')||0);
    if(Date.now()-last<20000){error.textContent='Your enquiry was just submitted. Please wait a moment before sending another.';return}
    const requestItems=items();if(!requestItems.length){error.textContent='Your request cart is empty.';return}
    btn.disabled=true;btn.textContent='Sending securely…';error.textContent='';
    const id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2,14).padEnd(12,'0')}`;
    try{
      const res=await fetch(`${cfg.url}/rest/v1/rpc/submit_enquiry`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({
        p_enquiry_id:id,p_customer_name:name,p_phone:phone,p_business_name:String(fd.get('business_name')||'').trim()||null,
        p_location:String(fd.get('location')||'').trim()||null,p_notes:String(fd.get('notes')||'').trim()||null,p_items:requestItems
      })});
      const body=await res.json().catch(()=>null);if(!res.ok)throw new Error(body?.message||body?.hint||'The enquiry could not be sent.');
      localStorage.setItem('yk_last_enquiry_time',String(Date.now()));
      try{cart=[];renderCart();closeCart()}catch(x){localStorage.setItem('yk_request_cart','[]')}
      const ref=String(id).split('-')[0].toUpperCase();
      $('#enquiryBody').innerHTML=`<div class="enquiry-success"><span>✓</span><h3>Enquiry sent to YK Electric</h3><p>We received ${requestItems.length} product${requestItems.length===1?'':'s'}. We’ll contact you on <b>${esc(phone)}</b> after checking the exact model, price and availability.</p><div>Reference <strong>YK-${esc(ref)}</strong></div><button type="button" id="doneEnquiry">Done</button></div>`;
      $('#doneEnquiry').onclick=close;
    }catch(err){error.textContent=err.message||'Could not send the enquiry. Please try WhatsApp instead.';btn.disabled=false;btn.textContent='Submit enquiry'}
  }
  $('#closeEnquiry').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  const cartButton=$('#copyOrder');if(cartButton){cartButton.textContent='Submit enquiry';cartButton.onclick=open}
  window.YKEnquiries={open};
})();