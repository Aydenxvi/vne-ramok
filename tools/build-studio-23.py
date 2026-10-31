"""VNE RAMOK 23 / original, unified mannequin and garment GLBs.
Creates aligned glTF 2.0 meshes without using licensed third party body/garment geometry.
For a visual portfolio preview, not a body measurement or cloth physics simulator.
Requires trimesh and numpy for regeneration; NOT required to run the website.
"""
from pathlib import Path
import numpy as np, trimesh
from trimesh.visual.material import PBRMaterial

OUT=Path(__file__).resolve().parents[1]/'assets'/'studio-23'
OUT.mkdir(parents=True,exist_ok=True)
COLORS={
 'skin':([178,166,151,255],.94), 'forearm':([178,166,151,255],.94), 'shade':([130,121,112,255],.92),
 'hair':([46,45,42,255],.87), 'eyebrow':([79,75,68,255],.93),
 'shoe':([225,223,211,255],.75),'sole':([63,65,59,255],.88),
 'fabric':([221,221,213,255],.93), 'fabric_dark':([169,170,160,255],.96),
 'fabric_light':([242,242,233,255],.85), 'seam':([205,205,197,255],.92),
 'zip':([166,166,158,255],.38), 'detail':([184,185,176,255],.82),
 'denim':([199,198,188,255],.98), 'pocket':([186,185,176,255],.98)
}

def e(center,axes,sub=2):
 m=trimesh.creation.icosphere(subdivisions=sub, radius=1)
 m.apply_scale(axes);m.apply_translation(center);return m

def box(center,scale):
 m=trimesh.creation.box(extents=scale);m.apply_translation(center);return m

def loft(rows,sections=20,seal=True):
 """Rows are (center-x, center-y, center-z, radius-x, radius-z).
 Closed rings make top/bottom more believable than disconnected parts.
 """
 verts=[];faces=[]
 for x,y,z,rx,rz in rows:
  for k in range(sections):
   a=2*np.pi*k/sections
   verts.append([x+rx*np.cos(a),y,z+rz*np.sin(a)])
 for ring in range(len(rows)-1):
  for k in range(sections):
   a=ring*sections+k;b=ring*sections+(k+1)%sections;c=(ring+1)*sections+k;d=(ring+1)*sections+(k+1)%sections
   faces.extend([(a,b,c),(b,d,c)])
 if seal:
  for k in range(1,sections-1):
   faces.append((0,k+1,k))
   end=(len(rows)-1)*sections
   faces.append((end,end+k,end+k+1))
 m=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=False)
 m.fix_normals();return m

def segment(a,b,radii=.15,sides=16):
 """Rounded polygon limb. Exact geometry shared by sleeve and bare skin."""
 a=np.array(a,dtype=float);b=np.array(b,dtype=float)
 tangent=(b-a);tangent/=np.linalg.norm(tangent)
 orth=np.cross(tangent,[0,0,1]);orth/=np.linalg.norm(orth)
 dep=np.cross(tangent,orth);dep/=np.linalg.norm(dep)
 if isinstance(radii,(int,float)):radii=(radii,radii)
 verts=[]
 for center,r in [(a,radii[0]),(b,radii[1])]:
  for j in range(sides):
   theta=np.pi*2*j/sides
   verts.append(center+r*(np.cos(theta)*orth+np.sin(theta)*dep))
 faces=[]
 for j in range(sides):
  k=(j+1)%sides;faces.extend([(j,k,j+sides),(k,k+sides,j+sides)])
 for j in range(1,sides-1):faces.append((0,j+1,j));faces.append((sides,sides+j,sides+j+1))
 m=trimesh.Trimesh(vertices=verts,faces=faces,process=False);m.fix_normals();return m

