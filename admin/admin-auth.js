(()=>{
  const TOKEN_KEY='yk_admin_github_token_session';
  const USER_KEY='yk_admin_authenticated_user';
  const LAST_KEY='yk_admin_last_activity';
  const ALLOWED_USER='modernseeker';
  const REPO='modernseeker/PK';
  const TIMEOUT_MS=30*60*1000;
  const $=s=>document.querySelector(s);
  let profile=null;
  let timer=null;

  function injectAuthUI(){
    if(!$('#authScreen')){
      const screen=document.createElement('div');
      screen.className='auth-screen';
      screen.id='authScreen';
      screen.innerHTML=`<div class="auth-card">
        <div class="auth-brand"><img src="../assets/yk-logo.svg" alt="YK Electric"><div><strong>YK Electric Admin</strong><span>SECURE STORE MANAGEMENT</span></div></div>
        <h1>Admin sign in</h1>
        <p>Sign in with the GitHub credential authorized to manage the YK Electric repository.</p>
        <form id="authForm">
          <label class="auth-field"><span>GitHub access token</span><input id="authToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required></label>
          <button class="auth-submit" id="authSubmit" type="submit">Sign in to Admin</button>
          <div class="auth-error" id="authError"></div>
        </form>
        <div class="auth-help"><b>Protected access:</b> only the GitHub account <b>${ALLOWED_USER}</b> with write permission to <b>${REPO}</b> is accepted. The credential stays in this browser session only and is cleared on sign out or timeout.<span class="auth-lock-note">Session automatically locks after 30 minutes of inactivity.</span></div>
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

  async function api(url,token){
    const res=await fetch(url,{headers:authHeaders(token),cache:'no-store'});
    const body=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(body.message||`GitHub authentication failed (${res.status})`);
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

  function renderUser(){
    const holder=$('#authUser');
    if(!holder||!profile)return;
    const avatar=String(profile.avatar||'').replace(/"/g,'&quot;');
    holder.innerHTML=`<img src="${avatar}" alt=""><span>${profile.login}</span><button type="button" id="authSignOut">Sign out</button>`;
    $('#authSignOut').onclick=()=>signOut();
  }

  function unlock(info){
    profile=info;
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
    const error=$('#authError');
    if(error)error.textContent=message;
    const input=$('#authToken');
    if(input)input.value='';
    const holder=$('#authUser');
    if(holder)holder.innerHTML='';
  }

  function signOut(message='Signed out securely.'){
    clearSession();
    if(timer)clearInterval(timer);
    timer=null;
    lock(message);
  }

  async function login(event){
    event.preventDefault();
    const input=$('#authToken');
    const button=$('#authSubmit');
    const error=$('#authError');
    const token=(input?.value||'').trim();
    if(!token){error.textContent='Enter your GitHub access token.';return;}
    button.disabled=true;button.textContent='Verifying…';error.textContent='';
    try{
      const info=await verifyToken(token);
      sessionStorage.setItem(TOKEN_KEY,token);
      sessionStorage.setItem(USER_KEY,JSON.stringify(info));
      sessionStorage.setItem(LAST_KEY,String(Date.now()));
      unlock(info);
    }catch(e){clearSession();error.textContent=e.message;}
    finally{button.disabled=false;button.textContent='Sign in to Admin';}
  }

  async function restore(){
    const token=sessionStorage.getItem(TOKEN_KEY)||'';
    const saved=sessionStorage.getItem(USER_KEY)||'';
    const wasExpired=!!token&&expired();
    if(!token||!saved||wasExpired){clearSession();lock(wasExpired?'Session expired. Sign in again.':'');return;}
    try{
      const info=await verifyToken(token);
      sessionStorage.setItem(USER_KEY,JSON.stringify(info));
      unlock(info);
    }catch(e){clearSession();lock('Your previous admin session is no longer valid. Sign in again.');}
  }

  injectAuthUI();
  ['click','keydown','touchstart','mousemove'].forEach(type=>document.addEventListener(type,markActivity,{passive:true}));
  $('#authForm')?.addEventListener('submit',login);

  window.YKAdminAuth={
    isAuthenticated:()=>document.documentElement.classList.contains('yk-admin-authenticated')&&!expired(),
    getToken:()=>sessionStorage.getItem(TOKEN_KEY)||'',
    getUser:()=>profile,
    signOut
  };

  restore();
})();