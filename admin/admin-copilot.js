(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let busy=false;

  const prompts=[
    "Give me today's owner briefing.",
    "Who should I collect payment from first today?",
    "Which products need reordering right now?",
    "Show me the biggest customer credit risks.",
    "How are sales performing this month?",
    "Which purchase orders are still pending?"
  ];

  function token(){return window.YKAdminAuth?.getToken?.()||''}
  function authenticated(){return Boolean(window.YKAdminAuth?.isAuthenticated?.())}

  function inject(){
    const nav=$('#sideNav');
    if(nav&&!nav.querySelector('[data-page="copilot"]')){
      const b=document.createElement('button');
      b.className='nav-item copilot-nav';
      b.dataset.page='copilot';
      b.innerHTML='<span>✦</span>YK Copilot <em>AI</em>';
      const dash=nav.querySelector('[data-page="dashboard"]');
      dash?.insertAdjacentElement('afterend',b);
      b.onclick=show;
    }

    if(!$('#page-copilot')){
      const page=document.createElement('section');
      page.className='page';
      page.id='page-copilot';
      page.innerHTML=`
        <div class="page-heading compact copilot-heading">
          <div>
            <p class="eyebrow">OWNER INTELLIGENCE</p>
            <h1>YK Copilot</h1>
            <p>Ask questions about sales, collections, credit, stock, customers and purchasing using your live YK data.</p>
          </div>
          <span class="copilot-readonly">● Read-only</span>
        </div>

        <div class="copilot-shell">
          <aside class="copilot-side">
            <div class="copilot-side-head"><span>✦</span><div><b>Quick analysis</b><small>Live business questions</small></div></div>
            <div class="copilot-prompts">${prompts.map((p,i)=>`<button type="button" data-copilot-prompt="${i}">${esc(p)}</button>`).join('')}</div>
            <div class="copilot-safety"><b>Phase 1 · Read-only</b><span>Copilot can analyze and draft actions, but it cannot change stock, payments, orders, credit or invoices.</span></div>
          </aside>

          <section class="copilot-chat-card">
            <div class="copilot-chat-head">
              <div><b>Ask YK</b><small id="copilotStatus">Connected to your Supabase business data</small></div>
              <button type="button" class="ghost-btn" id="copilotClear">Clear chat</button>
            </div>
            <div class="copilot-messages" id="copilotMessages" aria-live="polite"></div>
            <form class="copilot-compose" id="copilotForm">
              <textarea id="copilotInput" rows="2" maxlength="2000" placeholder="Ask: Which customers need collection today?"></textarea>
              <button class="primary-btn" id="copilotSend" type="submit"><span>Ask YK</span><b>➜</b></button>
            </form>
            <div class="copilot-foot"><span>Uses live YK admin data</span><span>OpenAI-powered · secure server call</span></div>
          </section>
        </div>`;
      $('.main-panel')?.appendChild(page);

      page.querySelectorAll('[data-copilot-prompt]').forEach(b=>b.onclick=()=>ask(prompts[Number(b.dataset.copilotPrompt)]));
      $('#copilotForm').onsubmit=e=>{e.preventDefault();const q=$('#copilotInput').value.trim();if(q)ask(q)};
      $('#copilotInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();const q=e.currentTarget.value.trim();if(q)ask(q)}};
      $('#copilotClear').onclick=reset;
      reset();
    }
  }

  function show(){
    inject();
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    $('#page-copilot')?.classList.add('active');
    document.querySelector('[data-page="copilot"]')?.classList.add('active');
    if($('#pageTitle'))$('#pageTitle').textContent='YK Copilot';
    $('#sidebar')?.classList.remove('open');
    setTimeout(()=>$('#copilotInput')?.focus(),50);
  }

  function reset(){
    const holder=$('#copilotMessages');
    if(!holder)return;
    holder.innerHTML='';
    addMessage('assistant',`Ask me about YK Electric's live business data.\n\nTry: “Who needs collection first?”, “What should I reorder?”, or “Give me today's owner briefing.”`,false);
    const status=$('#copilotStatus');if(status)status.textContent='Connected to your Supabase business data';
  }

  function addMessage(role,text,copyable=true){
    const holder=$('#copilotMessages');if(!holder)return null;
    const row=document.createElement('div');row.className=`copilot-msg ${role}`;
    const avatar=document.createElement('div');avatar.className='copilot-avatar';avatar.textContent=role==='assistant'?'✦':'YK';
    const bubble=document.createElement('div');bubble.className='copilot-bubble';
    const content=document.createElement('div');content.className='copilot-text';content.textContent=text;
    bubble.appendChild(content);
    if(role==='assistant'&&copyable){const tools=document.createElement('div');tools.className='copilot-msg-tools';const copy=document.createElement('button');copy.type='button';copy.textContent='Copy';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy',1200)}catch(e){}};tools.appendChild(copy);bubble.appendChild(tools)}
    row.append(avatar,bubble);holder.appendChild(row);holder.scrollTop=holder.scrollHeight;return row;
  }

  function addThinking(){
    const holder=$('#copilotMessages');if(!holder)return null;
    const row=document.createElement('div');row.className='copilot-msg assistant thinking';
    row.innerHTML='<div class="copilot-avatar">✦</div><div class="copilot-bubble"><div class="copilot-thinking"><i></i><i></i><i></i><span>Reading YK data…</span></div></div>';
    holder.appendChild(row);holder.scrollTop=holder.scrollHeight;return row;
  }

  function setBusy(value){
    busy=value;
    const send=$('#copilotSend'),input=$('#copilotInput');
    if(send){send.disabled=value;send.querySelector('span').textContent=value?'Thinking…':'Ask YK'}
    if(input)input.disabled=value;
  }

  function money(v){return `Rs. ${Number(v||0).toLocaleString('en-NP',{maximumFractionDigits:0})}`}
  function updateStatus(data){
    const s=$('#copilotStatus');if(!s)return;
    const m=data?.metrics||{};
    const parts=[];
    if(Number.isFinite(Number(m.outstanding_receivables)))parts.push(`${money(m.outstanding_receivables)} receivable`);
    if(Number.isFinite(Number(m.low_stock_products)))parts.push(`${Number(m.low_stock_products)} low stock`);
    if(Number.isFinite(Number(m.pending_purchase_orders)))parts.push(`${Number(m.pending_purchase_orders)} pending PO`);
    s.textContent=parts.length?`${parts.join(' · ')} · ${data.snapshot_at||'Live snapshot'}`:(data.snapshot_at||'Live YK snapshot');
  }

  async function ask(question){
    if(busy)return;
    if(!authenticated()){alert('Sign in to YK Admin first.');return}
    inject();show();
    const input=$('#copilotInput');if(input)input.value='';
    addMessage('user',question,false);
    const thinking=addThinking();setBusy(true);
    const status=$('#copilotStatus');if(status)status.textContent='Reading live YK data and analyzing…';

    try{
      const res=await fetch(`${cfg.url}/functions/v1/yk-copilot`,{
        method:'POST',
        headers:{
          apikey:cfg.publishableKey,
          Authorization:`Bearer ${token()}`,
          'Content-Type':'application/json',
          Accept:'application/json'
        },
        body:JSON.stringify({question}),
        cache:'no-store'
      });
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(data?.error||`YK Copilot request failed (${res.status})`);
      thinking?.remove();addMessage('assistant',String(data?.answer||'No answer returned.'));
      updateStatus(data);
    }catch(err){
      thinking?.remove();
      addMessage('assistant',`I couldn't complete that analysis. ${err.message||'Please try again.'}`,false);
      if(status)status.textContent='Copilot needs attention';
    }finally{setBusy(false);setTimeout(()=>$('#copilotInput')?.focus(),40)}
  }

  inject();
  document.addEventListener('yk-admin-authenticated',()=>{inject();const status=$('#copilotStatus');if(status)status.textContent='Connected to your Supabase business data'});
  window.YKCopilot={show,ask,reset};
})();
