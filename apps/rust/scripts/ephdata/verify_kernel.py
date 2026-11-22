import sys,subprocess,random,numpy as np
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
veph,exe=sys.argv[1:3]
k=Kernels(sys.argv[3:])
random.seed(11)
a_,b_=veph_range(veph); lo,hi=a_+86400*40,b_-86400*40
ets=[random.uniform(lo,hi) for _ in range(10000)]
# Where two kernel files join (DE441 part-1 / part-2), sample densely: a bad join is a
# few days wide and ten thousand random instants would not land in it.
seams=[k.ks[i][0,10].end_second for i in range(len(k.ks)-1)] if len(k.ks)>1 else []
for seam in seams:
    ets+= [seam+random.uniform(-5,5)*86400 for _ in range(500)]
print('samples:',len(ets),'(including',500*len(seams),'around',len(seams),'kernel seam(s))')
pairs=[(10,0),(3,0),(399,3),(301,3),(1,0),(2,0),(4,0),(5,0),(6,0),(7,0),(8,0),(9,0)]
out=subprocess.run([exe,'dump',veph],input='\n'.join(repr(e) for e in ets),capture_output=True,text=True,check=True).stdout.split('\n')
names=['Sun','EMB','Earth-EMB','Moon-EMB','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
errs=np.zeros((len(pairs),len(ets))); verr=np.zeros_like(errs)
for i,(line,et) in enumerate(zip(out,ets)):
    f=np.array(line.split()[1:],float).reshape(12,6)
    for j,(t,c) in enumerate(pairs):
        p,v=k[c,t].compute_and_differentiate(2451545.0,et/86400.0)
        errs[j,i]=np.linalg.norm(f[j,:3]-p)
        verr[j,i]=np.linalg.norm(f[j,3:]-v/86400.0)
print('Random TDB instants over the whole file, max position error vs jplephem (original JPL kernel):')
for j,n in enumerate(names): print(f'  {n:10s} max {errs[j].max():.3e} km   mean {errs[j].mean():.3e} km   max vel err {verr[j].max():.2e} km/s')
