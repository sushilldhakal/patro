import sys,subprocess,random,numpy as np
from jplephem.spk import SPK
bsp,veph,exe=sys.argv[1:4]
k=SPK.open(bsp)
random.seed(11)
lo,hi=-14200747200.0+86400*40, 20512699200.0-86400*40
ets=[random.uniform(lo,hi) for _ in range(10000)]
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
print('10,000 random TDB instants 1550-2650, max position error vs jplephem (original JPL kernel):')
for j,n in enumerate(names): print(f'  {n:10s} max {errs[j].max():.3e} km   mean {errs[j].mean():.3e} km   max vel err {verr[j].max():.2e} km/s')
