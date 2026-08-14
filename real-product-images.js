(()=>{
const realImages={
  1:{url:"https://rameshcorp.com/assets/new_pages/images/litmus/products/wireroll.jpg",backupUrl:"https://rameshcorp.com/assets/new_pages/images/litmus/products/bigwire.png",source:"Ramesh Corp / Lotus Winding Wires official",fallback:"assets/product-wire.svg"},
  3:{url:"https://rameshcorp.com/assets/new_pages/images/litmus/products/newfr.png",source:"Litmus official",fallback:"assets/product-wire.svg"},
  4:{url:"https://www.chintglobal.com/content/dam/chint/global/product-center/low-voltage/iec/final-power-distribution/mcb/nb1-63g/product-image/NB1-63G%20%20C63%201P-MCB-Front.png",source:"CHINT official",fallback:"assets/product-breaker.svg"},
  5:{url:"https://www.chintglobal.com/content/dam/chint/global/product-center/low-voltage/iec/secondary-power-distribution/mccb/nm8n/product-image/new/NM8N-125S%204P-MCCB-1.png",source:"CHINT official",fallback:"assets/product-breaker.svg"},
  8:{url:"https://www.chintglobal.com/content/dam/chint/global/product-center/low-voltage/iec/industrial-control/ac-contactor/nc1/product-image/new/NC1-09N-AC%20Contactor-1.jpg",source:"CHINT official",fallback:"assets/product-contactor.svg"},
  16:{url:"https://www.tibcon.net/images/a57ce4dc6c9c470d9edc182ce6ef5a3b.png",source:"TIBCON official",fallback:"assets/product-capacitor.svg"},
  17:{url:"https://www.tibcon.net/images/68301a26a036ea9d85b6ffa5c7a89d58.png",source:"TIBCON official",fallback:"assets/product-capacitor.svg"},
  18:{url:"https://www.tibcon.net/images/3dd9fff8cd0c9b681509ac561fd67a1b.png",source:"TIBCON official",fallback:"assets/product-capacitor.svg"}
};

const trendingIds=new Set([4,8,16,1]);

if(typeof products!=="undefined"){
  products.forEach(p=>{
    const real=realImages[p.id];
    if(!real) return;
    p.fallbackImg=p.img||real.fallback;
    p.img=real.url;
    p.imageSource=real.source;
    p.realProductImage=true;
  });

  try{ if(typeof renderFeatured==="function") renderFeatured(); }catch(e){}
  try{ if(typeof renderProducts==="function") renderProducts(); }catch(e){}
}

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
