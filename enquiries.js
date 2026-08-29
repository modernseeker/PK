(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits=v=>String(v||'').replace(/[^0-9+]/g,'');
  const modal=document.createElement('div');
  let enquiryTrigger=null;
  modal.className='enquiry-modal';modal.id='enquiryModal';modal.hidden=true;
  modal.innerHTML='<div class="enquiry-card" role="dialog" aria-modal="true" aria-labelledby="enquiryTitle"><div class="enquiry-head"><div><small>REQUEST QUOTATION</small><h2 id="enquiryTitle">Send your product enquiry</h2></div><button type="button" id="closeEnquiry" aria-label="Close">×</button></div><div id="enquiryBody"></div></div>';
  document.body.appendChild(modal);

  function currentCart(){try{return Array.isArray(cart)?cart:JSON.parse(localStorage.getItem('yk_request_cart')||'[]')}catch(e){return[]}}
  function productFor(id){try{return products.find(p=>Number(p.id)===Number(id))}catch(e){return null}}
  function items(){return currentCart().map(x=>{const p=productFor(x.id),specification=String(x.variant||'').trim().slice(0,500);return p?{id:Number(p.id),qty:Math.max(1,Number(x.qty)||1),specification,product:p}:null}).filter(Boolean)}
  function summary(){return items().map(i=>`<div class="enquiry-summary-item"><span>${esc(`${i.product.brand} ${i.product.name} (${i.product.code})`)}${i.specification?`<small>${esc(i.specification)}</small>`:''}</span><b>Qty ${i.qty}</b></div>`).join('')}
  function formMarkup(){
    return `<form id="enquiryForm" class="enquiry-form">
      <div class="enquiry-summary"><div class="enquiry-summary-title"><b>Request cart</b><span>${items().length} item${items().length===1?'':'s'}</span></div>${summary()}</div>
      <div class="enquiry-fields">
        <label><span>Your name *</span><input name="customer_name" maxlength="120" autocomplete="name" required></label>
        <label><span>Phone / WhatsApp *</span><input name="phone" maxlength="20" inputmode="tel" autocomplete="tel" placeholder="98XXXXXXXX" required></label>
        <label><span>Business / company</span><input name="business_name" maxlength="160" autocomplete="organization"></label>
        <label><span>Location</span><input name="location" maxlength="180" autocomplete="address-level2" placeholder="Butwal, Nepal"></label>
        <label><span>Preferred contact</span><select name="contact_preference"><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="either">Either is fine</option></select></label>
        <label><span>When do you need it?</span><select name="required_timeline"><option value="planning">Planning / checking price</option><option value="this-week">This week</option><option value="2-3-days">Within 2–3 days</option><option value="urgent">Urgently / today</option></select></label>
        <label class="wide"><span>Notes or exact specifications</span><textarea name="notes" maxlength="1200" rows="3" placeholder="Model, ampere, voltage, size, delivery details…"></textarea></label>
        <label class="enquiry-honey" aria-hidden="true"><span>Website</span><input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <p class="enquiry-privacy">Submitting does not place a paid order. You ask YK Electric to use these details to respond to your enquiry. <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a>.</p>
      <div class="enquiry-actions"><button type="button" class="enquiry-wa" id="enquiryWhatsApp">Continue on WhatsApp</button><button type="submit" class="enquiry-submit" id="submitEnquiry">Submit enquiry</button></div>
      <p class="enquiry-error" id="enquiryError" role="alert"></p>
    </form>`;
  }
  function open(){
    if(!items().length){try{openCart?.()}catch(e){}return}
    enquiryTrigger=document.activeElement;
    try{closeCart?.(false)}catch(e){}
    $('#enquiryBody').innerHTML=formMarkup();modal.hidden=false;document.documentElement.classList.add('enquiry-open');
    $('#enquiryForm').addEventListener('submit',submit);$('#enquiryWhatsApp').onclick=whatsApp;setTimeout(()=>$('#enquiryForm input[name="customer_name"]')?.focus(),30);
  }
  function close(){
    if(modal.hidden)return;
    modal.hidden=true;document.documentElement.classList.remove('enquiry-open');
    const trigger=enquiryTrigger;enquiryTrigger=null;
    const fallback=window.matchMedia('(max-width: 760px)').matches?$('#mobileCartBtn'):$('#cartBtn');
    const restore=trigger&&!trigger.closest?.('[aria-hidden="true"], [inert]')?trigger:fallback;
    setTimeout(()=>restore?.focus(),0);
  }
  function whatsApp(){
    const form=$('#enquiryForm'),fd=form?new FormData(form):null;
    const extra=fd?[`Name: ${fd.get('customer_name')||''}`,`Phone: ${fd.get('phone')||''}`,`Location: ${fd.get('location')||''}`,`Preferred contact: ${fd.get('contact_preference')||''}`,`Needed: ${fd.get('required_timeline')||''}`,`Notes: ${fd.get('notes')||''}`].filter(x=>!x.endsWith(': ')).join('\n'):'';
    const text=`${typeof orderText==='function'?orderText():'YK Electric product enquiry'}${extra?'\n\n'+extra:''}`;
    const wa=document.querySelector('a[href*="wa.me/"]')?.href?.split('?')[0]||'https://wa.me/9779747359443';const popup=window.open(`${wa}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');if(popup)popup.opener=null;
  }
  async function submit(e){
    e.preventDefault();const form=e.currentTarget,fd=new FormData(form),error=$('#enquiryError'),btn=$('#submitEnquiry');if(fd.get('website'))return;
    const name=String(fd.get('customer_name')||'').trim(),phone=digits(fd.get('phone'));if(name.length<2){error.textContent='Please enter your name.';return}if(phone.replace(/\D/g,'').length<7){error.textContent='Please enter a valid phone or WhatsApp number.';return}
    const last=Number(localStorage.getItem('yk_last_enquiry_time')||0);if(Date.now()-last<20000){error.textContent='Your enquiry was just submitted. Please wait a moment before sending another.';return}
    const requestItems=items();if(!requestItems.length){error.textContent='Your request cart is empty.';return}
    btn.disabled=true;btn.textContent='Sending securely…';error.textContent='';
    try{
      const preference=String(fd.get('contact_preference')||'whatsapp'),timeline=String(fd.get('required_timeline')||'planning');
      const res=await fetch(`${cfg.url}/rest/v1/rpc/submit_enquiry_v2`,{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({
        p_customer_name:name,p_phone:phone,p_business_name:String(fd.get('business_name')||'').trim()||null,p_location:String(fd.get('location')||'').trim()||null,p_notes:String(fd.get('notes')||'').trim()||null,p_contact_preference:preference,p_required_timeline:timeline,p_items:requestItems.map(i=>({id:i.id,qty:i.qty,specification:i.specification||null}))
      })});
      const body=await res.json().catch(()=>null);if(!res.ok)throw new Error(body?.message||body?.hint||'The enquiry could not be sent.');
      localStorage.setItem('yk_last_enquiry_time',String(Date.now()));
      try{cart=[];renderCart();closeCart()}catch(x){localStorage.setItem('yk_request_cart','[]')}
      const ref=body?.reference_code||'YK enquiry';
      $('#enquiryBody').innerHTML=`<div class="enquiry-success"><span>✓</span><h3>Enquiry sent to YK Electric</h3><p>We received ${requestItems.length} product${requestItems.length===1?'':'s'}. We’ll follow up by <b>${preference==='phone'?'phone':preference==='either'?'phone or WhatsApp':'WhatsApp'}</b> after checking the exact model, price and availability.</p><div>Reference <strong>${esc(ref)}</strong></div><button type="button" id="doneEnquiry">Done</button></div>`;
      $('#doneEnquiry').onclick=close;
    }catch(err){error.textContent=err.message||'Could not send the enquiry. Please try WhatsApp instead.';btn.disabled=false;btn.textContent='Submit enquiry'}
  }
  $('#closeEnquiry').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')close();else if(e.key==='Tab')window.YKTrapFocus?.(modal,e)});
  const cartButton=$('#copyOrder');if(cartButton){cartButton.textContent='Submit enquiry';cartButton.onclick=open}window.YKEnquiries={open};
})();
