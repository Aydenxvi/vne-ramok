'use strict';
/* VNE RAMOK / MOTION 19 — self-contained, on-demand WebGL 3D outfit preview.
   No external scripts, model downloads, textures, or continuous rendering loop.
   This is a stylised 3D mannequin, NOT a size-accurate virtual try-on. */
(() => {
  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform float uYaw;
    uniform float uPitch;
    uniform float uScale;
    uniform float uRatio;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main(){
      float cy=cos(uYaw), sy=sin(uYaw);
      float cp=cos(uPitch), sp=sin(uPitch);
      vec3 p=aPosition-vec3(0.,2.57,0.);
      p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
      p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);
      vec3 n=aNormal;
      n=vec3(cy*n.x+sy*n.z,n.y,-sy*n.x+cy*n.z);
      vNormal=vec3(n.x,cp*n.y-sp*n.z,sp*n.y+cp*n.z);
      vWorld=p;
      float depth=7.3-p.z;
      gl_Position=vec4(p.x*uScale/uRatio,p.y*uScale,depth*.45-1.25,depth);
    }`;
  const fragmentSource = `
    precision mediump float;
    uniform vec3 uColor;
    uniform float uSurface;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main(){
      vec3 N=normalize(vNormal);
      float key=max(0.,dot(N,normalize(vec3(-.55,.94,1.25))));
      float fill=max(0.,dot(N,normalize(vec3(.82,.21,-.63))));
      float light=.50+key*.44+fill*.13;
      float soft=pow(max(dot(N,normalize(vec3(-.3,.5,1.))),0.0),13.0)*0.055;
      float grain=sin(vWorld.y*43.+vWorld.x*37.)*sin(vWorld.z*47.)*.014*uSurface;
      vec3 col=uColor*clamp(light+soft+grain,.26,1.12);
      col=pow(col,vec3(.89));
      gl_FragColor=vec4(col,1.);
    }`;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hex=(s)=>{
    const raw=String(s||'#50514c').replace('#','');
    const n=/^[a-f\d]{3}$/i.test(raw)?raw.split('').map(x=>x+x).join(''):raw;
    if(!/^[a-f\d]{6}$/i.test(n))return [0.3,0.3,0.3];
    return [0,2,4].map(i=>parseInt(n.slice(i,i+2),16)/255);
  };
  const mix=(c,d,f)=>'#'+hex(c).map((v,i)=>Math.round(clamp(v*(1-f)+hex(d)[i]*f,0,1)*255).toString(16).padStart(2,'0')).join('');
  const vAdd=(a,b)=>a.map((v,i)=>v+b[i]);
  const vSub=(a,b)=>a.map((v,i)=>v-b[i]);
  const vCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const vNorm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)};
  function shader(gl,kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(error)}return s}
  function program(gl){const p=gl.createProgram(),v=shader(gl,gl.VERTEX_SHADER,vertexSource),f=shader(gl,gl.FRAGMENT_SHADER,fragmentSource);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
  function geometry(){const points=[],normals=[];return {points,normals,triangle(a,b,c,normal){
    const n=normal||vNorm(vCross(vSub(b,a),vSub(c,a)));
    for(const v of [a,b,c]){points.push(...v);normals.push(...n)}
  },quad(a,b,c,d,n){this.triangle(a,b,c,n);this.triangle(a,c,d,n)}}}
  function ellipsoid(g,center,rad,lat=13,lon=22){
    const coord=(a,b)=>[
      center[0]+rad[0]*Math.sin(a)*Math.cos(b),
      center[1]+rad[1]*Math.cos(a),
      center[2]+rad[2]*Math.sin(a)*Math.sin(b)
    ];
    const normal=p=>vNorm([(p[0]-center[0])/rad[0]**2,(p[1]-center[1])/rad[1]**2,(p[2]-center[2])/rad[2]**2]);
    for(let i=0;i<lat;i++){const a=i*Math.PI/lat,b=(i+1)*Math.PI/lat;
      for(let k=0;k<lon;k++){const t=k*2*Math.PI/lon,u=(k+1)*2*Math.PI/lon;
        const p=coord(a,t),q=coord(b,t),r=coord(b,u),s=coord(a,u);
        for(const tri of [[p,q,r],[p,r,s]]){for(const v of tri){g.points.push(...v);g.normals.push(...normal(v))}}
      }
    }
  }
  // Tube through arbitrary control points with elliptical cross sections.
  function tube(g,rings,segments=18,caps=true){
    const vs=[];for(let k=0;k<rings.length;k++){
      const r=rings[k],dir=vNorm(vSub(rings[Math.min(k+1,rings.length-1)].p,rings[Math.max(k-1,0)].p));
      const side=vNorm(vCross(dir,[0,0,1]));const front=vNorm(vCross(side,dir));
      const ring=[];
      for(let j=0;j<segments;j++){const angle=2*Math.PI*j/segments;
        ring.push(vAdd(r.p,vAdd(side.map(x=>x*Math.cos(angle)*r.rx),front.map(x=>x*Math.sin(angle)*r.rz))));
      }vs.push(ring);
    }
    for(let i=0;i<vs.length-1;i++)for(let j=0;j<segments;j++){
      const n=(j+1)%segments;
      const a=vs[i][j],b=vs[i][n],c=vs[i+1][n],d=vs[i+1][j];
      g.quad(a,d,c,b);
    }
    if(caps){for(const [i,reverse] of [[0,true],[vs.length-1,false]])for(let j=0;j<segments;j++){
      const a=rings[i].p,b=vs[i][j],c=vs[i][(j+1)%segments];
      if(reverse)g.triangle(a,c,b);else g.triangle(a,b,c);
    }}
  }
  function box(g,c,w,h,d){const [x,y,z]=c,a=w/2,b=h/2,e=d/2;
    const p=[[x-a,y-b,z-e],[x+a,y-b,z-e],[x+a,y+b,z-e],[x-a,y+b,z-e],[x-a,y-b,z+e],[x+a,y-b,z+e],[x+a,y+b,z+e],[x-a,y+b,z+e]];
    for(const q of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]])g.quad(...q.map(i=>p[i]));
  }
  function line(g,pts,r=.014){tube(g,pts.map(p=>({p,rx:r,rz:r})),7,false)}

  class Outfit3D {
    constructor(stage){
      this.stage=stage;this.canvas=document.createElement('canvas');
      this.canvas.className='outfit-3d-view';this.canvas.tabIndex=0;
      this.canvas.setAttribute('role','img');
      this.canvas.setAttribute('aria-label','Трёхмерный стилизованный манекен. Перетаскивайте для вращения, нажимайте стрелки для поворота.');
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'default',preserveDrawingBuffer:false})||this.canvas.getContext('experimental-webgl',{alpha:true,antialias:true});
      if(!this.gl)throw Error('WebGL недоступен');
      this.p=program(this.gl);this.gl.useProgram(this.p);
      this.loc={position:this.gl.getAttribLocation(this.p,'aPosition'),normal:this.gl.getAttribLocation(this.p,'aNormal')};
      for(const name of ['Yaw','Pitch','Scale','Ratio','Color','Surface'])this.loc[name]=this.gl.getUniformLocation(this.p,'u'+name);
      this.meshes=[];this.yaw=-.22;this.pitch=-.035;this.zoom=1;this.pending=false;this.visible=false;this.pointer=null;this.inMotion=false;
      this.gl.enable(this.gl.DEPTH_TEST);this.gl.depthFunc(this.gl.LEQUAL);
      this.gl.disable(this.gl.CULL_FACE);
      this.canvas.addEventListener('webglcontextlost',e=>{
        e.preventDefault();this.destroy(false);this.stage.classList.remove('outfit-3d-active');
        this.stage.dataset.webgl='lost';this.stage.dispatchEvent(new CustomEvent('vr:outfit-3d-error',{detail:{error:'WebGL context lost'}}));
      },{once:true});
      stage.appendChild(this.canvas);
      this.controls=document.createElement('div');this.controls.className='outfit-orbit-controls';
      this.controls.innerHTML='<span class="outfit-orbit-label">3D VIEW / 360°</span><div class="outfit-orbit-buttons"><button type="button" data-orbit="left" aria-label="Повернуть влево">↶</button><button type="button" data-orbit="front" aria-label="Вид спереди">FRONT</button><button type="button" data-orbit="right" aria-label="Повернуть вправо">↷</button><button type="button" data-orbit="zoom" aria-label="Приблизить или отдалить">＋</button></div><span class="outfit-orbit-tip">ПЕРЕТАСКИВАЙ, ЧТОБЫ ВРАЩАТЬ</span>';
      stage.appendChild(this.controls);
      this.controls.addEventListener('click',e=>{const b=e.target.closest('[data-orbit]');if(!b)return;const a=b.dataset.orbit;if(a==='front'){this.yaw=0;this.pitch=0}else if(a==='zoom'){this.zoom=this.zoom===1?1.28:1}else this.yaw+=a==='left'?-Math.PI/4:Math.PI/4;this.render()});
      const move=e=>{if(!this.pointer||e.pointerId!==this.pointer.id)return;this.yaw+=(e.clientX-this.pointer.x)*.008;this.pitch=clamp(this.pitch+(e.clientY-this.pointer.y)*.004,-.24,.24);this.pointer.x=e.clientX;this.pointer.y=e.clientY;this.render()};
      this.canvas.addEventListener('pointerdown',e=>{this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId)});
      this.canvas.addEventListener('pointermove',move);
      const end=e=>{if(this.pointer?.id===e.pointerId)this.pointer=null};
      this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);
      this.canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.18;if(e.key==='ArrowRight')this.yaw+=.18;if(e.key==='ArrowUp')this.pitch=clamp(this.pitch-.12,-.24,.24);if(e.key==='ArrowDown')this.pitch=clamp(this.pitch+.12,-.24,.24);this.render()}});
      this.ro=new ResizeObserver(()=>this.render());this.ro.observe(stage);
      this.io=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.render()},{threshold:.01});this.io.observe(stage);
      this.visibility=()=>{if(!document.hidden)this.render()};document.addEventListener('visibilitychange',this.visibility);
    }
    make(builder,col,surface=1){const g=geometry();builder(g);if(g.points.length===0)return;
      const gl=this.gl,v=gl.createBuffer(),n=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.points),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.normals),gl.STATIC_DRAW);
      this.meshes.push({v,n,len:g.points.length/3,col:hex(col),surface});
    }
    rebuild(d){
      if(this.gl.isContextLost())return;
      for(const m of this.meshes){this.gl.deleteBuffer(m.v);this.gl.deleteBuffer(m.n)}this.meshes=[];
      const skin='#b8a38f',ink='#252821',ivory='#f0eee4';
      const top=d.top||'tees',bottom=d.bottom||'jeans',tc=d.tc||'#202220',bc=d.bc||'#7d8077';
      const accent=mix(tc,'#ddd9cc',.33),detail=mix(bc,'#e4ddcd',.24);
      // Mannequin is deliberately faceless so it is a neutral styling tool.
      this.make(g=>tube(g,[{p:[0,2.06,0],rx:.35,rz:.22},{p:[0,3.65,0],rx:.42,rz:.23}]),skin);
      this.make(g=>tube(g,[{p:[0,3.65,0],rx:.13,rz:.13},{p:[0,4.03,0],rx:.135,rz:.13}]),skin);
      this.make(g=>ellipsoid(g,[0,4.34,.0],[.30,.40,.29]),skin,.4);
      this.make(g=>ellipsoid(g,[0,4.49,-.1],[.30,.29,.24]),ink);
      // Subtle ears are visible in profile.
      for(const s of [-1,1])this.make(g=>ellipsoid(g,[s*.292,4.32,0],[.045,.085,.068],10,12),skin,.35);
      // Anatomically placed arms behind clothes.
      for(const s of [-1,1]){
        this.make(g=>tube(g,[{p:[s*.60,3.57,0],rx:.20,rz:.18},{p:[s*.86,2.94,0],rx:.165,rz:.16},{p:[s*.89,2.37,.06],rx:.125,rz:.125}]),skin,.3);
        this.make(g=>ellipsoid(g,[s*.89,2.27,.08],[.135,.17,.11],11,16),skin,.2);
      }
      // Baggy legs, creases and hem panels. Cargo has pronounced side pockets.
      this.make(g=>tube(g,[{p:[0,2.36,0],rx:.51,rz:.30},{p:[0,2.09,0],rx:.51,rz:.32}]),bc);
      for(const s of [-1,1]){
        this.make(g=>tube(g,[{p:[s*.265,2.19,0],rx:.292,rz:.296},{p:[s*.29,1.75,.015],rx:bottom==='pants'?.335:.326,rz:.315},{p:[s*.30,.75,.01],rx:bottom==='pants'?.32:.315,rz:.29},{p:[s*.32,.26,.016],rx:.305,rz:.27}]),bc);
        this.make(g=>line(g,[[s*.37,2.06,.28],[s*.40,1.67,.31],[s*.405,.94,.27],[s*.42,.28,.235]],.010),detail,.3);
        this.make(g=>line(g,[[s*.32,.35,.283],[s*.32,.26,.28]],.019),mix(bc,'#222222',.3),.15);
        // Shoes: warm-white chunky soles, uppers and toe caps.
        this.make(g=>ellipsoid(g,[s*.33,.16,.17],[.335,.15,.46],11,20),'#dbdcd3',.2);
        this.make(g=>ellipsoid(g,[s*.33,.205,.16],[.298,.13,.41],11,20),ivory,.25);
        this.make(g=>box(g,[s*.33,.095,.22],.54,.065,.65),'#bfc1b7',.1);
        if(bottom==='pants'){
          this.make(g=>box(g,[s*.565,1.37,.055],.17,.40,.35),bc);
          this.make(g=>box(g,[s*.655,1.48,.065],.028,.06,.35),detail,.2);
        }else{
          this.make(g=>line(g,[[s*.08,1.92,.307],[s*.15,1.67,.31]],.012),detail,.3);
        }
      }
      // The upper garment has actually modelled depth (not a billboard).
      const coat=top==='jackets',hoodie=top==='hoodies';
      const cuff=coat||hoodie;
      this.make(g=>tube(g,[{p:[0,2.34,.01],rx:coat?.54:.52,rz:coat?.342:.32},{p:[0,3.10,.005],rx:.54,rz:.33},{p:[0,3.57,0],rx:.655,rz:.34},{p:[0,3.73,0],rx:.39,rz:.285}]),tc);
      for(const s of [-1,1]){
        const end=cuff?[s*.94,2.65,.025]:[s*.82,3.02,.01];
        this.make(g=>tube(g,[{p:[s*.57,3.61,0],rx:.34,rz:.33},{p:[s*.77,3.30,0],rx:.31,rz:.295},{p:end,rx:cuff?.23:.275,rz:cuff?.225:.26}]),tc);
        this.make(g=>tube(g,[{p:[end[0],end[1]+.055,end[2]],rx:cuff?.23:.274,rz:cuff?.225:.26},{p:[end[0],end[1],end[2]],rx:cuff?.23:.274,rz:cuff?.225:.26}]),mix(tc,'#222222',.14));
      }
      this.make(g=>tube(g,[{p:[0,3.728,.02],rx:.21,rz:.2},{p:[0,3.672,.02],rx:.205,rz:.203}]),ink,.2);
      this.make(g=>tube(g,[{p:[0,3.739,.01],rx:.182,rz:.193},{p:[0,3.69,.015],rx:.176,rz:.195}]),ivory,.2);
      if(coat){
        // Overlapping lapels and zipped front; large low-profile pockets.
        for(const s of [-1,1]){
          this.make(g=>tube(g,[{p:[s*.22,3.70,.29],rx:.09,rz:.04},{p:[s*.12,3.38,.348],rx:.065,rz:.042}]),accent,.1);
          this.make(g=>box(g,[s*.34,2.65,.338],.27,.16,.035),mix(tc,'#161916',.12),.2);
        }
        this.make(g=>line(g,[[0,3.57,.348],[0,2.38,.357]],.016),accent,.2);
        this.make(g=>line(g,[[.06,3.57,.348],[.06,2.38,.357]],.007),mix(tc,'#161916',.35),.3);
      }else if(hoodie){
        this.make(g=>ellipsoid(g,[0,3.74,-.19],[.35,.36,.25],12,20),tc,.8);
        for(const s of [-1,1])this.make(g=>line(g,[[s*.09,3.68,.328],[s*.095,3.36,.339]],.011),ivory,.2);
        this.make(g=>box(g,[0,2.74,.339],.53,.31,.032),mix(tc,'#ededdd',.075));
        this.make(g=>line(g,[[-.27,2.84,.362],[.25,2.84,.362]],.011),accent,.25);
      }else{
        this.make(g=>tube(g,[{p:[0,2.38,.007],rx:.52,rz:.32},{p:[0,2.33,.007],rx:.518,rz:.319}]),mix(tc,'#191b17',.15));
        this.make(g=>line(g,[[-.18,3.45,.293],[.18,3.45,.293]],.007),accent,.35);
      }
      // Beanie is optional; when absent the hairline reads naturally from the side.
      if(d.hat){const hc=d.hc||'#292b29';
        this.make(g=>tube(g,[{p:[0,4.60,0],rx:.305,rz:.305},{p:[0,4.78,0],rx:.302,rz:.29},{p:[0,4.91,0],rx:.25,rz:.24},{p:[0,5.04,0],rx:.09,rz:.09}]),hc);
        this.make(g=>tube(g,[{p:[0,4.59,0],rx:.319,rz:.31},{p:[0,4.74,0],rx:.316,rz:.308}]),mix(hc,'#fff9e8',.085));
      }
      this.render();
    }
    update(d){this.canvas.setAttribute('aria-label',`3D-эскиз: ${d.topName}, ${d.bottomName}${d.hatName?', '+d.hatName:''}. Перетаскивайте для вращения.`);this.rebuild(d)}
    render(){
      if(this.pending||!this.visible||document.hidden||!this.gl||this.gl.isContextLost())return;
      this.pending=true;requestAnimationFrame(()=>{this.pending=false;if(!this.visible||document.hidden)return;this.draw()});
    }
    draw(){const gl=this.gl;if(!gl||gl.isContextLost())return;const rect=this.stage.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.6);
      const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.p);
      gl.uniform1f(this.loc.Yaw,this.yaw);gl.uniform1f(this.loc.Pitch,this.pitch);
      gl.uniform1f(this.loc.Scale,2.45*this.zoom);gl.uniform1f(this.loc.Ratio,w/h);
      for(const m of this.meshes){
        gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.enableVertexAttribArray(this.loc.position);gl.vertexAttribPointer(this.loc.position,3,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(this.loc.normal);gl.vertexAttribPointer(this.loc.normal,3,gl.FLOAT,false,0,0);
        gl.uniform3fv(this.loc.Color,m.col);gl.uniform1f(this.loc.Surface,m.surface);
        gl.drawArrays(gl.TRIANGLES,0,m.len);
      }
      if(!this.frameReported && this.meshes.length){this.frameReported=true;document.dispatchEvent(new Event('vr:outfit-3d-frame'))}
    }
    destroy(clear=true){if(clear&&this.gl){for(const m of this.meshes){this.gl.deleteBuffer(m.v);this.gl.deleteBuffer(m.n)}this.gl.deleteProgram(this.p)}this.ro?.disconnect();this.io?.disconnect();document.removeEventListener('visibilitychange',this.visibility);}
  }
  window.VROutfit3D={lastError:null,mount(stage){try{const app=new Outfit3D(stage);stage.classList.add('outfit-3d-active');this.lastError=null;return app}catch(err){this.lastError=String(err?.message||err);if(stage.dataset)stage.dataset.webgl='unavailable';console.warn('VNE / 3D preview fallback:',this.lastError);return null}}};
  document.dispatchEvent(new Event('vr:outfit-3d-ready'));
})();
