import math, random, json, datetime
ROOT='/mnt/user-data/outputs/artifacts/a9028ce5-cf6c-44c4-937c-ad8885265c4b/project/'
W,H=720,480
# ---- shared scene geometry ----
GRASS=70
SHAFT=(348,GRASS,24,330)            # x,y,w,h
CORR=[(120,200,480,22),(180,330,360,22)]
ROOMS=[('queen','Queen\u2019s chamber',392,130,120,84),('hatchery','Hatchery',190,130,120,84),('store','Food store',150,266,160,84),('barracks','Barracks',420,266,180,84)]
ANTS=[(360,150,'w',0),(300,211,'w',1),(360,300,'w',0),(250,341,'w',1),(500,211,'w',0),(300,60,'w',1),(140,60,'w',0)]  # x,y,kind,carry
SOLD=[(450,330),(495,330),(540,330)]
EGGS=[(215,195),(235,197),(255,194),(275,196),(225,183),(262,182)]
PILES=[(175,335),(205,335),(235,335),(265,335)]
QUEEN=(452,180)
SPIDER=(628,44)
CRUMB=(100,60)
random.seed(4)

def ant(x,y,scale,body,outline,sw,legs=True,eyes=None,carry=False,gloss=False,carrycol='#f2c94c'):
    s=scale; parts=[]
    if legs:
        for i,(dx,dy) in enumerate([(-9,-7),(-11,0),(-9,7),(9,-7),(11,0),(9,7)]):
            parts.append(f'<path d="M{x} {y} q{dx*0.5*s} {dy*0.4*s} {dx*s} {dy*s}" fill="none" stroke="{outline}" stroke-width="{sw}" stroke-linecap="round"/>')
    parts.append(f'<ellipse cx="{x-7*s}" cy="{y}" rx="{6*s}" ry="{4.2*s}" fill="{body}" stroke="{outline}" stroke-width="{sw}"/>')
    parts.append(f'<ellipse cx="{x}" cy="{y}" rx="{3.2*s}" ry="{2.8*s}" fill="{body}" stroke="{outline}" stroke-width="{sw}"/>')
    parts.append(f'<circle cx="{x+6*s}" cy="{y}" r="{3.4*s}" fill="{body}" stroke="{outline}" stroke-width="{sw}"/>')
    parts.append(f'<path d="M{x+8*s} {y-2*s} l{4*s} {-4*s} M{x+8*s} {y+2*s} l{4*s} {4*s}" fill="none" stroke="{outline}" stroke-width="{sw}" stroke-linecap="round"/>')
    if gloss:
        parts.append(f'<ellipse cx="{x-8*s}" cy="{y-1.5*s}" rx="{2.5*s}" ry="{1.2*s}" fill="#fff" opacity="0.45"/>')
    if eyes:
        parts.append(f'<circle cx="{x+7*s}" cy="{y-1.2*s}" r="{1.6*s}" fill="#fff" stroke="{outline}" stroke-width="{sw*0.6}"/><circle cx="{x+7.6*s}" cy="{y-1*s}" r="{0.8*s}" fill="#111"/>')
    if carry:
        parts.append(f'<circle cx="{x+12*s}" cy="{y-1*s}" r="{3*s}" fill="{carrycol}" stroke="{outline}" stroke-width="{sw*0.7}"/>')
    return ''.join(parts)

def spider(x,y,body,outline,sw,eyes=False):
    p=[]
    for i in range(8):
        a=math.pi/8 + i*math.pi/4
        lx,ly=math.cos(a)*26, math.sin(a)*22
        p.append(f'<path d="M{x} {y} q{lx*0.5} {ly*0.2-6} {lx} {ly}" fill="none" stroke="{outline}" stroke-width="{sw}" stroke-linecap="round"/>')
    p.append(f'<ellipse cx="{x}" cy="{y+2}" rx="13" ry="11" fill="{body}" stroke="{outline}" stroke-width="{sw}"/>')
    p.append(f'<circle cx="{x}" cy="{y-11}" r="7" fill="{body}" stroke="{outline}" stroke-width="{sw}"/>')
    if eyes:
        p.append(f'<circle cx="{x-3}" cy="{y-12}" r="2.4" fill="#fff"/><circle cx="{x+3}" cy="{y-12}" r="2.4" fill="#fff"/><circle cx="{x-2.6}" cy="{y-11.6}" r="1.2" fill="#111"/><circle cx="{x+3.4}" cy="{y-11.6}" r="1.2" fill="#111"/>')
    return ''.join(p)

