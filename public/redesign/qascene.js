/* Shared "Quantum Ayurveda" 3D scene — used by the experience page and the
   homepage hero. Layers that read as Quantum + Ayurveda:
     · energized botanical molecule (organic noise-displaced core)
     · Bohr-atom electron orbitals + travelling electrons        (quantum)
     · expanding wave-interference ripples / vibrational frequencies (quantum)
     · Sri Yantra sacred-geometry mandala                         (Ayurveda)
     · golden quantum particle field
   Returns { group, uni, update(dt, state) } where state = {energy,lock,resonance,release}. */
import * as THREE from 'three';

export const GREEN = new THREE.Color('#0c4a2a');
export const GOLD = new THREE.Color('#e6c074');
export const GOLD_HOT = new THREE.Color('#ffe6ad');

const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function ringPoints(r, seg = 160) {
  const a = [];
  for (let i = 0; i <= seg; i++) { const t = i / seg * Math.PI * 2; a.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0)); }
  return a;
}
function goldLine(points, opacity = 0.5, color = GOLD) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
}

/* ---- Sri Yantra-inspired sacred-geometry mandala ---- */
function buildMandala() {
  const m = new THREE.Group();
  // concentric circles
  [2.95, 3.25, 4.05].forEach((r, i) => m.add(goldLine(ringPoints(r), i === 2 ? 0.3 : 0.42)));
  // lotus-petal ring
  const petals = 24, rIn = 3.28, rOut = 4.0; const pp = [];
  for (let i = 0; i < petals; i++) {
    const a0 = i / petals * Math.PI * 2, a1 = (i + 0.5) / petals * Math.PI * 2, a2 = (i + 1) / petals * Math.PI * 2;
    pp.push(new THREE.Vector3(Math.cos(a0) * rIn, Math.sin(a0) * rIn, 0));
    pp.push(new THREE.Vector3(Math.cos(a1) * rOut, Math.sin(a1) * rOut, 0));
    pp.push(new THREE.Vector3(Math.cos(a1) * rOut, Math.sin(a1) * rOut, 0));
    pp.push(new THREE.Vector3(Math.cos(a2) * rIn, Math.sin(a2) * rIn, 0));
  }
  const pg = new THREE.BufferGeometry().setFromPoints(pp);
  m.add(new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })));
  // interlocking triangles (Sri Yantra core)
  function tri(R, up, rot) {
    const pts = [];
    for (let k = 0; k < 4; k++) { const a = rot + (up ? -Math.PI / 2 : Math.PI / 2) + k * (Math.PI * 2 / 3); pts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0)); }
    return goldLine(pts, 0.4);
  }
  [2.7, 2.1, 1.5].forEach(R => m.add(tri(R, true, 0)));
  [2.45, 1.85, 1.25].forEach(R => m.add(tri(R, false, 0)));
  return m;
}

/* ---- Bohr-atom electron orbitals ---- */
function buildOrbitals() {
  const g = new THREE.Group();
  const electrons = [];
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.EllipseCurve(0, 0, 2.45, 1.05, 0, Math.PI * 2, false, 0);
    const line = goldLine(curve.getPoints(140).map(p => new THREE.Vector3(p.x, p.y, 0)), 0.36, i % 2 ? GREEN.clone().multiplyScalar(2.2) : GOLD);
    const orb = new THREE.Group(); orb.add(line);
    orb.rotation.z = i * (Math.PI / 3);
    orb.rotation.x = 1.2 + i * 0.25;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff2cf }));
    orb.add(e); electrons.push({ e, a: 2.45, b: 1.05, spd: 0.6 + i * 0.32, off: i * 2.3 });
    g.add(orb);
  }
  g.userData.electrons = electrons;
  return g;
}

/* ---- quantum wave-interference ripples ---- */
function buildRipples() {
  const g = new THREE.Group(); const ripples = [];
  for (let i = 0; i < 5; i++) {
    const line = goldLine(ringPoints(1, 96), 0, GOLD_HOT);
    g.add(line); ripples.push({ line, phase: i / 5 });
  }
  g.userData.ripples = ripples;
  return g;
}

