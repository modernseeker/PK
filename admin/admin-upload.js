(()=>{
  const cfg=window.YKSupabaseConfig||{};
  const MAX_FILE_BYTES=12*1024*1024;
  const MAX_DIMENSION=1400;
  const WEBP_QUALITY=.86;
  const $=s=>document.querySelector(s);
  let pendingBlob=null,pendingName='',previewUrl='',resubmitting=false,uploading=false;

  function slugify(value){const base=String(value||'product').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55);return base||'product';}
  function currentImage(){return $('#productForm [name="img"]')?.value?.trim()||'../assets/product-breaker.svg';}
  function setStatus(text,state=''){const el=$('#productUploadStatus');if(el){el.textContent=text;el.dataset.state=state;}}
  function revokePreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}}
  function clearPending(refresh=true){pendingBlob=null;pendingName='';revokePreview();const input=$('#productImageFile');if(input)input.value='';const remove=$('#productUploadRemove');if(remove)remove.hidden=true;if(refresh)refreshPreview();}
  function refreshPreview(src=currentImage()){const img=$('#productUploadPreviewImg');if(!img)return;img.src=src;img.onerror=()=>{img.onerror=null;img.src='../assets/product-breaker.svg';};if(!pendingBlob)setStatus('Current product image. Choose a new image to replace it.');}

  function injectUploadUI(){
    const form=$('#productForm');if(!form||$('#productImageFile'))return;const imageField=form.querySelector('[name="img"]')?.closest('label');if(!imageField)return;
    const box=document.createElement('div');box.className='product-image-upload';box.innerHTML=`
      <div class="product-upload-preview"><img id="productUploadPreviewImg" src="../assets/product-breaker.svg" alt="Product image preview"></div>
      <div class="product-upload-copy"><b>Product image</b><p>Choose a photo from this device. It will be resized and compressed automatically before secure cloud upload.</p><div class="product-upload-actions"><label class="product-upload-pick">Choose Image<input id="productImageFile" type="file" accept="image/*"></label><button class="product-upload-remove" id="productUploadRemove" type="button" hidden>Remove selected</button></div><span class="product-upload-status" id="productUploadStatus">Current product image.</span></div>
      <div class="product-upload-note">Images are stored in YK Electric's Supabase <b>${cfg.productBucket||'product-images'}</b> bucket. The URL field below remains available for manual image URLs.</div>`;
    imageField.parentNode.insertBefore(box,imageField);$('#productImageFile').addEventListener('change',onChooseFile);$('#productUploadRemove').onclick=()=>clearPending(true);refreshPreview();
  }

  async function loadBitmap(file){
    if('createImageBitmap'in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){}}
    return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read this image.'));};img.src=url;});
  }
  async function compressImage(file){
    const image=await loadBitmap(file),width=image.width||image.naturalWidth,height=image.height||image.naturalHeight,scale=Math.min(1,MAX_DIMENSION/Math.max(width,height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const ctx=canvas.getContext('2d',{alpha:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);if(typeof image.close==='function')image.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',WEBP_QUALITY));if(!blob)throw new Error('Your browser could not prepare this image for upload.');return blob;
  }
  async function onChooseFile(event){
    const file=event.target.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')){setStatus('Please choose an image file.','error');event.target.value='';return;}
    if(file.size>MAX_FILE_BYTES){setStatus('Image is too large. Choose an image under 12 MB.','error');event.target.value='';return;}
    try{setStatus('Preparing image…','busy');const blob=await compressImage(file);pendingBlob=blob;pendingName=file.name;revokePreview();previewUrl=URL.createObjectURL(blob);$('#productUploadPreviewImg').src=previewUrl;$('#productUploadRemove').hidden=false;setStatus(`Ready to upload · ${Math.max(1,Math.round(blob.size/1024))} KB WebP`,'ok');}
    catch(e){pendingBlob=null;pendingName='';setStatus(e.message||'Could not prepare image.','error');event.target.value='';refreshPreview();}
  }

  async function uploadPendingImage(){
    if(!pendingBlob)return null;if(!window.YKAdminAuth?.isAuthenticated?.())throw new Error('Sign in before uploading an image.');
    const token=window.YKAdminAuth.getToken();if(!token)throw new Error('Your Supabase session is unavailable. Sign in again.');
    const name=$('#productForm [name="name"]')?.value?.trim()||pendingName||'product';const path=`products/${slugify(name)}-${Date.now()}.webp`;const bucket=cfg.productBucket||'product-images';
    const res=await fetch(`${cfg.url}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`,{method:'POST',headers:{'apikey':cfg.publishableKey,'Authorization':`Bearer ${token}`,'Content-Type':'image/webp','x-upsert':'false'},body:pendingBlob});
    const body=await res.json().catch(()=>null);if(!res.ok)throw new Error(body?.message||body?.error||`Image upload failed (${res.status})`);
    return `${cfg.url}/storage/v1/object/public/${bucket}/${path}`;
  }

  async function interceptSubmit(event){
    if(event.target?.id!=='productForm')return;if(resubmitting){resubmitting=false;return;}if(!pendingBlob||uploading)return;
    event.preventDefault();event.stopImmediatePropagation();uploading=true;const form=event.target,save=form.querySelector('.modal-actions .primary-btn'),oldText=save?.textContent||'Save Product';if(save){save.disabled=true;save.textContent='Uploading image…';}
    try{setStatus('Uploading image to Supabase Storage…','busy');const url=await uploadPendingImage();if(url&&form.elements.img)form.elements.img.value=url;pendingBlob=null;pendingName='';revokePreview();const input=$('#productImageFile');if(input)input.value='';const remove=$('#productUploadRemove');if(remove)remove.hidden=true;setStatus('Image uploaded. Saving product draft…','ok');resubmitting=true;form.requestSubmit();}
    catch(e){setStatus(e.message||'Image upload failed.','error');}
    finally{uploading=false;if(save){save.disabled=false;save.textContent=oldText;}}
  }

  function watchModal(){const modal=$('#productModal');if(!modal)return;new MutationObserver(()=>requestAnimationFrame(()=>{if(modal.hidden){clearPending(false);return;}clearPending(false);refreshPreview(currentImage());})).observe(modal,{attributes:true,attributeFilter:['hidden']});}
  injectUploadUI();watchModal();document.addEventListener('submit',interceptSubmit,true);
})();
