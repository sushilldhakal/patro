import sys,numpy as np,erfa
import struct
from jplephem.spk import SPK
class Kernels:
    """One or more SPK files (DE441 is two halves); picks the one covering an instant."""
    def __init__(self,paths): self.ks=[SPK.open(p) for p in paths]
    def __getitem__(self,key):
        c,t=key
        return _Seg(self.ks,c,t)
class _Seg:
    def __init__(self,ks,c,t): self.ks=ks; self.key=(c,t)
    def _k(self,tdb2):
        et=tdb2*86400.0
        for k in self.ks:
            s=k[self.key]
            if s.start_second<=et<=s.end_second: return s
        return self.ks[0][self.key]
    def compute(self,tdb,tdb2): return self._k(tdb2).compute(tdb,tdb2)
    def compute_and_differentiate(self,tdb,tdb2): return self._k(tdb2).compute_and_differentiate(tdb,tdb2)
def veph_range(path):
    with open(path,'rb') as f: h=f.read(32)
    return struct.unpack('<dd',h[16:32])
lines=[l.split() for l in open(sys.argv[1])]
k=Kernels(sys.argv[2:])
C=299792.458
SPANS=[12,6,360/27,360/108,360/27,30,360/27,30,1,90]
COUNT=[30,60,27,108,27,12,27,12,360,4]
def pos(t,c,et): return k[c,t].compute(2451545.0,et/86400.0)
def bary(n,et):
    if n=='Sun': return pos(10,0,et)
    if n=='Moon': return pos(3,0,et)+pos(301,3,et)
    return pos({'Mercury':1,'Venus':2,'Mars':4,'Jupiter':5,'Saturn':6}[n],0,et)
def M(jd):
    e=erfa.obl06(2451545.0,jd-2451545.0); P=erfa.pmat06(2451545.0,jd-2451545.0)
    return np.array([[1,0,0],[0,np.cos(e),np.sin(e)],[0,-np.sin(e),np.cos(e)]])@P
a0=np.radians(23.245524743); V0=M(2435553.5).T@np.array([np.cos(a0),np.sin(a0),0.0])
def sid(n,jd_tt):
    et=(jd_tt-2451545.0)*86400.0+erfa.dtdb(2451545.0,jd_tt-2451545.0,0.0,0.0,0.0,0.0)
    E=pos(3,0,et)+pos(399,3,et)
    vE=(k[0,3].compute_and_differentiate(2451545.0,et/86400.0)[1]+k[3,399].compute_and_differentiate(2451545.0,et/86400.0)[1])/86400.0
    v=bary(n,et)-E
    for _ in range(3): v=bary(n,et-np.linalg.norm(v)/C)-E
    pp=erfa.ab(v/np.linalg.norm(v),vE/C,1.0,np.sqrt(1-vE.dot(vE)/C**2))
    m=M(jd_tt); x=m@pp; z=m@V0
    return (np.degrees(np.arctan2(x[1],x[0]))-np.degrees(np.arctan2(z[1],z[0])))%360
w=lambda x:(x+180)%360-180
def root(g,t,h=2e-5):
    f0=g(t); t1=t+h; f1=g(t1)
    for _ in range(6):
        if f1==f0: break
        t2=t1-f1*(t1-t)/(f1-f0); t,f0,t1=t1,f1,t2; f1=g(t1)
        if abs(t1-t)<1e-10: break
    return t1
BODY=['Mercury','Venus','Mars','Jupiter','Saturn']
res={}
for kind,mult,jd_ut,jd_tt in lines:
    kind=int(kind); mult=int(mult); tt=float(jd_tt)
    if kind<10:
        tgt=mult*SPANS[kind]
        def ang(t):
            s=sid('Sun',t); m=sid('Moon',t)
            return {0:m-s,1:m-s,2:m,3:m,4:s+m,5:m,6:s,7:s,8:s,9:m-s}[kind]%360
        g=lambda t:w(ang(t)-tgt)
        d=(root(g,tt)-tt)*86400000; name=['Tithi','Karana','Nakshatra','Pada','Yoga','MoonRashi','SunNakshatra','Sankranti','SunDegree','Phase'][kind]
    elif kind<30:
        n=BODY[kind-20]; cands=[mult*30.0,((mult+1)*30.0)%360]
        b=min(cands,key=lambda b:abs(w(sid(n,tt)-b)))
        g=lambda t:w(sid(n,t)-b); d=(root(g,tt,1e-4)-tt)*86400000; name='Ingress '+n
    else:
        n=BODY[kind-30]
        sp=lambda t:w(sid(n,t+1e-3)-sid(n,t-1e-3))
        # a station is the extremum of the longitude: fit a degree-6 polynomial to 41
        # longitudes over +-0.4 day round the index's answer (numpy, a different grid
        # from the Rust solver's) and take the root of its derivative
        xs=np.linspace(-0.4,0.4,41); base=sid(n,tt)
        ys=np.array([w(sid(n,tt+x)-base) for x in xs])
        c=np.polyfit(xs/0.4,ys,6); r=np.roots(np.polyder(c))
        r=r[np.abs(r.imag)<1e-9].real; r=r[np.abs(r)<1.0]
        d=float('nan') if len(r)==0 else r[np.argmin(np.abs(r))]*0.4*86400000.0
        name='Station '+n
    if d==d: res.setdefault(name,[]).append(abs(d))
    else: res.setdefault(name+' (no sign change)',[]).append(0.0)
print('Event time differences, index vs re-solved from the original JPL kernel (ms):')
tot=0
for n,v in res.items():
    v=np.array(v); tot+=len(v); print(f'  {n:18s} n={len(v):5d} median {np.median(v):8.3f}  p99 {np.percentile(v,99):9.3f}  max {v.max():10.3f}')
print('total events checked',tot)
