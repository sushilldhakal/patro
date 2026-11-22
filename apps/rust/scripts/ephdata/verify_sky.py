import sys,subprocess,random,numpy as np,erfa
from jplephem.spk import SPK
bsp,veph,exe=sys.argv[1:4]
k=SPK.open(bsp)
random.seed(5)
jds=[random.uniform(2305448.0+60, 2688000.0-60) for _ in range(3000)]  # 1600..2650 UT
out=subprocess.run([exe,'lon',veph],input='\n'.join(repr(j) for j in jds),capture_output=True,text=True,check=True).stdout.strip().split('\n')
C=299792.458
def pos(t,c,et): return k[c,t].compute(2451545.0,et/86400.0)
def bary(name,et):
    if name=='Sun': return pos(10,0,et)
    if name=='Moon': return pos(3,0,et)+pos(301,3,et)
    return pos({'Mercury':1,'Venus':2,'Mars':4,'Jupiter':5,'Saturn':6}[name],0,et)
def earth(et): return pos(3,0,et)+pos(399,3,et)
def evel(et):
    return (k[0,3].compute_and_differentiate(2451545.0,et/86400.0)[1]+k[3,399].compute_and_differentiate(2451545.0,et/86400.0)[1])/86400.0
def ecl(v,jd_tt):
    m=erfa.pmat06(2451545.0,jd_tt-2451545.0)
    eps=erfa.obl06(2451545.0,jd_tt-2451545.0)
    x=m@v; c,s=np.cos(eps),np.sin(eps)
    y2=x[1]*c+x[2]*s; z2=-x[1]*s+x[2]*c
    return np.degrees(np.arctan2(y2,x[0]))%360, np.degrees(np.arcsin(z2/np.linalg.norm(x)))
def dang(a,b): return (a-b+180)%360-180
A0=23.245524743; JD0=2435553.5
def ayan(jd_tt):
    m0=erfa.pmat06(2451545.0,JD0-2451545.0); e0=erfa.obl06(2451545.0,JD0-2451545.0)
    # ecliptic-of-date matrix at epoch
    def M(jd):
        e=erfa.obl06(2451545.0,jd-2451545.0); P=erfa.pmat06(2451545.0,jd-2451545.0)
        R=np.array([[1,0,0],[0,np.cos(e),np.sin(e)],[0,-np.sin(e),np.cos(e)]]); return R@P
    a=np.radians(A0); v=M(JD0).T@np.array([np.cos(a),np.sin(a),0.0])
    z=M(jd_tt)@v; return np.degrees(np.arctan2(z[1],z[0]))
names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn']
worst={n:[0,0,0,0] for n in names}; wa=0; wn=0
for jd,line in zip(jds,out):
    f=line.split(); jd_tt=float(f[1]); my_ayan=float(f[2])
    wa=max(wa,abs(my_ayan-ayan(jd_tt)))
    dtdb=erfa.dtdb(2451545.0,jd_tt-2451545.0,0.0,0.0,0.0,0.0)
    et=(jd_tt-2451545.0)*86400.0+dtdb
    E=earth(et); vE=evel(et)
    for i,n in enumerate(names):
        mylon,mylat,mal,mat=map(float,f[3+4*i:7+4*i])
        v=bary(n,et)-E
        for _ in range(3): v=bary(n,et-np.linalg.norm(v)/C)-E
        al,at=ecl(v,jd_tt)
        pn=v/np.linalg.norm(v); bm1=np.sqrt(1-vE.dot(vE)/C**2)
        pp=erfa.ab(pn,vE/C,1.0,bm1)
        pl,pt=ecl(pp,jd_tt)
        w=worst[n]
        w[0]=max(w[0],abs(dang(mal,al))*3600); w[1]=max(w[1],abs(mat-at)*3600)
        w[2]=max(w[2],abs(dang(mylon,pl))*3600); w[3]=max(w[3],abs(mylat-pt)*3600)
print('3,000 random instants 1600-2650: our frames vs SOFA (pyerfa) on the same JPL positions')
print(f'  ayanamsha max difference {wa*3600:.2e} arcsec')
for n in names: print(f'  {n:8s} astrometric lon {worst[n][0]:.2e}" lat {worst[n][1]:.2e}"   apparent lon {worst[n][2]:.2e}" lat {worst[n][3]:.2e}"')
