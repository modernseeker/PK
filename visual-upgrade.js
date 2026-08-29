(function(){
  "use strict";

  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress=document.getElementById("pageProgress");
  let progressFrame=0;

  function updateProgress(){
    progressFrame=0;
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    if(progress)progress.style.width=`${Math.min(100,(window.scrollY/max)*100)}%`;
  }

  window.addEventListener("scroll",()=>{
    if(!progressFrame)progressFrame=requestAnimationFrame(updateProgress);
  },{passive:true});
  updateProgress();

  if(!reduceMotion&&"IntersectionObserver" in window){
    const revealTargets=[
      ".category-rail-head",
      ".category-grid",
      ".service-strip",
      ".section-kicker-row",
      ".brand-panel",
      ".collection-grid",
      ".featured-grid",
      ".catalog-head",
      ".filters",
      ".catalog-guidance",
      ".product-grid",
      ".business-card",
      ".faq-intro",
      ".faq-list",
      ".why-yk-head",
      ".why-yk-grid",
      ".contact-card"
    ];
    const revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },{threshold:.11,rootMargin:"0px 0px -40px"});
    revealTargets.forEach((selector,index)=>{
      document.querySelectorAll(selector).forEach(element=>{
        element.setAttribute("data-reveal","");
        element.setAttribute("data-reveal-delay",String(index%3));
        revealObserver.observe(element);
      });
    });
  }

  document.querySelectorAll("[data-quick-search]").forEach(button=>{
    button.addEventListener("click",()=>{
      const search=document.getElementById("heroSearch");
      const category=document.getElementById("heroCategory");
      if(search)search.value=button.dataset.quickSearch||"";
      if(category)category.value="";
      document.getElementById("heroSearchBtn")?.click();
    });
  });

  const hero=document.querySelector(".hero-shell");
  if(hero&&!reduceMotion){
    hero.addEventListener("pointermove",event=>{
      const box=hero.getBoundingClientRect();
      hero.style.setProperty("--hero-x",`${((event.clientX-box.left)/box.width)*100}%`);
      hero.style.setProperty("--hero-y",`${((event.clientY-box.top)/box.height)*100}%`);
    },{passive:true});
  }

  const navLinks=Array.from(document.querySelectorAll("#nav a[href^='#']"));
  const navSections=navLinks.map(link=>{
    const target=document.querySelector(link.getAttribute("href"));
    return target?{link,target}:null;
  }).filter(Boolean);
  if(navSections.length&&"IntersectionObserver" in window){
    const navObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      navSections.forEach(({link,target})=>link.classList.toggle("active",target===visible.target));
    },{rootMargin:"-30% 0px -58%",threshold:[0,.1,.35]});
    navSections.forEach(({target})=>navObserver.observe(target));
  }
})();