def sleeve_tube(which='long',radius=.16,side=1):
 """Single continuous, smoothly fitted garment sleeve; no elbow seam/disconnection."""
 pts=([(.55,3.53,.015,.282),(.70,3.43,.02,.266),(.80,3.30,.028,.239),(.84,3.18,.035,.218)] if which=='short' else
      [(.55,3.53,.015,.28),(.66,3.43,.02,.264),(.79,3.27,.03,.232),(.84,3.12,.04,.206),(.91,2.86,.055,.185),(.97,2.62,.065,radius)])
 coords=[np.array([side*x,y,z],float) for x,y,z,r in pts]
 verts=[];faces=[];steps=20
 for i,(x,y,z,r) in enumerate(pts):
  tangent=coords[min(i+1,len(coords)-1)]-coords[max(i-1,0)]
  tangent/=np.linalg.norm(tangent)
  normal=np.cross(tangent,[0,0,1]);normal/=np.linalg.norm(normal)
  binormal=np.cross(tangent,normal);binormal/=np.linalg.norm(binormal)
  for k in range(steps):
   a=2*np.pi*k/steps
   verts.append(coords[i]+r*(np.cos(a)*normal+np.sin(a)*binormal))
 for i in range(len(pts)-1):
  for k in range(steps):
   a=i*steps+k;b=i*steps+(k+1)%steps;c=(i+1)*steps+k;d=(i+1)*steps+(k+1)%steps
   faces.extend([(a,b,c),(b,d,c)])
 for k in range(1,steps-1):faces.extend([(0,k+1,k),((len(pts)-1)*steps,(len(pts)-1)*steps+k,(len(pts)-1)*steps+k+1)])
 m=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=False);m.fix_normals()
 return m

def fabric_tube(which='long',radius=.16):
 return [sleeve_tube(which,radius,side) for side in (-1,1)]

class Collection:
 def __init__(self):self.meshes=[]
 def add(self,part,mat):
  if isinstance(part,(list,tuple)):
   for item in part:self.add(item,mat)
   return
  if len(part.vertices)<3 or len(part.faces)<1:return
  self.meshes.append((part,mat))
 def save(self,name):
  scene=trimesh.Scene()
  for n,(mesh,key) in enumerate(self.meshes):
   color,rough=COLORS[key]
   # Give each mesh a named material. The live renderer uses it to tint the look.
   m=mesh.copy();m.visual=trimesh.visual.TextureVisuals(material=PBRMaterial(name=key.upper(),baseColorFactor=color,metallicFactor=0,roughnessFactor=rough,doubleSided=True))
   scene.add_geometry(m,geom_name=f'{key}-{n}',node_name=f'{key}-{n}')
  (OUT/name).write_bytes(scene.export(file_type='glb'))

# ALL PIECES USE THE SAME WORLD COORDINATES AND A-POSE. No per-asset scaling.
body=Collection()
body.add(e((0,4.48,.02),(.304,.405,.287),sub=3),'skin')
body.add(loft([(0,3.83,0,.163,.15),(0,4.12,0,.17,.155)],20),'skin')
body.add([e((side*.308,4.45,0),(.052,.104,.08),2) for side in (-1,1)],'skin')
# Stylized blank face deliberately avoids uncanny eyes / detached facial details.
# short dark swept hairstyle, largely covered by optional beanie
body.add(e((0,4.795,-.024),(.304,.135,.26),2),'hair')
for side in (-1,1):
 # Both long sleeves and short sleeves use the exact same arm skeleton, so no floating hands.
 elbow=(side*.83,3.12,.03);wrist=(side*.975,2.64,.07)
 body.add(segment(elbow,wrist,(.116,.09)),'forearm')
 body.add(e((side*.98,2.48,.065),(.105,.150,.086),2),'skin')
 body.add(e((side*1.035,2.365,.095),(.064,.095,.053),1),'skin')
 # ankle / classic clean oversized sneaker
 body.add(e((side*.34,.16,.20),(.22,.137,.35),2),'shoe')
 body.add(box((side*.34,.086,.23),(.46,.085,.66)),'sole')
body.save('mannequin.glb')

