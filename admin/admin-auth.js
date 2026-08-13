(()=>{
  const TOKEN_KEY='yk_admin_github_token_session';
  const USER_KEY='yk_admin_authenticated_user';
  const LAST_KEY='yk_admin_last_activity';
  const CONFIG_SESSION_KEY='yk_admin_auth_config_session';
  const ALLOWED_USER='modernseeker';
  const REPO='modernseeker/PK';
  const BRANCH='main';
  const CONFIG_PATH='admin/auth-config.json';
  const CONFIG_API=`https://api.github.com/repos/${REPO}/contents/${CONFIG_PATH}`;
  const TIMEOUT_MS=30*60*1000;
  const KDF_ITERATIONS=600000;
  const $=s=>document.querySelector(s);
  const encoder=new TextEncoder();
  const decoder=new TextDecoder();
  let profile=null;
  let authConfig=null;
  let timer=null;

  function bytesToBase64(bytes){
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary);
  }

  function base64ToBytes(value){
    const binary=atob(value);
    const out=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) out[i]=binary.charCodeAt(i);
    return out;
  }

  function textToBase64(text){return bytesToBase64(encoder.encode(text));}
  function normalizeUser(value){return String(value||'').trim().toLowerCase();}
  function aadFor(username){return encoder.encode(`YK_ADMIN_AUTH_V1:${REPO}:${normalizeUser(username)}`);}

  function injectAuthUI(){
    if(!$('#authScreen')){
      const screen=document.createElement('div');
      screen.className='auth-screen';
      screen.id='authScreen';
      screen.innerHTML=`<div class="auth-card">
        <div class="auth-brand"><img src="../assets/yk-logo.svg" alt="YK Electric"><div><strong>YK Electric Admin</strong><span>SECURE STORE MANAGEMENT</span></div></div>
        <div id="authBody"><div class="auth-loading">Checking admin login…</div></div>
      </div>`;
      document.body.prepend(screen);
    }
    const actions=$('.topbar-actions');
    if(actions&&!$('#authUser')){
      const user=document.createElement('div');
      user.className='auth-user';
      user.id='authUser';
      actions.prepend(user);
    }
  }

  function renderLogin(message=''){
    const body=$('#authBody');
    if(!body)return;
    body.innerHTML=`
      <h1>Admin sign in</h1>
      <p>Use your YK Electric admin username and password.</p>
      <form id="authForm">
        <label class="auth-field"><span>Username</span><input id="authUsername" type="text" autocomplete="username" spellcheck="false" required></label>
        <label class="auth-field"><span>Password</span><input id="authPassword" type="password" autocomplete="current-password" required></label>
        <button class="auth-submit" id="authSubmit" type="submit">Sign in to Admin</button>
        <div class="auth-error" id="authError">${escapeHtml(message)}</div>
      </form>
      <button class="auth-secondary-link" id="authRecovery" type="button">Change login or replace expired GitHub credential</button>
      <div class="auth-help"><b>Secure access:</b> your GitHub publishing credential is encrypted with your password. The decrypted credential exists only in this browser session and is cleared on sign out or timeout.<span class="auth-lock-note">Session automatically locks after 30 minutes of inactivity.</span></div>`;
    $('#authForm').addEventListener('submit',loginWithPassword);
    $('#authRecovery').onclick=()=>renderSetup(true);
    setTimeout(()=>$('#authUsername')?.focus(),20);
  }

  function renderSetup(recovery=false,message=''){
    const body=$('#authBody');
    if(!body)return;
    body.innerHTML=`
      <div class="auth-setup-badge">${recovery?'RECOVERY':'ONE-TIME SETUP'}</div>
      <h1>${recovery?'Reset admin login':'Create admin login'}</h1>
      <p>${recovery?'Choose a new username/password and provide a valid GitHub token to replace the encrypted publishing credential.':'Set the username and password you want to use for YK Electric Admin. Your GitHub token is needed only for this setup.'}</p>
      <form id="authSetupForm">
        <label class="auth-field"><span>Admin username</span><input id="setupUsername" type="text" autocomplete="username" spellcheck="false" minlength="3" maxlength="40" required></label>
        <label class="auth-field"><span>Admin password</span><input id="setupPassword" type="password" autocomplete="new-password" minlength="12" required></label>
        <label class="auth-field"><span>Confirm password</span><input id="setupPassword2" type="password" autocomplete="new-password" minlength="12" required></label>
        <label class="auth-field"><span>GitHub token — setup only</span><input id="setupToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required></label>
        <div class="auth-password-note">Use a unique password of at least 12 characters. A longer passphrase is better because the encrypted credential file is publicly downloadable from GitHub Pages.</div>
        <button class="auth-submit" id="authSetupSubmit" type="submit">${recovery?'Replace Login':'Create Secure Login'}</button>
        <div class="auth-error" id="authError">${escapeHtml(message)}</div>
      </form>
      ${recovery?'<button class="auth-secondary-link" id="authBackLogin" type="button">Back to sign in</button>':''}
      <div class="auth-help"><b>What gets stored:</b> username, encryption settings, and an AES-GCM encrypted GitHub credential. Your password and plain GitHub token are never committed to the repository.</div>`;
    $('#authSetupForm').addEventListener('submit',setupLogin);
    if(recovery) $('#authBackLogin').onclick=()=>renderLogin();
    setTimeout(()=>$('#setupUsername')?.focus(),20);
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function clearSession(){
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(LAST_KEY);
    profile=null;
  }

  function markActivity(){
    if(sessionStorage.getItem(USER_KEY)) sessionStorage.setItem(LAST_KEY,String(Date.now()));
  }

  function expired(){
    const last=Number(sessionStorage.getItem(LAST_KEY)||0);
    return !last||Date.now()-last>TIMEOUT_MS;
  }

  function authHeaders(token){
    return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'};
  }

  async function api(url,token,options={}){
    const res=await fetch(url,{...options,headers:{...authHeaders(token),...(options.headers||{})},cache:'no-store'});
    const body=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(body.message||`GitHub request failed (${res.status})`);
    return body;
  }

  async function verifyToken(token){
    const user=await api('https://api.github.com/user',token);
    if(String(user.login||'').toLowerCase()!==ALLOWED_USER.toLowerCase()) throw new Error(`This admin is restricted to the GitHub account ${ALLOWED_USER}.`);
    const repo=await api(`https://api.github.com/repos/${REPO}`,token);
    const canWrite=!!(repo.permissions?.push||repo.permissions?.admin||repo.permissions?.maintain);
    if(!canWrite) throw new Error('This GitHub credential does not have write access to the YK Electric repository.');
    return {login:user.login,name:user.name||user.login,avatar:user.avatar_url||'',repo:repo.full_name};
  }

  async function deriveKey(password,salt,iterations){
    const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }

  async function encryptCredential(token,password,username){
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await deriveKey(password,salt,KDF_ITERATIONS);
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aadFor(username)},key,encoder.encode(token));
    return {
      version:1,
      username:String(username).trim(),
      githubUser:ALLOWED_USER,
      repo:REPO,
      kdf:'PBKDF2-SHA256',
      iterations:KDF_ITERATIONS,
      salt:bytesToBase64(salt),
      cipher:'AES-256-GCM',
      iv:bytesToBase64(iv),
      encryptedToken:bytesToBase64(new Uint8Array(encrypted)),
      updatedAt:new Date().toISOString()
    };
  }

  async function decryptCredential(config,password){
    try{
      const salt=base64ToBytes(config.salt);
      const iv=base64ToBytes(config.iv);
      const encrypted=base64ToBytes(config.encryptedToken);
      const key=await deriveKey(password,salt,Number(config.iterations||KDF_ITERATIONS));
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aadFor(config.username)},key,encrypted);
      return decoder.decode(clear);
    }catch(e){
      throw new Error('Incorrect username or password.');
    }
  }

  async function loadConfig(){
    const cached=sessionStorage.getItem(CONFIG_SESSION_KEY);
    if(cached){
      try{return JSON.parse(cached);}catch(e){}
    }
    const res=await fetch(`auth-config.json?v=${Date.now()}`,{cache:'no-store'});
    if(res.status===404) return null;
    if(!res.ok) throw new Error(`Could not load admin login configuration (${res.status}).`);
    const config=await res.json();
    sessionStorage.setItem(CONFIG_SESSION_KEY,JSON.stringify(config));
    return config;
  }

  async function publishConfig(token,config){
    let sha=null;
    try{
      const existing=await api(`${CONFIG_API}?ref=${encodeURIComponent(BRANCH)}`,token);
      sha=existing.sha||null;
    }catch(e){
      if(!/404|Not Found/i.test(e.message)) throw e;
    }
    const payload={
      message:sha?'Update YK admin login':'Configure YK admin login',
      content:textToBase64(JSON.stringify(config,null,2)+'\n'),
      branch:BRANCH
    };
    if(sha) payload.sha=sha;
    await api(CONFIG_API,token,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }

  function renderUser(){
    const holder=$('#authUser');
    if(!holder||!profile)return;
    const avatar=escapeHtml(profile.avatar||'');
    holder.innerHTML=`<img src="${avatar}" alt=""><span>${escapeHtml(profile.adminUsername||profile.login)}</span><button type="button" id="authSignOut">Sign out</button>`;
    $('#authSignOut').onclick=()=>signOut();
  }

  function unlock(info,token){
    profile=info;
    sessionStorage.setItem(TOKEN_KEY,token);
    sessionStorage.setItem(USER_KEY,JSON.stringify(info));
    sessionStorage.setItem(LAST_KEY,String(Date.now()));
    document.documentElement.classList.add('yk-admin-authenticated');
    const screen=$('#authScreen');
    if(screen)screen.hidden=true;
    renderUser();
    markActivity();
    if(timer)clearInterval(timer);
    timer=setInterval(()=>{if(expired())signOut('Session expired after 30 minutes of inactivity.');},30000);
    document.dispatchEvent(new CustomEvent('yk-admin-authenticated',{detail:info}));
  }

  function lock(message=''){
    document.documentElement.classList.remove('yk-admin-authenticated');
    const screen=$('#authScreen');
    if(screen)screen.hidden=false;
    const holder=$('#authUser');
    if(holder)holder.innerHTML='';
    if(authConfig) renderLogin(message); else renderSetup(false,message);
  }

  function signOut(message='Signed out securely.'){
    clearSession();
    if(timer)clearInterval(timer);
    timer=null;
    lock(message);
  }

  async function loginWithPassword(event){
    event.preventDefault();
    const username=$('#authUsername')?.value||'';
    const password=$('#authPassword')?.value||'';
    const button=$('#authSubmit');
    const error=$('#authError');
    if(normalizeUser(username)!==normalizeUser(authConfig?.username)){
      error.textContent='Incorrect username or password.';
      return;
    }
    button.disabled=true;button.textContent='Signing in…';error.textContent='';
    try{
      const token=await decryptCredential(authConfig,password);
      const info=await verifyToken(token);
      info.adminUsername=authConfig.username;
      unlock(info,token);
    }catch(e){
      clearSession();
      error.textContent=e.message;
    }finally{
      button.disabled=false;button.textContent='Sign in to Admin';
    }
  }

  async function setupLogin(event){
    event.preventDefault();
    const username=String($('#setupUsername')?.value||'').trim();
    const password=$('#setupPassword')?.value||'';
    const password2=$('#setupPassword2')?.value||'';
    const token=String($('#setupToken')?.value||'').trim();
    const button=$('#authSetupSubmit');
    const error=$('#authError');
    if(username.length<3){error.textContent='Username must be at least 3 characters.';return;}
    if(password.length<12){error.textContent='Password must be at least 12 characters.';return;}
    if(password!==password2){error.textContent='Passwords do not match.';return;}
    if(!token){error.textContent='Enter the GitHub token for one-time setup.';return;}
    button.disabled=true;button.textContent='Securing login…';error.textContent='';
    try{
      const info=await verifyToken(token);
      const config=await encryptCredential(token,password,username);
      await publishConfig(token,config);
      authConfig=config;
      sessionStorage.setItem(CONFIG_SESSION_KEY,JSON.stringify(config));
      info.adminUsername=username;
      unlock(info,token);
      setTimeout(()=>alert('YK Admin login is configured. From now on, use only your username and password. Keep your password safe.'),100);
    }catch(e){
      error.textContent=e.message;
    }finally{
      button.disabled=false;button.textContent=authConfig?'Create Secure Login':'Create Secure Login';
    }
  }

  async function restore(){
    const token=sessionStorage.getItem(TOKEN_KEY)||'';
    const saved=sessionStorage.getItem(USER_KEY)||'';
    const wasExpired=!!token&&expired();
    if(!token||!saved||wasExpired){
      clearSession();
      lock(wasExpired?'Session expired. Sign in again.':'');
      return;
    }
    try{
      const info=await verifyToken(token);
      const stored=JSON.parse(saved);
      info.adminUsername=stored.adminUsername||authConfig?.username||info.login;
      unlock(info,token);
    }catch(e){
      clearSession();
      lock('Your previous admin session is no longer valid. Sign in again.');
    }
  }

  async function start(){
    injectAuthUI();
    try{
      authConfig=await loadConfig();
    }catch(e){
      renderSetup(false,e.message);
      return;
    }
    await restore();
  }

  ['click','keydown','touchstart','mousemove'].forEach(type=>document.addEventListener(type,markActivity,{passive:true}));

  window.YKAdminAuth={
    isAuthenticated:()=>document.documentElement.classList.contains('yk-admin-authenticated')&&!expired(),
    getToken:()=>sessionStorage.getItem(TOKEN_KEY)||'',
    getUser:()=>profile,
    signOut
  };

  start();
})();