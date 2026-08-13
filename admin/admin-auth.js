(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const SESSION_KEY='yk_supabase_admin_session';
  const LAST_KEY='yk_supabase_admin_last_activity';
  const TIMEOUT_MS=30*60*1000;
  const $=s=>document.querySelector(s);
  let session=null;
  let profile=null;
  let timer=null;

  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function baseHeaders(token=''){return {'apikey':cfg.publishableKey,'Content-Type':'application/json','Accept':'application/json',...(token?{'Authorization':`Bearer ${token}`}:{})};}
  async function request(path,options={},token=''){
    if(!cfg.url||!cfg.publishableKey)throw new Error('Supabase configuration is unavailable.');
    const res=await fetch(`${cfg.url}${path}`,{...options,headers:{...baseHeaders(token),...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok){const err=new Error(body?.msg||body?.message||body?.error_description||body?.error||`Request failed (${res.status})`);err.status=res.status;throw err;}
    return body;
  }

  function injectAuthUI(){
    if(!$('#authScreen')){
      const screen=document.createElement('div');screen.className='auth-screen';screen.id='authScreen';
      screen.innerHTML=`<div class="auth-card"><div class="auth-brand"><img src="../assets/yk-logo.svg" alt="YK Electric"><div><strong>YK Electric Admin</strong><span>SUPABASE SECURE ACCESS</span></div></div><div id="authBody"></div></div>`;
      document.body.prepend(screen);
    }
    const actions=$('.topbar-actions');
    if(actions&&!$('#authUser')){const user=document.createElement('div');user.className='auth-user';user.id='authUser';actions.prepend(user);}
  }

  function renderLogin(message=''){
    $('#authBody').innerHTML=`<h1>Admin sign in</h1><p>Sign in with the YK Electric administrator email and password.</p>
      <form id="authForm">
        <label class="auth-field"><span>Email</span><input id="authEmail" type="email" autocomplete="username" value="${escapeHtml(cfg.adminEmail||'')}" readonly required></label>
        <label class="auth-field"><span>Password</span><input id="authPassword" type="password" autocomplete="current-password" minlength="8" required></label>
        <button class="auth-submit" id="authSubmit" type="submit">Sign in to Admin</button><div class="auth-error" id="authError">${escapeHtml(message)}</div>
      </form>
      <button class="auth-secondary-link" id="createAdminAccount" type="button">First time? Create admin account</button>
      <div class="auth-help"><b>Protected by Supabase Auth + Row Level Security.</b> Only the approved YK administrator email can enroll as an admin.<span class="auth-lock-note">Session automatically locks after 30 minutes of inactivity.</span></div>`;
    $('#authForm').addEventListener('submit',login);
    $('#createAdminAccount').onclick=()=>renderSignup();
    setTimeout(()=>$('#authPassword')?.focus(),20);
  }

  function renderSignup(message=''){
    $('#authBody').innerHTML=`<div class="auth-setup-badge">ONE-TIME SETUP</div><h1>Create admin account</h1><p>Create the Supabase login for <b>${escapeHtml(cfg.adminEmail||'')}</b>.</p>
      <form id="authSignupForm">
        <label class="auth-field"><span>Email</span><input type="email" value="${escapeHtml(cfg.adminEmail||'')}" readonly></label>
        <label class="auth-field"><span>New password</span><input id="signupPassword" type="password" autocomplete="new-password" minlength="10" required></label>
        <label class="auth-field"><span>Confirm password</span><input id="signupPassword2" type="password" autocomplete="new-password" minlength="10" required></label>
        <button class="auth-submit" id="authSignupSubmit" type="submit">Create Supabase Admin</button><div class="auth-error" id="authError">${escapeHtml(message)}</div>
      </form>
      <button class="auth-secondary-link" id="backToLogin" type="button">Back to sign in</button>
      <div class="auth-help">Supabase may send a confirmation email before the first sign-in. After confirming, return to this admin page and sign in.</div>`;
    $('#authSignupForm').addEventListener('submit',signup);
    $('#backToLogin').onclick=()=>renderLogin();
    setTimeout(()=>$('#signupPassword')?.focus(),20);
  }

  function saveSession(value){session=value;sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));sessionStorage.setItem(LAST_KEY,String(Date.now()));}
  function clearSession(){session=null;profile=null;sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(LAST_KEY);}
  function expired(){const last=Number(sessionStorage.getItem(LAST_KEY)||0);return !last||Date.now()-last>TIMEOUT_MS;}
  function markActivity(){if(session)sessionStorage.setItem(LAST_KEY,String(Date.now()));}

  async function isAdmin(token){
    const result=await request('/rest/v1/rpc/is_admin',{method:'POST',body:'{}'},token);
    return result===true;
  }
  async function ensureAdmin(user,token){
    if(await isAdmin(token))return true;
    if(String(user.email||'').toLowerCase()!==String(cfg.adminEmail||'').toLowerCase())throw new Error('This email is not authorized for YK Admin.');
    try{
      await request('/rest/v1/admin_profiles',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify({user_id:user.id,display_name:'YK Admin',role:'admin'})},token);
    }catch(e){if(e.status!==409)throw e;}
    if(!await isAdmin(token))throw new Error('Admin access could not be activated for this account.');
    return true;
  }

  async function userFor(token){return request('/auth/v1/user',{method:'GET'},token);}

  function renderUser(){
    const holder=$('#authUser');if(!holder||!profile)return;
    holder.innerHTML=`<span>${escapeHtml(profile.email||'YK Admin')}</span><button type="button" id="authSignOut">Sign out</button>`;
    $('#authSignOut').onclick=()=>signOut();
  }
  function unlock(user,value){
    profile=user;saveSession(value);document.documentElement.classList.add('yk-admin-authenticated');
    const screen=$('#authScreen');if(screen)screen.hidden=true;renderUser();markActivity();
    if(timer)clearInterval(timer);timer=setInterval(()=>{if(expired())signOut('Session expired after 30 minutes of inactivity.');},30000);
    document.dispatchEvent(new CustomEvent('yk-admin-authenticated',{detail:user}));
  }
  function lock(message=''){
    document.documentElement.classList.remove('yk-admin-authenticated');const screen=$('#authScreen');if(screen)screen.hidden=false;
    const holder=$('#authUser');if(holder)holder.innerHTML='';renderLogin(message);
  }

  async function signup(e){
    e.preventDefault();const password=$('#signupPassword').value;const confirm=$('#signupPassword2').value;const btn=$('#authSignupSubmit');const err=$('#authError');
    if(password.length<10){err.textContent='Use at least 10 characters.';return;}if(password!==confirm){err.textContent='Passwords do not match.';return;}
    btn.disabled=true;btn.textContent='Creating account…';err.textContent='';
    try{
      const redirect=`${location.origin}${location.pathname}`;
      const data=await request(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({email:cfg.adminEmail,password,data:{display_name:'YK Admin'}})});
      if(data?.access_token){const user=data.user||await userFor(data.access_token);await ensureAdmin(user,data.access_token);unlock(user,data);}
      else renderLogin('Account created. Check the YK email for the Supabase confirmation link, then sign in here.');
    }catch(error){err.textContent=error.message;}
    finally{btn.disabled=false;btn.textContent='Create Supabase Admin';}
  }

  async function login(e){
    e.preventDefault();const btn=$('#authSubmit');const err=$('#authError');const password=$('#authPassword').value;
    btn.disabled=true;btn.textContent='Signing in…';err.textContent='';
    try{
      const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:cfg.adminEmail,password})});
      const user=data.user||await userFor(data.access_token);await ensureAdmin(user,data.access_token);unlock(user,data);
    }catch(error){clearSession();err.textContent=error.message;}
    finally{btn.disabled=false;btn.textContent='Sign in to Admin';}
  }

  async function tryRefresh(saved){
    if(!saved?.refresh_token)return null;
    return request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:saved.refresh_token})});
  }
  async function restore(){
    if(expired()){clearSession();lock('');return;}
    let saved;try{saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch(e){saved=null;}
    if(!saved?.access_token){clearSession();lock('');return;}
    try{
      let user;
      try{user=await userFor(saved.access_token);}catch(e){saved=await tryRefresh(saved);if(!saved)throw e;user=saved.user||await userFor(saved.access_token);}
      await ensureAdmin(user,saved.access_token);unlock(user,saved);
    }catch(e){clearSession();lock('Your previous session has expired. Sign in again.');}
  }
  async function signOut(message='Signed out securely.'){
    const token=session?.access_token;clearSession();if(timer)clearInterval(timer);timer=null;
    if(token)request('/auth/v1/logout',{method:'POST'},token).catch(()=>{});lock(message);
  }

  injectAuthUI();
  ['click','keydown','touchstart','mousemove'].forEach(type=>document.addEventListener(type,markActivity,{passive:true}));
  window.YKAdminAuth={isAuthenticated:()=>document.documentElement.classList.contains('yk-admin-authenticated')&&!expired(),getToken:()=>session?.access_token||'',getUser:()=>profile,getSession:()=>session,signOut};
  restore();
})();