def wobble(seed):  # subtle hand-drawn displacement filter
    return f'<filter id="wob{seed}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="{seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>'

# ================= STYLE 1: FIELD GUIDE =================
def field_guide():
    ink='#2b1d12'; paper='#efe4cc'; soil='#cdb48c'; tun='#e9dcc0'
    o=[]
    o.append(f'<defs>{wobble(3)}<pattern id="stip" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="{ink}" opacity="0.35"/><circle cx="4" cy="4" r="0.6" fill="{ink}" opacity="0.25"/></pattern><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="{ink}" stroke-width="0.9" opacity="0.5"/></pattern><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feColorMatrix type="matrix" values="0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 0.07 0" in="n" result="t"/><feBlend in="SourceGraphic" in2="t" mode="multiply"/></filter></defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="{paper}"/>')
    o.append(f'<g filter="url(#paper)">')
    o.append(f'<rect x="0" y="{GRASS}" width="{W}" height="{H-GRASS}" fill="{soil}"/><rect x="0" y="{GRASS}" width="{W}" height="{H-GRASS}" fill="url(#stip)"/>')
    # grass line as ink ticks
    o.append(f'<line x1="0" y1="{GRASS}" x2="{W}" y2="{GRASS}" stroke="{ink}" stroke-width="1.6"/>')
    o.append('<g stroke="%s" stroke-width="1" fill="none">'%ink + ''.join(f'<path d="M{x} {GRASS} l{random.randint(-2,2)} {-random.randint(5,11)}"/>' for x in range(0,W,9)) + '</g>')
    # tunnels
    o.append('<g filter="url(#wob3)">')
    o.append(f'<rect x="{SHAFT[0]}" y="{SHAFT[1]}" width="{SHAFT[2]}" height="{SHAFT[3]}" fill="{tun}" stroke="{ink}" stroke-width="1.4"/>')
    for x,y,w,h in CORR: o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{tun}" stroke="{ink}" stroke-width="1.4"/>')
    for i,(k,name,x,y,w,h) in enumerate(ROOMS):
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{tun}" stroke="{ink}" stroke-width="1.6"/><rect x="{x+4}" y="{y+4}" width="{w-8}" height="{h-8}" rx="11" fill="none" stroke="{ink}" stroke-width="0.6" opacity="0.6"/>')
        o.append(f'<text x="{x+w/2}" y="{y+h-8}" font-family="IM Fell English, Georgia, serif" font-style="italic" font-size="11" fill="{ink}" text-anchor="middle">fig. {i+1}  {name.lower()}</text>')
    o.append('</g>')
    # contents
    for ex,ey in EGGS: o.append(f'<ellipse cx="{ex}" cy="{ey}" rx="6" ry="4" fill="{paper}" stroke="{ink}" stroke-width="1"/><ellipse cx="{ex}" cy="{ey}" rx="6" ry="4" fill="url(#hatch)" opacity="0.5"/>')
    for px,py in PILES: o.append(f'<path d="M{px-12} {py+8} q12 -22 24 0 z" fill="{paper}" stroke="{ink}" stroke-width="1"/><path d="M{px-12} {py+8} q12 -22 24 0 z" fill="url(#hatch)" opacity="0.6"/>')
    for sx,sy in SOLD: o.append(ant(sx,sy,1.25,'#6b4a32',ink,1.2))
    qx,qy=QUEEN; o.append(f'<ellipse cx="{qx-14}" cy="{qy+4}" rx="26" ry="14" fill="#6b4a32" stroke="{ink}" stroke-width="1.4"/><ellipse cx="{qx-14}" cy="{qy+4}" rx="26" ry="14" fill="url(#hatch)" opacity="0.45"/><ellipse cx="{qx+14}" cy="{qy}" rx="9" ry="7" fill="#6b4a32" stroke="{ink}" stroke-width="1.4"/><circle cx="{qx+26}" cy="{qy-2}" r="7" fill="#6b4a32" stroke="{ink}" stroke-width="1.4"/><path d="M{qx+30} {qy-6} l8 -8 M{qx+32} {qy} l10 2" stroke="{ink}" stroke-width="1" fill="none"/>')
    for x,y,k,c in ANTS: o.append(ant(x,y,1,'#5a4030',ink,1.1,carry=bool(c),carrycol='#d9b86a'))
    o.append(spider(*SPIDER,'#5a4030',ink,1.2))
    o.append(f'<circle cx="{CRUMB[0]}" cy="{CRUMB[1]}" r="6" fill="#d9b86a" stroke="{ink}" stroke-width="1"/>')
    o.append('</g>')
    # labels with leader lines
    def lbl(tx,ty,x,y,t): return f'<line x1="{tx}" y1="{ty}" x2="{x}" y2="{y}" stroke="{ink}" stroke-width="0.7"/><text x="{tx+4}" y="{ty+3}" font-family="IM Fell English, Georgia, serif" font-size="11" fill="{ink}">{t}</text>'
    o.append(lbl(560,110,QUEEN[0]+10,QUEEN[1]-10,'the queen, 11 mm'))
    o.append(lbl(540,60,SPIDER[0]-14,SPIDER[1]+8,'Araneus, hunting'))
    o.append(lbl(40,110,EGGS[0][0]-6,EGGS[0][1]-3,'brood'))
    o.append(lbl(30,236,ANTS[1][0]-10,ANTS[1][1],'forager, carrying'))
    o.append(lbl(620,420,SOLD[2][0]+8,SOLD[2][1]+4,'majors at rest'))
    # plate title
    o.append(f'<rect x="18" y="18" width="684" height="444" fill="none" stroke="{ink}" stroke-width="0.8"/><rect x="22" y="22" width="676" height="436" fill="none" stroke="{ink}" stroke-width="0.4"/>')
    o.append(f'<text x="36" y="46" font-family="IM Fell English, Georgia, serif" font-size="18" fill="{ink}">Plate IV.  <tspan font-style="italic">Lasius niger</tspan>, the garden ant — nest in section</text>')
    o.append(f'<text x="684" y="452" font-family="IM Fell English, Georgia, serif" font-size="10" fill="{ink}" text-anchor="end" font-style="italic">drawn from the living colony, autumn</text>')
    return ''.join(o)