# TOPS: same shoulders, arm joints and hem for every source garment.
for kind in ('tee','hoodie','bomber'):
 c=Collection()
 long=kind!='tee'
 top_rows=[(0,2.27,0,.50,.355),(0,2.48,0,.525,.343),(0,3.03,0,.56,.315),(0,3.45,0,.58,.31),(0,3.70,0,.32,.25)]
 c.add(loft(top_rows,28),'fabric')
 c.add(fabric_tube('long' if long else 'short',.17 if kind=='bomber' else .16),'fabric')
 if kind=='hoodie':
  # large functional hood behind neck, hem ribbing, pocket and draw cords
  c.add(e((0,3.76,-.24),(.34,.31,.19),2),'fabric')
  c.add(loft([(0,2.34,0,.505,.29),(0,2.42,0,.52,.302)],20),'fabric_dark')
  c.add(box((0,2.72,.315),(.58,.27,.045)),'fabric_dark')
  for s in (-1,1):
   c.add(segment((s*.087,3.69,.282),(s*.104,3.37,.328),(.012,.012)),'fabric_light')
  c.add(loft([(0,3.72,.01,.24,.23),(0,3.63,.015,.22,.225)],20),'fabric_dark')
 if kind=='bomber':
  c.add(loft([(0,2.33,0,.50,.295),(0,2.43,0,.50,.295)],24),'fabric_dark')
  c.add(loft([(0,3.75,0,.245,.223),(0,3.64,0,.27,.25)],20),'fabric_dark')
  c.add(segment((0,3.61,.315),(0,2.37,.309),(.012,.012)),'zip')
  for s in (-1,1):
   c.add(box((s*.343,2.68,.317),(.27,.055,.041)),'pocket')
   c.add(segment((s*.85,3.06,.033),(s*.99,2.59,.066),(.008,.008)),'seam')
 if kind=='tee':
  c.add(loft([(0,3.73,.012,.236,.214),(0,3.62,.01,.237,.22)],20),'fabric_dark')
  c.add(loft([(0,2.31,0,.49,.285),(0,2.35,0,.49,.285)],20),'fabric_dark')
 c.save(kind+'.glb')

# Bottoms overlap shirt 4cm at waist, with legs aligned to mannequin shoes.
for kind in ('jeans','cargo'):
 c=Collection()
 c.add(loft([(0,2.53,0,.43,.28),(0,2.36,0,.47,.29),(0,2.10,0,.52,.31)],24),'denim')
 for s in (-1,1):
  # slightly oversized silhouette, open straight wide-leg cut
  cx=s*.34
  c.add(loft([(cx,2.13,0,.266,.278),(cx,1.82,0,.275,.287),(cx,1.23,0,.29,.304),(cx,.42,0,.303,.314),(cx,.30,0,.310,.320)],22),'denim')
  if kind=='cargo':
   c.add(box((s*.44,1.31,.303),(.35,.32,.075)),'pocket')
   c.add(box((s*.44,1.50,.305),(.37,.055,.085)),'fabric_dark')
   c.add(box((s*.44,.91,.312),(.24,.19,.055)),'pocket')
  else:
   c.add(segment((cx,.34,.307),(cx,.58,.305),(.010,.010)),'seam')
  c.add(box((cx,.31,0),(.61,.06,.61)),'fabric_dark')
 c.add(box((0,2.46,.285),(.07,.05,.02)),'fabric_dark')
 c.save(kind+'.glb')

hat=Collection()
hat.add(loft([(0,4.67,-.02,.338,.322),(0,4.78,-.02,.348,.33),(0,4.96,-.01,.275,.268),(0,5.06,-.008,.06,.055)],24),'fabric')
hat.add(loft([(0,4.66,-.02,.349,.334),(0,4.82,-.02,.349,.334)],24),'fabric_dark')
hat.save('beanie.glb')

for file in OUT.glob('*.glb'): print(f'{file.name} {file.stat().st_size/1024:.1f} KiB')
