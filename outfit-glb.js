'use strict';
/* VNE RAMOK / 23 — unified original mannequin and garments.
   Loads only the selected licensed GLB files. Renders on demand, not continuously.
   The garments are independently fitted approximations, NOT size-accurate try-on. */
(() => {
  const oldEngine=window.VROutfit3D;
  if (!oldEngine || typeof fetch!=='function') return;
  const root='assets/studio-23/';
  // All 7 models are authored around the SAME A-pose and 0..5.1 scale.
  const models={
    body:{file:'mannequin.glb',scale:[1,1,1],y:0},
    tee:{file:'tee.glb',scale:[1,1,1],y:0},
    hoodie:{file:'hoodie.glb',scale:[1,1,1],y:0},
    bomber:{file:'bomber.glb',scale:[1,1,1],y:0},
    jeans:{file:'jeans.glb',scale:[1,1,1],y:0},
    cargo:{file:'cargo.glb',scale:[1,1,1],y:0},
    beanie:{file:'beanie.glb',scale:[1,1,1],y:0}
  };
  const VS=`
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUV;
    uniform float uYaw, uPitch, uScale, uRatio;
    varying vec3 vNormal;
    void main(){
      float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
      vec3 p=aPosition-vec3(0.,2.57,0.);
      p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
      p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);
      vec3 n=aNormal;
      n=vec3(cy*n.x+sy*n.z,n.y,-sy*n.x+cy*n.z);
      vNormal=normalize(vec3(n.x,cp*n.y-sp*n.z,sp*n.y+cp*n.z));
      float depth=8.1-p.z;
      gl_Position=vec4(p.x*uScale/uRatio,p.y*uScale,depth*.45-1.25,depth);
    }
  `;
  const FS=`
    precision mediump float;
    uniform vec3 uColor;
    varying vec3 vNormal;
    void main(){
      vec3 n=normalize(vNormal);
      float diffuse=max(0.,dot(n,normalize(vec3(-.55,.95,1.4))));
      float fill=max(0.,dot(n,normalize(vec3(.9,.35,-.85))));
      float light=.56+.39*diffuse+.10*fill;
      gl_FragColor=vec4(pow(clamp(uColor*light,0.,1.),vec3(.92)),1.);
    }
  `;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rgb=str=>{
    let s=String(str||'#888888').replace('#','');
    if(s.length===3)s=s.split('').map(x=>x+x).join('');
    if(!/^[\da-f]{6}$/i.test(s))s='888888';
    return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255);
  };
  function matMul(a,b){
    const out=new Float32Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let i=0;i<4;i++)out[c*4+r]+=a[i*4+r]*b[c*4+i];
    return out;
  }
  function matTRS(n){
    if(n.matrix)return Float32Array.from(n.matrix);
    const [x,y,z,w]=n.rotation||[0,0,0,1], [sx,sy,sz]=n.scale||[1,1,1], [tx,ty,tz]=n.translation||[0,0,0];
    return Float32Array.from([
      (1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,
      2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,
      2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,
      tx,ty,tz,1
    ]);
  }
  const I=Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function readGLB(buf){
    const d=new DataView(buf);
    if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==buf.byteLength)throw Error('Неверный формат GLB');
    let off=12,json=null,binary=null;
    while(off+8<=buf.byteLength){
      const size=d.getUint32(off,true),type=d.getUint32(off+4,true);off+=8;
      if(off+size>buf.byteLength)throw Error('Повреждённый GLB');
      if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off,size)).replace(/\u0000+$/,''));
      if(type===0x004e4942)binary=buf.slice(off,off+size);
      off+=size;
    }
    if(!json||!binary)throw Error('Не найдены JSON или BIN блоки в GLB');
    if(json.extensionsRequired?.length && json.extensionsRequired.some(x=>x!=='KHR_materials_pbrSpecularGlossiness'))throw Error('Неподдерживаемое расширение GLB');
    return {json,binary};
  }
  function accessor(doc,buffer,index){
    const a=doc.accessors[index],view=doc.bufferViews[a.bufferView];
    if(!a||!view||a.sparse)throw Error('Неподдерживаемый accessor GLB');
    const len={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    const comps={5121:1,5123:2,5125:4,5126:4};
    const bytes=comps[a.componentType];
    if(!len||!bytes)throw Error('Неподдерживаемый тип буфера');
    const step=view.byteStride||len*bytes;
    const data=new DataView(buffer),pos=(view.byteOffset||0)+(a.byteOffset||0);
    const out=a.componentType===5126?new Float32Array(a.count*len):new Uint32Array(a.count*len);
    for(let i=0;i<a.count;i++)for(let k=0;k<len;k++){
      const o=pos+i*step+k*bytes;
      out[i*len+k]=a.componentType===5126?data.getFloat32(o,true):a.componentType===5125?data.getUint32(o,true):a.componentType===5123?data.getUint16(o,true):data.getUint8(o);
    }
    return out;
  }
  function transform(p,m){return [
    m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
    m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
    m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]
  ];}
  function normal(n,m){const v=[m[0]*n[0]+m[4]*n[1]+m[8]*n[2],m[1]*n[0]+m[5]*n[1]+m[9]*n[2],m[2]*n[0]+m[6]*n[1]+m[10]*n[2]];const len=Math.hypot(...v)||1;return v.map(x=>x/len);}
  function flattenGLB(data,kind){
    const {json:j,binary:bin}=data,meta=models[kind],parts=[];
    const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
    const traverse=(id,parent)=>{
      const n=j.nodes[id],m=matMul(parent,matTRS(n));
      // Four extra meshes in the provided beanie are bulky eyewear attachments.
      // Keep the textured knitted cap shell and omit the non-fashion goggles.
      if(n.mesh!==undefined){
        for(const prim of j.meshes[n.mesh].primitives){
          if((prim.mode!==undefined&&prim.mode!==4)||prim.attributes?.POSITION===undefined||prim.indices===undefined)continue;
          const p=accessor(j,bin,prim.attributes.POSITION),nor=prim.attributes.NORMAL!==undefined?accessor(j,bin,prim.attributes.NORMAL):null;
          const uv=prim.attributes.TEXCOORD_0!==undefined?accessor(j,bin,prim.attributes.TEXCOORD_0):null;
          const indices=accessor(j,bin,prim.indices),outP=new Float32Array(p.length),outN=new Float32Array(p.length);
          for(let i=0;i<p.length;i+=3){
            const xyz=transform([p[i],p[i+1],p[i+2]],m),nn=normal(nor?[nor[i],nor[i+1],nor[i+2]]:[0,0,1],m);
            for(let k=0;k<3;k++){outP[i+k]=xyz[k];outN[i+k]=nn[k];bounds[0][k]=Math.min(bounds[0][k],xyz[k]);bounds[1][k]=Math.max(bounds[1][k],xyz[k]);}
          }
          parts.push({positions:outP,normals:outN,uv:uv||new Float32Array(p.length/3*2),indices,material:prim.material??null,role:String(j.materials?.[prim.material]?.name||'FABRIC').toLowerCase()});
        }
      }
      for(const child of n.children||[])traverse(child,m);
    };
    for(const root of j.scenes[j.scene||0].nodes||[])traverse(root,I);
    if(!parts.length)throw Error('В модели нет треугольных мешей');
    const center=[(bounds[0][0]+bounds[1][0])/2,0,(bounds[0][2]+bounds[1][2])/2];
    for(const part of parts){
      for(let i=0;i<part.positions.length;i+=3){
        const fit=meta.fit||{};
        part.positions[i]=(part.positions[i]-center[0])*meta.scale[0]*(fit.x??1);
        part.positions[i+1]=part.positions[i+1]*meta.scale[1]*(fit.y??1)+meta.y+(fit.shiftY||0);
        part.positions[i+2]=(part.positions[i+2]-center[2])*meta.scale[2]*(fit.z??1)+(fit.shiftZ||0);
      }
    }
    return {parts,json:j,binary:bin};
  }
  function compile(gl,kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('GLSL: '+reason)}return s;}
  function makeProgram(gl,vertex=VS,fragment=FS){const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,vertex),f=compile(gl,gl.FRAGMENT_SHADER,fragment);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  function getTexturePixels(j,binary,imgIndex){
    const image=j.images?.[imgIndex];if(!image||image.bufferView===undefined)return null;
    const view=j.bufferViews[image.bufferView];
    const bytes=binary.slice(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
    return {blob:new Blob([bytes],{type:image.mimeType||'image/png'})};
  }
  function loadImage(blob){return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Не удалось загрузить текстуру'))};img.src=url;
  })}
  class ModelViewer {
    constructor(stage){
      this.stage=stage;this.canvas=document.createElement('canvas');this.canvas.className='outfit-3d-view';
      this.canvas.tabIndex=0;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','3D-манекен с моделями одежды. Перетаскивай для поворота.');
      // Prefer WebGL 1 for GLSL ES 1.00; the source GLB viewer was verified on this path.
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'default'})||this.canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'default'});
      if(!this.gl)throw Error('WebGL недоступен');
      this.uint32=(typeof WebGL2RenderingContext!=='undefined' && this.gl instanceof WebGL2RenderingContext) || !!this.gl.getExtension('OES_element_index_uint');
      if(!this.uint32)throw Error('Требуется OES_element_index_uint');
      this.compatShaders=false;this.p=makeProgram(this.gl);
      this.gl.useProgram(this.p);
      this.attrib={};for(const a of ['Position','Normal','UV'])this.attrib[a]=this.gl.getAttribLocation(this.p,'a'+a);
      this.uniform={};for(const a of ['Yaw','Pitch','Scale','Ratio','Color'])this.uniform[a]=this.gl.getUniformLocation(this.p,'u'+a);
      this.gl.enable(this.gl.DEPTH_TEST);this.gl.depthFunc(this.gl.LEQUAL);this.gl.disable(this.gl.CULL_FACE);
      this.models=new Map();this.loading=new Map();this.requestToken=0;this.destroyed=false;this.state={top:'tees',bottom:'jeans',hat:false,tc:'#292b28',bc:'#858175'};
      this.yaw=-.18;this.pitch=0;this.zoom=1;this.visible=true;this.pending=false;this.pointer=null;
      stage.appendChild(this.canvas);stage.classList.add('outfit-3d-active');
      this.controls=document.createElement('div');this.controls.className='outfit-orbit-controls';
      this.controls.innerHTML='<span class="outfit-orbit-label">VNE 23 / ORIGINAL FASHION MODEL</span><div class="outfit-orbit-buttons"><button type="button" data-orbit="left" aria-label="Повернуть влево">↶</button><button type="button" data-orbit="front" aria-label="Спереди">FRONT</button><button type="button" data-orbit="right" aria-label="Повернуть вправо">↷</button><button type="button" data-orbit="zoom" aria-label="Приблизить">＋</button></div><span class="outfit-orbit-tip">DRAG TO ROTATE / 360°</span>';
      stage.appendChild(this.controls);
      this.controls.addEventListener('click',e=>{const b=e.target.closest('[data-orbit]');if(!b)return;const a=b.dataset.orbit;if(a==='front'){this.yaw=0;this.pitch=0}else if(a==='zoom'){this.zoom=this.zoom===1?1.28:1}else this.yaw+=a==='left'?-Math.PI/4:Math.PI/4;this.render()});
      this.canvas.addEventListener('pointerdown',e=>{this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId)});
      this.canvas.addEventListener('pointermove',e=>{if(!this.pointer||e.pointerId!==this.pointer.id)return;this.yaw+=(e.clientX-this.pointer.x)*.008;this.pitch=clamp(this.pitch+(e.clientY-this.pointer.y)*.004,-.25,.25);this.pointer.x=e.clientX;this.pointer.y=e.clientY;this.render()});
      for(const ev of ['pointerup','pointercancel'])this.canvas.addEventListener(ev,e=>{if(this.pointer?.id===e.pointerId)this.pointer=null});
      this.canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.18;if(e.key==='ArrowRight')this.yaw+=.18;if(e.key==='ArrowUp')this.pitch=clamp(this.pitch-.1,-.25,.25);if(e.key==='ArrowDown')this.pitch=clamp(this.pitch+.1,-.25,.25);this.render()});
      this.ro=new ResizeObserver(()=>this.render());this.ro.observe(stage);
      this.io=new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting||false;if(this.visible)this.render()},{threshold:.01});this.io.observe(stage);
      this.visibility=()=>{if(!document.hidden)this.render()};document.addEventListener('visibilitychange',this.visibility);
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stage.dispatchEvent(new CustomEvent('vr:outfit-3d-error',{detail:{error:'Контекст WebGL потерян'}}));},{once:true});
      // The parent builder immediately calls update() with the real selection.
      // Do not prefetch the unused default outfit.
    }
    async fetchModel(key){
      if(this.models.has(key))return this.models.get(key);
      if(this.loading.has(key))return this.loading.get(key);
      const task=(async()=>{
        const response=await fetch(root+models[key].file);
        if(!response.ok)throw Error('HTTP '+response.status+' / '+models[key].file);
        const glb=flattenGLB(readGLB(await response.arrayBuffer()),key);
        const gl=this.gl,model={parts:[],textures:[],key};
        // Extract embedded images before discarding the original GLB buffer.
        const textures=glb.json.textures||[],materials=glb.json.materials||[];
        const imageCache=new Map();
        for(const part of glb.parts){
          const make=(target,array)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,array,gl.STATIC_DRAW);return b};
          const bP=make(gl.ARRAY_BUFFER,part.positions),bN=make(gl.ARRAY_BUFFER,part.normals),bUV=make(gl.ARRAY_BUFFER,part.uv),bI=make(gl.ELEMENT_ARRAY_BUFFER,part.indices);
          const material=materials[part.material]||{},texIndex=material.pbrMetallicRoughness?.baseColorTexture?.index;
          let tex=null;
          if(texIndex!==undefined){
            const imgIndex=textures[texIndex]?.source;
            if(imgIndex!==undefined){
              if(!imageCache.has(imgIndex))imageCache.set(imgIndex,(async()=>{
                const source=getTexturePixels(glb.json,glb.binary,imgIndex);if(!source)return null;
                const image=await loadImage(source.blob);
                const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
                const pot=x=>(x&(x-1))===0;
                if(pot(image.width)&&pot(image.height)){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}
                else{gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)}
                gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
                model.textures.push(t);return t;
              })());
              tex=await imageCache.get(imgIndex);
            }
          }
          model.parts.push({bP,bN,bUV,bI,count:part.indices.length,texture:tex,role:part.role});
        }
        this.models.set(key,model);return model;
      })();
      this.loading.set(key,task);
      try{return await task}finally{this.loading.delete(key)}
    }
    selected(){const d=this.state;return ['body',d.top==='hoodies'?'hoodie':d.top==='jackets'?'bomber':'tee',d.bottom==='pants'?'cargo':'jeans',...(d.hat?['beanie']:[])];}
    update(d){this.state=d;this.canvas.setAttribute('aria-label',`Реальные GLB-модели: ${d.topName}, ${d.bottomName}${d.hatName?', '+d.hatName:''}. Вращай для обзора.`);this.sync()}
    async sync(){
      const token=++this.requestToken;
      try{
        const selected=this.selected();
        // Cache each mesh, but do not download unselected garments.
        await Promise.all(selected.map(x=>this.fetchModel(x)));
        if(this.destroyed||token!==this.requestToken)return;
        this.render();
      }catch(err){
        if(this.destroyed||token!==this.requestToken)return;
        console.warn('VNE 23 / GLB model error:',err);
        window.VROutfit3D.lastError=String(err?.message||err);
        this.stage.dispatchEvent(new CustomEvent('vr:outfit-3d-error',{detail:{error:'GLB: '+window.VROutfit3D.lastError}}));
      }
    }
    render(){if(this.pending||this.destroyed||!this.visible||document.hidden)return;
      this.pending=true;requestAnimationFrame(()=>{this.pending=false;if(!this.destroyed&&this.visible&&!document.hidden)this.draw()});
    }
    draw(){const gl=this.gl,rect=this.stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.5),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.p);
      gl.uniform1f(this.uniform.Yaw,this.yaw);
      gl.uniform1f(this.uniform.Pitch,this.pitch);
      gl.uniform1f(this.uniform.Scale,2.32*this.zoom);
      gl.uniform1f(this.uniform.Ratio,w/h);
      let draws=0;
      const selected=this.selected();
      const materialColor={
        skin:'#b2a697',shade:'#827970',eyebrow:'#4f4b44',hair:'#2e2d2a',
        forearm:'#b2a697',shoe:'#e1dfd3',sole:'#3f413b'
      };
      const tint={fabric:1,fabric_dark:.73,fabric_light:1.18,seam:1.09,zip:.76,detail:.96,denim:1,pocket:.89};
      for(const key of selected){
        const model=this.models.get(key);if(!model)continue;
        const base=rgb(key==='body'?'#b2a697':key==='tee'||key==='hoodie'||key==='bomber'?this.state.tc:key==='cargo'||key==='jeans'?this.state.bc:(this.state.hc||'#272a28'));
        for(const part of model.parts){
          if(part.role==='forearm' && (this.state.top==='hoodies'||this.state.top==='jackets'))continue;
          const fixed=materialColor[part.role];
          const color=fixed?rgb(fixed):base.map(v=>Math.max(.025,Math.min(1,v*(tint[part.role]||1))));
          gl.uniform3fv(this.uniform.Color,color);
          for(const [attr,buf,sz] of [['Position',part.bP,3],['Normal',part.bN,3],['UV',part.bUV,2]]){
            gl.bindBuffer(gl.ARRAY_BUFFER,buf);
            gl.enableVertexAttribArray(this.attrib[attr]);
            gl.vertexAttribPointer(this.attrib[attr],sz,gl.FLOAT,false,0,0);
          }
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.bI);
          gl.drawElements(gl.TRIANGLES,part.count,gl.UNSIGNED_INT,0);draws++;
        }
      }
      if(draws&&!this.reported){this.reported=true;document.dispatchEvent(new Event('vr:outfit-3d-frame'))}
    }
    destroy(){this.destroyed=true;this.ro?.disconnect();this.io?.disconnect();document.removeEventListener('visibilitychange',this.visibility);for(const m of this.models.values()){
      for(const p of m.parts)for(const x of [p.bP,p.bN,p.bUV,p.bI])this.gl.deleteBuffer(x);
      for(const t of m.textures)this.gl.deleteTexture(t);
    }this.gl.deleteProgram(this.p);this.canvas.remove();this.controls.remove();}
  }
  window.VNEGLBUtilities={readGLB,flattenGLB,matMul,matTRS,models};
  window.VROutfit3D={lastError:null,isFallback:false,mount(stage){
    try{const viewer=new ModelViewer(stage);this.isFallback=false;this.lastError=null;return viewer}catch(err){
      this.lastError=String(err?.message||err);
      console.warn('VNE 23 / original GLB unavailable; using procedural fallback:',err);
      this.isFallback=true;
      const view=oldEngine.mount(stage);
      const mark=document.querySelector('.outfit-3d-status__version');if(mark)mark.textContent='VNE 23 / УПРОЩЁННАЯ 3D';
      return view;
    }
  }};
})();