# ================= STYLE 2: CLAYMATION =================
def clay():
    o=[]
    o.append('<defs><filter id="fp"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="n"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0" in="n" result="t"/><feBlend in="SourceGraphic" in2="t" mode="multiply"/></filter><filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/></filter><radialGradient id="bead" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#5a3e2c"/><stop offset="1" stop-color="#1e120b"/></radialGradient><radialGradient id="beadq" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#8a6246"/><stop offset="1" stop-color="#3a2416"/></radialGradient><radialGradient id="egg" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#d9c9a8"/></radialGradient><radialGradient id="food" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#c7901e"/></radialGradient></defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="#a9d3ef"/>')
    o.append(f'<g filter="url(#grain)">')
    o.append(f'<rect x="0" y="{GRASS}" width="{W}" height="{H-GRASS}" fill="#8f5a2f"/>')
    o.append(f'<rect x="0" y="{GRASS-6}" width="{W}" height="12" fill="#6fae3d" filter="url(#fp)"/>')
    # clay blobs texture
    for i in range(70):
        x,y=random.randint(0,W),random.randint(GRASS+10,H); r=random.randint(6,18)
        o.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#7e4e27" opacity="0.5"/>')
    o.append('<g filter="url(#fp)">')
    o.append(f'<rect x="{SHAFT[0]-3}" y="{SHAFT[1]}" width="{SHAFT[2]+6}" height="{SHAFT[3]}" rx="14" fill="#3b2213"/>')
    for x,y,w,h in CORR: o.append(f'<rect x="{x}" y="{y-3}" width="{w}" height="{h+6}" rx="14" fill="#3b2213"/>')
    for k,name,x,y,w,h in ROOMS: o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="30" fill="#3b2213"/><rect x="{x+6}" y="{y+6}" width="{w-12}" height="{h-12}" rx="26" fill="#4a2c18"/>')
    o.append('</g>')
    # tags
    for k,name,x,y,w,h in ROOMS:
        o.append(f'<g filter="url(#shadow)"><rect x="{x+w/2-40}" y="{y-14}" width="80" height="20" rx="6" fill="#fff6dd" transform="rotate(-2 {x+w/2} {y-4})"/><text x="{x+w/2}" y="{y}" font-family="Fredoka, Nunito, sans-serif" font-size="12" fill="#5a3a1a" text-anchor="middle" font-weight="600">{name}</text></g>')
    # contents (glossy beads)
    for ex,ey in EGGS: o.append(f'<ellipse cx="{ex}" cy="{ey}" rx="7" ry="5" fill="url(#egg)" filter="url(#shadow)"/>')
    for px,py in PILES: o.append(f'<circle cx="{px}" cy="{py}" r="9" fill="url(#food)" filter="url(#shadow)"/><circle cx="{px+6}" cy="{py+4}" r="6" fill="url(#food)"/>')
    for sx,sy in SOLD: o.append('<g filter="url(#shadow)">'+ant(sx,sy,1.35,'url(#bead)','#1e120b',2.2,eyes=True,gloss=True)+'</g>')
    qx,qy=QUEEN; o.append(f'<g filter="url(#shadow)"><ellipse cx="{qx-14}" cy="{qy+4}" rx="28" ry="16" fill="url(#beadq)"/><ellipse cx="{qx-22}" cy="{qy-2}" rx="8" ry="4" fill="#fff" opacity="0.35"/><circle cx="{qx+14}" cy="{qy}" r="10" fill="url(#beadq)"/><circle cx="{qx+28}" cy="{qy-2}" r="8" fill="url(#beadq)"/><circle cx="{qx+31}" cy="{qy-5}" r="3.2" fill="#fff"/><circle cx="{qx+32}" cy="{qy-5}" r="1.6" fill="#111"/><path d="M{qx+33} {qy-9} q6 -8 10 -6 M{qx+35} {qy-2} q8 -1 10 3" stroke="#1e120b" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>')
    for x,y,k,c in ANTS: o.append('<g filter="url(#shadow)">'+ant(x,y,1.1,'url(#bead)','#1e120b',2,eyes=True,gloss=True,carry=bool(c),carrycol='url(#food)')+'</g>')
    o.append('<g filter="url(#shadow)">'+spider(*SPIDER,'#3a2a2a','#1a1010',2.4,eyes=True)+'</g>')
    o.append(f'<circle cx="{CRUMB[0]}" cy="{CRUMB[1]}" r="8" fill="url(#food)" filter="url(#shadow)"/>')
    o.append('</g>')
    o.append(f'<g filter="url(#shadow)"><rect x="24" y="20" width="250" height="34" rx="8" fill="#fff6dd" transform="rotate(-1.5 150 37)"/><text x="40" y="43" font-family="Fredoka, Nunito, sans-serif" font-size="20" fill="#5a3a1a" font-weight="700">Underfoot · the nest, take 12</text></g>')
    return ''.join(o)

