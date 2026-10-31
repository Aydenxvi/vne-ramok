from pathlib import Path
import re
p=Path('outfit-glb.js');s=p.read_text()
s=s.replace('/* VNE RAMOK / 22 — resilient GLB viewer with compatible shader fallback.','/* VNE RAMOK / 23 — unified original mannequin and garments.')
start=s.index("  const root='assets/wardrobe-3d/';")
end=s.index('  const VS=`',start)
s=s[:start]+'''  const root='assets/studio-23/';
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
''' +s[end:]
start=s.index('  const VS=`');end=s.index('  const clamp=',start)
s=s[:start]+'''  const VS=`
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
''' +s[end:]
s=s.replace("if(n.mesh!==undefined && (kind!=='beanie'||n.mesh===0))", "if(n.mesh!==undefined)")
s=s.replace("indices,material:prim.material??null});","indices,material:prim.material??null,role:String(j.materials?.[prim.material]?.name||'FABRIC').toLowerCase()});")
s=s.replace("parts.push({positions:outP,normals:outN,uv:uv||new Float32Array(p.length/3*2),indices,material:prim.material??null,role:String(j.materials?.[prim.material]?.name||'FABRIC').toLowerCase()});", "parts.push({positions:outP,normals:outN,uv:uv||new Float32Array(p.length/3*2),indices,material:prim.material??null,role:String(j.materials?.[prim.material]?.name||'FABRIC').toLowerCase()});")
# old material texture logic can remain but custom GLB no texture
s=s.replace("this.compatShaders=false;\n      try{this.p=makeProgram(this.gl)}catch(err){\n        const improvedError=String(err?.message||err);\n        try{this.p=makeProgram(this.gl,VS_COMPAT,FS_COMPAT);this.compatShaders=true;console.warn('VNE 22 / switched to proven GLB shaders:',improvedError)}\n        catch(compatErr){throw Error(`GLB shader failed (${improvedError}); compatible shader also failed (${String(compatErr?.message||compatErr)})`)}\n      }", "this.compatShaders=false;this.p=makeProgram(this.gl);")
s=s.replace("for(const a of ['Yaw','Pitch','Scale','Ratio','Color','HasTexture','IsSkin','ShortSleeves','HandFit','Texture'])", "for(const a of ['Yaw','Pitch','Scale','Ratio','Color'])")
s=s.replace("this.controls.innerHTML='<span class=\"outfit-orbit-label\">VNE 22 / GLB + SHADER RECOVERY</span>","this.controls.innerHTML='<span class=\"outfit-orbit-label\">VNE 23 / ORIGINAL FASHION MODEL</span>")
s=s.replace("console.warn('VNE 22 / GLB model error:'", "console.warn('VNE 23 / GLB model error:'")
s=s.replace("const gl=this.gl,model={parts:[],textures:[],key};", "const gl=this.gl,model={parts:[],textures:[],key};")
s=s.replace("model.parts.push({bP,bN,bUV,bI,count:part.indices.length,texture:tex});", "model.parts.push({bP,bN,bUV,bI,count:part.indices.length,texture:tex,role:part.role});")
start=s.index('      gl.uniform1f(this.uniform.Yaw,this.yaw);',s.index('    draw(){'))
end=s.index('      if(draws&&!this.reported)',start)
s=s[:start]+'''      gl.uniform1f(this.uniform.Yaw,this.yaw);
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
''' +s[end:]
s=s.replace("console.warn('VNE / GLB unavailable; using procedural fallback:',err)","console.warn('VNE 23 / original GLB unavailable; using procedural fallback:',err)")
s=s.replace("VNE 22 / УПРОЩЁННАЯ 3D","VNE 23 / УПРОЩЁННАЯ 3D")
# Keep invariant: GLB API test harness and event emitter.
p.write_text(s)

p=Path('index.html');s=p.read_text().replace('VNE 22 / GLB','VNE 23 / ORIGINAL').replace('GLB АКТИВНО / 360°','3D МОДЕЛЬ / 360°').replace('REAL GLB FASHION VISUALIZER','UNIFIED ORIGINAL 3D STUDIO')
s=s.replace('assets/wardrobe-3d/credits.html','assets/studio-23/credits.html').replace('3D CREDITS ↗','3D MODEL ↗')
s=s.replace('outfit-glb.js?v=22','outfit-glb.js?v=23').replace('wardrobe.js?v=22','wardrobe.js?v=23').replace('wardrobe.css?v=22','wardrobe.css?v=23')
p.write_text(s)
p=Path('wardrobe.js');s=p.read_text().replace('VNE 22 /','VNE 23 /').replace('ЗАПУСК GLB…','ЗАГРУЗКА 3D…').replace('GLB АКТИВНО / 360°','3D МОДЕЛЬ / 360°').replace('GLB НЕ ЗАПУСТИЛСЯ','3D НЕ ЗАПУСТИЛСЯ')
p.write_text(s)
p=Path('start_windows.bat');s=p.read_text().replace('VERSION 22 - GLB RECOVERY','VERSION 23 - UNIFIED 3D / PORTFOLIO');p.write_text(s)
