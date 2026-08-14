(()=>{
const realImages={
  1:{url:"assets/product-photos/lotus-enamel-wire.webp",source:"Ramesh Corp / Lotus Winding Wires official",sourceUrl:"https://rameshcorp.com/industry",fallback:"assets/product-wire.svg"},
  3:{url:"assets/product-photos/litmus-house-wire.webp",source:"Litmus official",sourceUrl:"https://www.litmus.com.np/",fallback:"assets/product-wire.svg"},
  4:{url:"assets/product-photos/chint-nb1-mcb.webp",source:"CHINT official",sourceUrl:"https://www.chintglobal.com/global/en/products/low-voltage/iec/final-power-distribution/nb1-63g.html",fallback:"assets/product-breaker.svg"},
  5:{url:"assets/product-photos/chint-nm8-mccb.webp",source:"CHINT official",sourceUrl:"https://www.chintglobal.com/global/en/products/low-voltage/iec/secondary-power-distribution/nm8n.html",fallback:"assets/product-breaker.svg"},
  6:{url:"assets/product-photos/chint-nxble-32.webp",source:"CHINT official",sourceUrl:"https://www.chintglobal.com/global/en/products/low-voltage/iec/final-power-distribution/nxble-32.html",fallback:"assets/product-breaker.svg"},
  7:{url:"assets/product-photos/chint-nu6-iig.webp",source:"CHINT official",sourceUrl:"https://www.chintglobal.com/global/en/products/low-voltage/iec/final-power-distribution/nu6-iig.html",fallback:"assets/product-breaker.svg"},
  8:{url:"assets/product-photos/chint-nc1-contactor.webp",source:"CHINT official",sourceUrl:"https://www.chintglobal.com/global/en/products/low-voltage/iec/industrial-control/nc1.html",fallback:"assets/product-contactor.svg"},
  9:{url:"assets/product-photos/chint-nr2.webp",source:"CHINT official",sourceUrl:"https://www.chintglobal.com/global/en/products/low-voltage/iec/industrial-control/nr2.html",fallback:"assets/product-contactor.svg"},
  12:{url:"assets/product-photos/selec-800xu.webp",source:"Selec official",sourceUrl:"https://www.selec.com/product-details/analog-timers-225mm-din-rail-2-functions-12-time-ranges-universal-power-supply",fallback:"assets/product-automation.svg"},
  13:{url:"assets/product-photos/selec-tc544a.webp",source:"Selec official",sourceUrl:"https://www.selec.com/product-details/temprature-controllerdigital1",fallback:"assets/product-automation.svg"},
  16:{url:"assets/product-photos/tibcon-motor-run.webp",source:"TIBCON official",sourceUrl:"https://www.tibcon.net/",fallback:"assets/product-capacitor.svg"},
  17:{url:"assets/product-photos/tibcon-submersible.webp",source:"TIBCON official",sourceUrl:"https://www.tibcon.net/",fallback:"assets/product-capacitor.svg"},
  18:{url:"assets/product-photos/tibcon-pfc.webp",source:"TIBCON official",sourceUrl:"https://www.tibcon.net/",fallback:"assets/product-capacitor.svg"}
};

const verifiedBrands=["CHINT","Selec","Lotus","Tibcon","Litmus"];
const verifiedProductFields={
  6:{model:"NXBLE-32 / NL1",tags:"chint nxble nl1 rccb rcbo earth leakage breaker"},
  7:{model:"NU6-IIG",tags:"chint nu6 iig spd surge protector lightning"},
  12:{name:"Analog Timer",model:"800XU",spec:"On-delay / interval control",tags:"selec 800xu timer analog relay automation"},
  13:{model:"TC544A",tags:"selec tc544a temperature controller pid thermocouple"}
};
const trendingIds=new Set([4,8,16,1]);

function applyVerifiedPresentation({render=true}={}){
  if(typeof products!=="undefined"){
    products.forEach(p=>{
      const fields=verifiedProductFields[p.id];
      if(fields) Object.assign(p,fields);
      const real=realImages[p.id];
      if(!real) return;
      p.fallbackImg=p.fallbackImg||real.fallback;
      p.img=real.url;
      p.imageSource=real.source;
      p.imageSourceUrl=real.sourceUrl;
      p.realProductImage=true;
    });
  }

  if(typeof brands!=="undefined"&&Array.isArray(brands)){
    brands.splice(0,brands.length,...verifiedBrands);
  }

  if(render){
    try{ if(typeof renderBrandStrip==="function") renderBrandStrip(); }catch(e){}
    try{ if(typeof renderBrandFilter==="function") renderBrandFilter(); }catch(e){}
    try{ if(typeof renderFeatured==="function") renderFeatured(); }catch(e){}
    try{ if(typeof renderProducts==="function") renderProducts(); }catch(e){}
  }
}

window.YKCatalogPresentation={brands:[...verifiedBrands]};
applyVerifiedPresentation();

const normalized={};
Object.entries(realImages).forEach(([id,item])=>{
  try{ normalized[new URL(item.url,location.href).href]={id:Number(id),item}; }catch(e){}
  if(item.backupUrl){
    try{ normalized[new URL(item.backupUrl,location.href).href]={id:Number(id),item,backup:true}; }catch(e){}
  }
});

function decorateRealProductImages(){
  document.querySelectorAll('.product-card img').forEach(img=>{
    const match=normalized[img.src];
    if(!match) return;
    img.dataset.realProductImage='1';
    img.decoding='async';
    if(trendingIds.has(match.id)) img.fetchPriority='high';
  });
}

decorateRealProductImages();
requestAnimationFrame(decorateRealProductImages);

document.addEventListener("error",e=>{
  const img=e.target;
  if(!(img instanceof HTMLImageElement)) return;
  const match=normalized[img.src];
  if(match){
    const {item}=match;
    if(item.backupUrl&&!img.dataset.realBackupDone){
      img.dataset.realBackupDone="1";
      img.src=item.backupUrl;
      return;
    }
    if(img.dataset.realFallbackDone) return;
    img.dataset.realFallbackDone="1";
    img.src=item.fallback;
  }else{
    const fallback=img.dataset.fallback;
    if(!fallback||img.dataset.genericFallbackDone) return;
    img.dataset.genericFallbackDone="1";
    img.src=fallback;
  }
  const visual=img.closest('.product-image,.detail-visual,.related-item');
  if(visual){visual.classList.remove('image-real');visual.classList.add('image-placeholder')}
},true);
})();