# ================= STYLE 3: FOLK-ART WOODCUT =================
def woodcut():
    ink='#141414'; cream='#f6e7c1'; teal='#1f5e63'; red='#c8382b'; gold='#f2b632'
    o=[]
    o.append(f'<defs><pattern id="wg" width="40" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 q10 -3 20 0 t20 0" fill="none" stroke="{ink}" stroke-width="1.2" opacity="0.5"/></pattern><pattern id="xh" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 L8 0" stroke="{ink}" stroke-width="1.6"/></pattern><pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="{ink}"/></pattern></defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="{gold}"/>')
    o.append(f'<rect x="0" y="{GRASS}" width="{W}" height="{H-GRASS}" fill="{teal}"/><rect x="0" y="{GRASS}" width="{W}" height="{H-GRASS}" fill="url(#wg)"/>')
    o.append(f'<path d="M0 {GRASS} ' + ' '.join(f'l12 -10 l12 10' for _ in range(30)) + f' L{W} {GRASS+6} L0 {GRASS+6} z" fill="{ink}"/>')
    o.append(f'<rect x="{SHAFT[0]-4}" y="{SHAFT[1]}" width="{SHAFT[2]+8}" height="{SHAFT[3]}" fill="{cream}" stroke="{ink}" stroke-width="5"/>')
    for x,y,w,h in CORR: o.append(f'<rect x="{x}" y="{y-3}" width="{w}" height="{h+6}" fill="{cream}" stroke="{ink}" stroke-width="5"/>')
    for i,(k,name,x,y,w,h) in enumerate(ROOMS):
        fill = red if k in ('queen','barracks') else cream
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{ink}" stroke-width="6"/><rect x="{x+10}" y="{y+10}" width="{w-20}" height="{h-20}" fill="none" stroke="{ink}" stroke-width="2"/>')
        o.append(f'<rect x="{x}" y="{y+h-22}" width="{w}" height="22" fill="{ink}"/><text x="{x+w/2}" y="{y+h-6}" font-family="Rye, Alfa Slab One, Impact, serif" font-size="13" fill="{cream}" text-anchor="middle" letter-spacing="1">{name.upper()}</text>')
    for ex,ey in EGGS: o.append(f'<ellipse cx="{ex}" cy="{ey-6}" rx="7" ry="5" fill="{gold}" stroke="{ink}" stroke-width="3"/>')
    for px,py in PILES: o.append(f'<path d="M{px-13} {py+2} q13 -26 26 0 z" fill="{gold}" stroke="{ink}" stroke-width="3"/><path d="M{px-6} {py-2} l12 0" stroke="{ink}" stroke-width="2"/>')
    for sx,sy in SOLD: o.append(ant(sx,sy-6,1.4,ink,ink,3,carry=False) + f'<circle cx="{sx+8.4}" cy="{sy-7.6}" r="1.8" fill="{cream}"/>')
    qx,qy=QUEEN; o.append(f'<ellipse cx="{qx-14}" cy="{qy-2}" rx="28" ry="15" fill="{ink}"/><ellipse cx="{qx-14}" cy="{qy-2}" rx="18" ry="8" fill="{gold}"/><ellipse cx="{qx-14}" cy="{qy-2}" rx="18" ry="8" fill="url(#xh)"/><circle cx="{qx+14}" cy="{qy-6}" r="10" fill="{ink}"/><circle cx="{qx+28}" cy="{qy-8}" r="8" fill="{ink}"/><circle cx="{qx+30}" cy="{qy-10}" r="2" fill="{cream}"/><path d="M{qx+33} {qy-14} l10 -8 M{qx+35} {qy-6} l12 2" stroke="{ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M{qx+20} {qy-18} l4 -8 l4 8 l4 -8 l4 8" fill="{gold}" stroke="{ink}" stroke-width="2"/>')
    for x,y,k,c in ANTS: o.append(ant(x,y,1.15,ink,ink,2.6,carry=bool(c),carrycol=gold)+f'<circle cx="{x+6.9}" cy="{y-1.4}" r="1.5" fill="{cream}"/>')
    o.append(spider(*SPIDER,ink,ink,3)+f'<circle cx="{SPIDER[0]-3}" cy="{SPIDER[1]-12}" r="2.2" fill="{red}"/><circle cx="{SPIDER[0]+3}" cy="{SPIDER[1]-12}" r="2.2" fill="{red}"/>')
    o.append(f'<circle cx="{CRUMB[0]}" cy="{CRUMB[1]}" r="8" fill="{cream}" stroke="{ink}" stroke-width="3"/>')
    # papel picado border + title card
    o.append(f'<rect x="8" y="8" width="{W-16}" height="{H-16}" fill="none" stroke="{ink}" stroke-width="6"/><rect x="18" y="18" width="{W-36}" height="{H-36}" fill="none" stroke="{cream}" stroke-width="2" stroke-dasharray="8 6"/>')
    o.append(f'<rect x="22" y="22" width="300" height="38" fill="{red}" stroke="{ink}" stroke-width="4"/><text x="172" y="49" font-family="Rye, Alfa Slab One, Impact, serif" font-size="22" fill="{cream}" text-anchor="middle" letter-spacing="2">LA HORMIGA · UNDERFOOT</text>')
    o.append(f'<rect x="{W-182}" y="22" width="160" height="38" fill="{cream}" stroke="{ink}" stroke-width="4"/><text x="{W-102}" y="48" font-family="Rye, Alfa Slab One, Impact, serif" font-size="18" fill="{ink}" text-anchor="middle">No. 11  LA ARAÑA</text>')
    return ''.join(o)

