from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, cv2, json
import argparse
parser=argparse.ArgumentParser(description='Recreate the art crops from the original reference PNG files.')
parser.add_argument('--references-dir',type=Path,required=True,help='Directory containing the original reference PNG files.')
args=parser.parse_args()
root=args.references_dir.resolve()
project=Path(__file__).resolve().parents[1]
if not root.is_dir():raise SystemExit('Reference directory does not exist.')
out=project/'src'/'assets'
out.mkdir(parents=True, exist_ok=True)
sheet=Image.open(next(root.glob('*_end.png'))).convert('RGB')

def cut(name,box,mode='feather',feather=10):
 im=sheet.crop(box).convert('RGBA'); a=np.array(im)
 if mode=='cutout':
  rgb=a[:,:,:3].astype(float); h,w=rgb.shape[:2]
  bg=np.median(np.concatenate([rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]]),axis=0)
  # Remove only background connected to the edge, preserving the white mascot interior.
  diff=np.max(np.abs(rgb-bg),axis=2)
  eligible=(diff<35).astype('uint8')
  n, labels=cv2.connectedComponents(eligible,8)
  edge=set(np.concatenate([labels[0],labels[-1],labels[:,0],labels[:,-1]]).tolist())-{0}
  mask=np.isin(labels,list(edge))
  alpha=np.ones((h,w),np.uint8)*255;alpha[mask]=0
  a[:,:,3]=alpha
  im=Image.fromarray(a)
 else:
  h,w=a.shape[:2]; yy,xx=np.mgrid[0:h,0:w]
  alpha=np.minimum.reduce([xx/feather,yy/feather,(w-1-xx)/feather,(h-1-yy)/feather])
  a[:,:,3]=np.uint8(np.clip(alpha,0,1)*255); im=Image.fromarray(a)
 im.save(out/f'{name}.webp',quality=94)
 return name
# Scene assets without labels.
cut('distant',(23,167,183,264),feather=12)
cut('middle',(170,153,359,263),feather=10)
cut('peak',(348,132,607,264),feather=12)
cut('side',(601,148,718,266),feather=10)
cut('valley',(721,155,887,263),feather=12)
cut('mist',(28,304,317,400),feather=20)
cut('river',(320,300,545,399),feather=12)
cut('waterfall',(542,292,723,399),feather=12)
cut('stairs',(745,295,877,397),feather=12)
cut('bridge',(26,446,160,521),feather=12)
cut('pavilion',(164,430,241,521),feather=8)
cut('academy',(248,430,396,521),feather=12)
cut('pine',(400,425,498,522),feather=6)
cut('plum',(500,425,611,522),feather=6)
cut('rocks',(615,457,716,521),feather=10)
# Scale source boxes by actual size vs displayed 1408 x1056 rendition.
# Coordinates above are in actual 1448x1086 image.
# Traveler poses from the sheet, sampled precisely in actual pixels.
poses={'traveler-stand':(42,627,101,696),'traveler-walk':(140,624,201,696),'traveler-point':(230,624,302,696),'traveler-read':(426,620,504,696),'traveler-cheer':(524,612,621,696),'traveler-flag':(631,596,724,696)}
for name,box in poses.items():cut(name,box,'cutout')
# Remove the stray sheet-heading fleck at the top-left of the peak cutout.
peak=Image.open(out/'peak.webp').convert('RGBA');arr=np.array(peak);arr[:34,:79,3]=0
Image.fromarray(arr).save(out/'peak.webp',quality=94)
# High-resolution mountain illustration, separated from all UI panels.
src=Image.open(next(root.glob('*山途_*.png'))).convert('RGB')
a=np.array(src)
mask=np.zeros(a.shape[:2],np.uint8)
for x1,y1,x2,y2 in [(891,91,1093,159),(827,224,1060,292),(821,368,1064,440),(852,512,1043,586),(776,662,1042,775),(1076,177,1242,292)]:
 cv2.rectangle(mask,(x1,y1),(x2,y2),255,-1)
a=cv2.inpaint(a,mask,8,cv2.INPAINT_TELEA)
# All text/UI to left and right stays outside the illustration crop.
im=Image.fromarray(a).crop((535,48,1254,941)).convert('RGBA')
w,h=im.size; arr=np.array(im); yy,xx=np.mgrid[0:h,0:w]
alpha=np.minimum.reduce([xx/65,(w-1-xx)/65,yy/20,(h-1-yy)/70])
alpha=np.clip(alpha,0,1)
right=np.clip((xx-500)/55,0,1);upper=1-np.clip((yy-230)/65,0,1)
alpha*=1-right*upper
arr[:,:,3]=(alpha*255).astype(np.uint8)
Image.fromarray(arr).save(out/'mountain.webp',quality=94)
# Hero panorama: only scenic crop, clean baked signboard text.
src=Image.open(next(root.glob('*_知识探索之旅.png'))).convert('RGB'); a=np.array(src)
mask=np.zeros(a.shape[:2],np.uint8)
for r in [(1024,118,1167,157),(764,216,889,258),(1079,276,1221,314),(1514,344,1657,392),(1435,95,1655,185)]:cv2.rectangle(mask,(r[0],r[1]),(r[2],r[3]),255,-1)
# Preserve the scenic painting intact; decorative signs are not clickable UI.
a=np.array(src)
im=Image.fromarray(a).crop((485,52,1672,423)).convert('RGBA'); ar=np.array(im); h,w=ar.shape[:2];yy,xx=np.mgrid[0:h,0:w]
alpha=np.minimum.reduce([xx/95,(w-1-xx)/35,yy/20,(h-1-yy)/50]);ar[:,:,3]=np.clip(alpha,0,1)*255
Image.fromarray(ar).save(out/'panorama.webp',quality=94)
# Brush lettering is an image, not a redistributed font.
im=src.crop((77,122,468,215)).convert('RGBA'); ar=np.array(im); rgb=ar[:,:,:3]
a=np.clip((200-rgb.mean(axis=2))/130,0,1); ar[:,:,3]=(a*255).astype(np.uint8)
im=Image.fromarray(ar); im.save(out/'wordmark.webp',quality=96)
manifest={p.name:{'size':Image.open(p).size,'bytes':p.stat().st_size} for p in out.glob('*.webp')}
(project/'docs'/'asset-manifest.json').write_text(json.dumps(manifest,indent=2))
# Contact proof of separated assets.
thumb=Image.new('RGB',(1000,900),(248,245,238)); mountain=Image.open(out/'mountain.webp');mountain.thumbnail((600,830));thumb.paste(mountain,(0,0),mountain)
y=10
for name in ['panorama','peak','pine','pavilion','traveler-walk','wordmark']:
 p=Image.open(out/f'{name}.webp');p.thumbnail((360,130));thumb.paste(p,(620,y),p);y+=140
thumb.save(project/'docs'/'assets-proof.jpg')