export function buildQAScene(scene, opts = {}) {
  const particleCount = opts.particles || 8500;
  const uni = { uTime: { value: 0 }, uEnergy: { value: 0 }, uLock: { value: 0 }, uResonance: { value: 0 }, uRelease: { value: 0 } };
  const group = new THREE.Group(); scene.add(group);

  /* energized botanical molecule */
  const molMat = new THREE.ShaderMaterial({
    uniforms: { ...uni, uGreen: { value: GREEN }, uGold: { value: GOLD } },
    transparent: true,
    vertexShader: SNOISE + `
      uniform float uTime,uEnergy,uLock,uRelease;
      varying float vN; varying vec3 vNormalW; varying vec3 vViewDir;
      void main(){
        float t=uTime*0.25; float turbulence=mix(1.0,0.18,uLock);
        float n=snoise(position*1.1 + vec3(0.0,0.0,t*1.4));
        float n2=snoise(position*2.6 - vec3(t));
        float facet=snoise(floor(position*3.0)*0.7);
        float disp=mix(n*0.55+n2*0.18, facet*0.5, uLock)*turbulence;
        disp*=(0.16+uEnergy*0.62);
        vec3 pos=position+normal*disp; pos+=normal*uRelease*1.4;
        vN=n*0.5+0.5; vec4 wp=modelMatrix*vec4(pos,1.0);
        vNormalW=normalize(mat3(modelMatrix)*normal); vViewDir=normalize(cameraPosition-wp.xyz);
        gl_Position=projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: `
      uniform vec3 uGreen,uGold; uniform float uEnergy,uRelease,uResonance;
      varying float vN; varying vec3 vNormalW; varying vec3 vViewDir;
      void main(){
        float fres=pow(1.0-clamp(dot(vNormalW,vViewDir),0.0,1.0),2.4);
        float heat=clamp(fres+uEnergy*0.34+vN*0.32+uResonance*0.18,0.0,1.4);
        vec3 col=mix(uGreen,uGold,clamp(heat,0.0,1.0)); col+=uGold*fres*0.45; col*=(0.72+uEnergy*0.36);
        gl_FragColor=vec4(col,1.0-uRelease*0.85);
      }`,
  });
  const molecule = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 32), molMat); group.add(molecule);
  const lattice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.62, 2), new THREE.MeshBasicMaterial({ color: 0xe6c074, wireframe: true, transparent: true, opacity: 0 })); group.add(lattice);

  const mandala = buildMandala(); group.add(mandala);
  const orbitals = buildOrbitals(); group.add(orbitals);
  const ripples = buildRipples(); group.add(ripples);

  /* particle field */
  const pos = new Float32Array(particleCount * 3), seed = new Float32Array(particleCount), tint = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    const rr = 2.0 + Math.pow(Math.random(), 0.6) * 8.5, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = rr * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th) * 0.72; pos[i * 3 + 2] = rr * Math.cos(ph);
    seed[i] = Math.random() * 6.283; tint[i] = Math.random();
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  pgeo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { ...uni, uGreen: { value: GREEN }, uGold: { value: GOLD }, uPix: { value: opts.pixelRatio || 1.5 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime,uEnergy,uRelease,uPix; attribute float aSeed,aTint; varying float vT;
      void main(){
        vec3 p=position; float t=uTime*0.5+aSeed;
        p+=vec3(sin(t),cos(t*0.9),sin(t*0.7))*0.18;
        vec3 dir=normalize(position); float pull=uEnergy*(0.55+0.45*sin(aSeed*3.0));
        p=mix(p, dir*(2.7+0.5*sin(t)), pull*0.38); p+=dir*uRelease*(3.0+4.0*aTint);
        vT=aTint; vec4 mv=modelViewMatrix*vec4(p,1.0);
        float size=mix(2.0,5.0,aTint)*(1.0+uEnergy*1.4);
        gl_PointSize=size*uPix*(8.0/-mv.z); gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform vec3 uGreen,uGold; uniform float uEnergy,uRelease; varying float vT;
      void main(){
        vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard;
        float a=smoothstep(0.5,0.0,d); vec3 col=mix(uGreen*1.7,uGold,vT*0.7+uEnergy*0.4);
        a*=(0.22+uEnergy*0.28)*(1.0-uRelease*0.7); gl_FragColor=vec4(col,a);
      }`,
  });
  group.add(new THREE.Points(pgeo, pMat));

  function update(dt, st) {
    uni.uTime.value += dt;
    uni.uEnergy.value = st.energy; uni.uLock.value = st.lock; uni.uResonance.value = st.resonance; uni.uRelease.value = st.release;
    const T = uni.uTime.value;

    molecule.rotation.y += dt * (0.08 + st.energy * 0.18);
    molecule.rotation.x = Math.sin(T * 0.1) * 0.15;
    molecule.scale.setScalar(1 + Math.sin(T * 1.2) * 0.02 * (0.4 + st.energy));
    lattice.rotation.copy(molecule.rotation);
    lattice.material.opacity = st.lock * 0.5 * (1 - st.release);

    mandala.rotation.z += dt * 0.05;
    const mvis = (0.32 + st.energy * 0.45 + st.resonance * 0.3) * (1 - st.release * 0.8);
    mandala.children.forEach(c => { c.material.opacity = mvis * (c.material.userData ? 1 : 1); c.material.opacity = mvis; });
    mandala.scale.setScalar(1 + st.lock * 0.04);

    orbitals.rotation.y += dt * (0.18 + st.resonance * 0.5);
    orbitals.rotation.z += dt * 0.04;
    const ovis = (0.3 + st.resonance * 0.55 + st.energy * 0.2) * (1 - st.release * 0.7);
    orbitals.userData.electrons.forEach(o => {
      o.e.parent.children[0].material.opacity = ovis * 0.7;
      const ang = T * o.spd + o.off; o.e.position.set(Math.cos(ang) * o.a, Math.sin(ang) * o.b, 0);
      o.e.material.opacity = ovis;
      o.e.material.transparent = true;
    });

    orbitals.userData.electrons.forEach(() => {});
    ripples.userData.ripples.forEach(rp => {
      rp.phase = (rp.phase + dt * (0.12 + st.energy * 0.3)) % 1;
      const s = 0.6 + rp.phase * 5.2; rp.line.scale.setScalar(s);
      rp.line.material.opacity = (1 - rp.phase) * (0.12 + st.energy * 0.5 + st.release * 0.4);
    });
  }

  return { group, uni, molecule, mandala, orbitals, ripples, update };
}