# ================= STYLE 4: FLAT VECTOR =================
def vector():
    o=[]; bg='#f4f1ea'; s1='#dcc7a3'; s2='#c9ad84'; s3='#b08a62'; tun='#3b2d22'; ink='#1f1a16'; green='#6fd36b'
    o.append('<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="{bg}"/>')
    o.append(f'<rect x="0" y="{GRASS}" width="{W}" height="150" fill="{s1}"/><rect x="0" y="{GRASS+150}" width="{W}" height="130" fill="{s2}"/><rect x="0" y="{GRASS+280}" width="{W}" height="{H-GRASS-280}" fill="{s3}"/>')
    o.append(f'<rect x="0" y="{GRASS-4}" width="{W}" height="4" fill="#8fc46a"/>')
    o.append(f'<rect x="{SHAFT[0]}" y="{SHAFT[1]}" width="{SHAFT[2]}" height="{SHAFT[3]}" rx="12" fill="{tun}"/>')
    for x,y,w,h in CORR: o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="11" fill="{tun}"/>')
    cols={'queen':'#7a5a8a','hatchery':'#8a7a46','store':'#9a8a42','barracks':'#6a4646'}
    for k,name,x,y,w,h in ROOMS:
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{tun}"/><rect x="{x+5}" y="{y+5}" width="{w-10}" height="{h-10}" rx="13" fill="{cols[k]}"/>')
        o.append(f'<text x="{x+w/2}" y="{y+18}" font-family="DM Sans, Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="#fff" text-anchor="middle" opacity="0.9">{name}</text>')
    # scent trail glow along corridor 1 and shaft
    o.append(f'<path d="M{SHAFT[0]+12} {GRASS} V{CORR[0][1]+11} H{CORR[0][0]+10}" fill="none" stroke="{green}" stroke-width="4" opacity="0.8" filter="url(#glow)" stroke-linecap="round"/>')
    for ex,ey in EGGS: o.append(f'<ellipse cx="{ex}" cy="{ey}" rx="5.5" ry="4" fill="#f3ead6"/>')
    for px,py in PILES: o.append(f'<circle cx="{px}" cy="{py}" r="8" fill="#f2d36b"/>')
    def vant(x,y,sc,col,carry=False):
        return f'<circle cx="{x-5*sc}" cy="{y}" r="{5*sc}" fill="{col}"/><circle cx="{x+3*sc}" cy="{y}" r="{3.2*sc}" fill="{col}"/>' + (f'<circle cx="{x+8*sc}" cy="{y-2*sc}" r="{3*sc}" fill="#f2d36b"/>' if carry else '')
    for sx,sy in SOLD: o.append(vant(sx,sy,1.5,'#111'))
    qx,qy=QUEEN; o.append(f'<ellipse cx="{qx-10}" cy="{qy+2}" rx="24" ry="13" fill="#2a1d14"/><circle cx="{qx+16}" cy="{qy}" r="9" fill="#2a1d14"/><circle cx="{qx+28}" cy="{qy-2}" r="6" fill="#2a1d14"/><circle cx="{qx+28}" cy="{qy-16}" r="3" fill="#ffd34d"/>')
    for x,y,k,c in ANTS: o.append(vant(x,y,1.1,ink,bool(c)))
    sx,sy=SPIDER; o.append(f'<circle cx="{sx}" cy="{sy}" r="12" fill="#4b3324"/><circle cx="{sx}" cy="{sy-12}" r="6" fill="#4b3324"/>' + ''.join(f'<line x1="{sx}" y1="{sy}" x2="{sx+math.cos(i*math.pi/4+0.4)*24}" y2="{sy+math.sin(i*math.pi/4+0.4)*20}" stroke="#4b3324" stroke-width="2.5" stroke-linecap="round"/>' for i in range(8)))
    o.append(f'<circle cx="{CRUMB[0]}" cy="{CRUMB[1]}" r="7" fill="#f2d36b"/>')
    # minimal HUD
    o.append(f'<rect x="20" y="18" width="330" height="34" rx="10" fill="#fff" opacity="0.9"/><text x="34" y="40" font-family="DM Sans, Inter, system-ui, sans-serif" font-size="13" fill="{ink}" font-weight="500">Food 42/150 · Water 18/60 · Protein 12 · Stone 9 · Ants 31/40</text>')
    return ''.join(o)

