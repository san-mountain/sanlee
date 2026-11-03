'use client';
import { Tap, useSign, type TapFn } from './parts';
import type { Lang } from '@/data/site';
import type { FaceState } from './faceAuth';
export default function FaceAuthObjects({ state, onTap, lang }: { state: FaceState; onTap: TapFn; lang: Lang }) {
  const sign = useSign([[lang === 'ko' ? '얼굴을 맞추십시오' : 'MATCH THE FACE',1], ['FACE AUTH / A',0.55]], { color:'#43dce1',bg:'#101b24',w:512,h:256 });
  return <group>
    <Tap id="face-auth" onTap={onTap}><group position={[-3,0,-5]}><mesh position={[0,.65,0]}><boxGeometry args={[1,1.3,.6]}/><meshStandardMaterial color="#24313a"/></mesh><mesh position={[0,1.55,.1]} rotation={[-.2,0,0]}><boxGeometry args={[1.5,.85,.15]}/><meshStandardMaterial color="#151820"/></mesh><mesh position={[0,1.55,.19]} rotation={[-.2,0,0]}><planeGeometry args={[1.4,.75]}/><meshBasicMaterial map={sign}/></mesh></group></Tap>
    <Tap id="face-specs" onTap={onTap}><mesh position={[-4.7,1.2,-4]} rotation={[-.3,.3,0]}><boxGeometry args={[1,.8,.1]}/><meshStandardMaterial color="#b3a283"/></mesh></Tap>
    <Tap id="face-scanner" onTap={onTap}><group position={[2.7,0,0]}><mesh position={[0,1.5,0]}><cylinderGeometry args={[.05,.05,3,10]}/><meshStandardMaterial color="#777a80"/></mesh><mesh position={[-.3,state.scanner === 'high' ? 2.8 : 2,0]}><boxGeometry args={[.7,.3,.4]}/><meshStandardMaterial color="#394a58" emissive="#22bccc" emissiveIntensity={.3}/></mesh></group></Tap>
    <Tap id="face-lamp" onTap={onTap}><mesh position={[2.7,1,-2]} rotation={[0,0,state.lampDim ? 1 : .2]}><boxGeometry args={[.7,.3,.3]}/><meshStandardMaterial color={state.lampDim ? '#675e4d' : '#eee2bf'}/></mesh></Tap>
    {[[0,3,'face-front'],[3,0,'face-side']].map(([x,z,id]) => <Tap key={id} id={String(id)} onTap={onTap}><mesh position={[Number(x),.025,Number(z)]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.45,.55,24]}/><meshBasicMaterial color="#43dce1" transparent opacity={.6}/></mesh></Tap>)}
  </group>;
}