STYLES=[('Main.dc.html','Field guide (naturalist plate)',field_guide,'IM+Fell+English:ital@0;1'),
        ('Clay.dc.html','Claymation (stop-motion)',clay,'Fredoka:wght@400;600;700'),
        ('Woodcut.dc.html','Folk-art woodcut',woodcut,'Rye'),
        ('Vector.dc.html','Flat vector (fallback)',vector,'DM+Sans:wght@400;500;600')]
for fn,title,f,font in STYLES:
    random.seed(4)
    svg=f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Underfoot nest scene in the {title} style">'+f()+'</svg>'
    html=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Underfoot — {title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font}&display=swap">
<style>
body{{margin:0}}
a{{color:#666}}a:hover{{color:#333}}
</style>
</helmet>
<div style="width: {W}px; height: {H}px; box-sizing: border-box; overflow: hidden; background: #ffffff">
{svg}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{W},"height":{H}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
    open(ROOT+fn,'w').write(html)
boards={}; order=[]
pos=[(0,0),(800,0),(0,600),(800,600)]
for (fn,title,f,font),(x,y) in zip(STYLES,pos):
    boards[fn]={"x":x,"y":y,"w":W,"h":H,"title":title}; order.append(fn)
canvas={"v":3,"createdOnFiles":{"v":1,"at":datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')},"title":"Underfoot — style mockups","launch":{"view":"canvas"},"pages":[],"boards":boards,"order":order,
 "notes":{"t1":{"x":0,"y":-300,"text":"Same scene, four styles","kind":"title1","maxW":1520},
          "n1":{"x":1600,"y":0,"w":300,"text":"The scene in every board: queen chamber with the queen, hatchery with six eggs, food store with piles, barracks with three majors, five workers (two carrying), a crumb and a spider at the surface edge.","fill":"orange"}},
 "designSystems":[]}
json.dump(canvas,open(ROOT+'canvas.json','w'),indent=1)
print('ok', [len(open(ROOT+f).read()) for f,_,_,_ in STYLES])
