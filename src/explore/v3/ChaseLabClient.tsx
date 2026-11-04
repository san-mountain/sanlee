"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { input, moveVector, turnKeys } from "../input";
import { Joystick, JumpButton, requestLock, useLookAndKeys } from "../TouchControls";
import { act, collide, currentTarget, distance, EXIT_Z, FUSES, finish, GATE_PANEL, GATE_Z, initialRun, openGate, retry, scannerExposure, scannerX, START, CHASE_CHECKPOINT, COVERS, type ChaseRun, type InteractId, type Point } from "./chaseLogic";
import styles from "./ChaseLab.module.css";

type Screen = "intro" | "play" | "pause" | "caught" | "complete";
type Telemetry = { meter: number; exposed: boolean; covered: boolean; charge: number };
const NAMES: Record<InteractId, string> = { "fuse-west": "서쪽 전력 복구", "fuse-east": "동쪽 전력 복구", gate: "차단문 해제" };
const point = (x:number,z:number):Point => ({x,z});

function Rig({ active, run, resetId, position, clock, onNear, onTelemetry, onCaught, onGate, onFinish }: {
 active:boolean; run:ChaseRun; resetId:number; position:React.RefObject<Point>; clock:React.RefObject<{t:number}>;
 onNear:(id:InteractId|null)=>void; onTelemetry:(v:Telemetry)=>void; onCaught:()=>void; onGate:()=>void; onFinish:()=>void;
}) {
 const camera = useThree(s=>s.camera);
 const p = useRef({x:START.x,z:START.z,yaw:0,pitch:0,y:0,vy:0});
 const meter=useRef(0),charge=useRef(0),tick=useRef(0),done=useRef(false);
 useEffect(()=>{
   const start=resetId===0||run.phase==="repair"?START:CHASE_CHECKPOINT;
   p.current={...start,yaw:0,pitch:0,y:0,vy:0};
   position.current={...start}; clock.current.t=0; meter.current=0;charge.current=0;done.current=false;
   camera.position.set(start.x,1.65,start.z);camera.rotation.set(0,0,0);onNear(null);
 // Only reset on a new attempt.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[resetId]);
 useEffect(()=>{done.current=false;},[run.phase]);
 useFrame((_,rawDt)=>{
   const dt=Math.min(rawDt,0.05),s=p.current;
   if(!active){input.look.yaw=0;input.look.pitch=0;return;}
   s.yaw+=input.look.yaw+turnKeys()*dt*1.8;
   s.pitch=THREE.MathUtils.clamp(s.pitch+input.look.pitch,-1.1,1.1);
   input.look.yaw=0;input.look.pitch=0;
   const m=moveVector(),speed=(m.run?6.8:4.1)*dt;
   const dx=(m.x*Math.cos(s.yaw)-m.y*Math.sin(s.yaw))*speed;
   const dz=(-m.x*Math.sin(s.yaw)-m.y*Math.cos(s.yaw))*speed;
   const open=run.phase==="escape"||run.phase==="complete";
   const nx=collide(point(s.x+dx,s.z),open),nz=collide(point(nx.x,s.z+dz),open);
   s.x=nz.x;s.z=nz.z;
   if(input.jump&&s.y<=0)s.vy=5.5;
   input.jump=false;
   if(s.y>0||s.vy>0){s.vy-=19*dt;s.y=Math.max(0,s.y+s.vy*dt);if(!s.y)s.vy=0;}
   camera.position.set(s.x,1.65+s.y,s.z);camera.rotation.set(s.pitch,s.yaw,0,"YXZ");
   position.current.x=s.x;position.current.z=s.z;
   const watching=run.phase==="chase"||run.phase==="unlocking"||run.phase==="escape";
   if(watching)clock.current.t+=dt;
   const eye=scannerExposure(s,clock.current.t,watching);
   meter.current=THREE.MathUtils.clamp(meter.current+(eye.exposed?75:-27)*dt,0,100);
   if(meter.current>=100&&!done.current){done.current=true;onCaught();return;}
   if(run.phase==="unlocking"){
     charge.current=THREE.MathUtils.clamp(charge.current+(distance(s,GATE_PANEL)<3?dt/1.9:-dt/1.5),0,1);
     if(charge.current>=1&&!done.current){done.current=true;onGate();}
   }else charge.current=0;
   if(run.phase==="escape"&&finish(run,s).phase==="complete"&&!done.current){done.current=true;onFinish();}
   tick.current+=dt;
   if(tick.current>.1){tick.current=0;onNear(currentTarget(run,s));onTelemetry({meter:Math.round(meter.current),exposed:eye.exposed,covered:eye.covered,charge:charge.current});}
 });
 return null;
}
function San({run,resetId,position}:{run:ChaseRun;resetId:number;position:React.RefObject<Point>}) {
 const group=useRef<THREE.Group>(null),pos=useRef<Point>(point(0,-1)),step=useRef(0);
 useEffect(()=>{pos.current=point(0,run.phase==="repair"?-1:-3);step.current=0;},[resetId]);
 useFrame(({clock},dt)=>{
   if(!group.current)return;
   const route=run.phase==="repair"?[point(0,-1)]:
    run.phase==="escape"||run.phase==="complete"?[point(0,-7),point(-3.5,-16),point(-3.2,-24),point(0,-34)]:
    [point(0,-7),point(-3.5,-16),point(-3.2,-24)];
   step.current=Math.min(step.current,route.length-1);
   const goal=route[step.current],d=distance(pos.current,goal);
   if(d<.4&&step.current<route.length-1)step.current++;
   else if(d>.15&&distance(pos.current,position.current)<11){
     const k=Math.min(d,dt*4.9)/d;pos.current.x+=(goal.x-pos.current.x)*k;pos.current.z+=(goal.z-pos.current.z)*k;
   }
   group.current.position.set(pos.current.x,Math.sin(clock.elapsedTime*2.5)*.025,pos.current.z);
   group.current.rotation.y=Math.atan2(goal.x-pos.current.x,goal.z-pos.current.z);
 });
 return <group ref={group}>
   <mesh position={[0,1.1,0]}><capsuleGeometry args={[.34,1.08,4,8]}/><meshStandardMaterial color="#273749"/></mesh>
   <mesh position={[0,2.04,0]}><sphereGeometry args={[.28,12,8]}/><meshStandardMaterial color="#b5a99a"/></mesh>
   <mesh position={[0,1.53,-.33]}><boxGeometry args={[.31,.11,.04]}/><meshBasicMaterial color="#7be7e0"/></mesh>
   <pointLight position={[0,1.6,0]} intensity={.6} distance={4} color="#54bdb6"/>
 </group>;
}
function Scanner({active,clock}:{active:boolean;clock:React.RefObject<{t:number}>}){
 const group=useRef<THREE.Group>(null);
 useFrame(()=>{if(group.current)group.current.position.x=scannerX(clock.current.t);});
 return <group ref={group} visible={active} position={[0,0,-14.2]}>
   <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.8,31]}/><meshBasicMaterial color="#ff244e" transparent opacity={.23} depthWrite={false} side={THREE.DoubleSide}/></mesh>
   <mesh position={[0,6.3,-16.8]}><sphereGeometry args={[.4,12,8]}/><meshBasicMaterial color="#ff4662"/></mesh>
   <pointLight position={[0,4,-11]} intensity={2} distance={17} color="#e63657"/>
 </group>;
}
function Scene({run}:{run:ChaseRun}){
 const open=run.phase==="escape"||run.phase==="complete";
 return <>
   <color attach="background" args={["#080e16"]}/><fog attach="fog" args={["#080e16",20,90]}/>
   <ambientLight intensity={.55} color="#607b9d"/><hemisphereLight args={["#7f96bd","#10141e",.65]}/>
   <directionalLight position={[6,20,4]} intensity={.65}/>
   <mesh position={[0,-.08,-14]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[80,110]}/><meshStandardMaterial color="#141e2c"/></mesh>
   {Array.from({length:9},(_,i)=>[-1,1].map(side=><group key={i+":"+side}>
     <mesh position={[side*12.8,8.1,13-i*6.8]}><boxGeometry args={[9.9,16.2,6.1]}/><meshStandardMaterial color={i%2?"#1d2635":"#263246"}/></mesh>
     <mesh position={[side*7.88,4.4,13-i*6.8]}><boxGeometry args={[.05,1.6,3.2]}/><meshBasicMaterial color={i%3?"#2a7487":"#ad2c58"}/></mesh>
   </group>))}
   {COVERS.map((c,i)=><mesh key={i} position={[c.x,c.h/2,c.z]}><boxGeometry args={[c.w,c.h,c.d]}/><meshStandardMaterial color="#343d4c"/></mesh>)}
   {FUSES.map((p,i)=><group key={i} position={[p.x,1.3,p.z]}>
     <mesh><boxGeometry args={[.8,2.1,.52]}/><meshStandardMaterial color="#283340"/></mesh>
     <mesh position={[0,.48,.28]}><boxGeometry args={[.5,.38,.05]}/><meshBasicMaterial color={run.fuses[i]?"#64f5c3":"#f0b957"}/></mesh>
   </group>)}
   <group position={[GATE_PANEL.x,1.3,GATE_PANEL.z]}>
     <mesh><boxGeometry args={[.9,2.2,.65]}/><meshStandardMaterial color="#435167"/></mesh>
     <mesh position={[0,.35,.34]}><boxGeometry args={[.62,.5,.04]}/><meshBasicMaterial color={open?"#69e9d1":"#dc6570"}/></mesh>
   </group>
   <mesh position={[0,open?6.2:2.3,GATE_Z]}><boxGeometry args={[15.7,4.6,.6]}/><meshStandardMaterial color="#485466" metalness={.65}/></mesh>
   <mesh position={[0,.05,EXIT_Z-2]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[11,3.5]}/><meshBasicMaterial color="#79d8ce" transparent opacity={.25}/></mesh>
   <pointLight position={[0,4,EXIT_Z]} color="#61c9bc" intensity={2} distance={14}/>
 </>;
}
export default function ChaseLabClient(){
 const root=useRef<HTMLElement>(null),position=useRef<Point>({...START}),clock=useRef({t:0});
 const [run,setRun]=useState<ChaseRun>(initialRun),runRef=useRef(run);
 runRef.current=run;
 const [screen,setScreen]=useState<Screen>("intro"),screenRef=useRef(screen);
 screenRef.current=screen;
 const [resetId,setResetId]=useState(0),[touch,setTouch]=useState(false),[near,setNear]=useState<InteractId|null>(null);
 const nearRef=useRef<InteractId|null>(null),[telemetry,setTelemetry]=useState<Telemetry>({meter:0,exposed:false,covered:false,charge:0});
 const [line,setLine]=useState("고장 난 전력 장치 두 곳을 찾아 복구하세요.");
 useEffect(()=>{setTouch(navigator.maxTouchPoints>0||matchMedia("(pointer: coarse)").matches);},[]);
 const setPhase=useCallback((v:ChaseRun)=>{runRef.current=v;setRun(v);},[]);
 const show=useCallback((v:Screen)=>{screenRef.current=v;setScreen(v);},[]);
 const perform=useCallback(()=>{
   const id=nearRef.current;if(screenRef.current!=="play"||!id)return;
   const before=runRef.current,next=act(before,id);if(next===before)return;
   setPhase(next);
   setLine(next.phase==="chase"?"이산: 그걸 켜면 내 위치가 드러나! 뛰어!":next.phase==="unlocking"?"차단문 해제 중. 단말기 곁에서 버텨!":"전력 복구 "+next.fuses.filter(Boolean).length+"/2");
 },[setPhase]);
 useLookAndKeys(root,perform,screen==="play",locked=>{if(!locked&&screenRef.current==="play"&&!touch)show("pause");});
 const start=()=>{show("play");requestLock(root.current);};
 const restart=(fresh:boolean)=>{
   setPhase(fresh?initialRun():retry(runRef.current));setResetId(v=>v+1);nearRef.current=null;setNear(null);
   setTelemetry({meter:0,exposed:false,covered:false,charge:0});
   setLine(fresh?"고장 난 전력 장치 두 곳을 찾아 복구하세요.":"이산: 이번에는 다른 엄폐물을 이용해 봐.");
   show(fresh?"intro":"play");if(!fresh)requestLock(root.current);
 };
 const onNear=useCallback((v:InteractId|null)=>{if(nearRef.current!==v){nearRef.current=v;setNear(v);}},[]);
 const onTelemetry=useCallback((v:Telemetry)=>setTelemetry(old=>Math.abs(old.meter-v.meter)>=2||old.exposed!==v.exposed||old.covered!==v.covered||Math.abs(old.charge-v.charge)>.03?v:old),[]);
 const objective=run.phase==="repair"?"전력 장치 복구 "+run.fuses.filter(Boolean).length+"/2":run.phase==="chase"?"감시를 피해 차단문 제어판에 접근":run.phase==="unlocking"?"차단문 해제 중 · 제어판 곁에서 대기":run.phase==="escape"?"지하 출구까지 달리기":"탈출 성공";
 return <main ref={root} className={styles.root}>
   <div className={styles.canvas}><Canvas dpr={[1,1.35]} gl={{antialias:false,powerPreference:"low-power"}} camera={{fov:70,near:.1,far:110}}>
     <Rig active={screen==="play"} run={run} resetId={resetId} position={position} clock={clock} onNear={onNear} onTelemetry={onTelemetry} onCaught={()=>show("caught")} onGate={()=>{setPhase(openGate(runRef.current));setLine("문이 열렸어! 지하 출구까지 달려!");}} onFinish={()=>{setPhase(finish(runRef.current,{x:position.current.x,z:EXIT_Z-.1}));show("complete");}}/>
     <Scene run={run}/><San run={run} resetId={resetId} position={position}/><Scanner active={["chase","unlocking","escape"].includes(run.phase)} clock={clock}/>
   </Canvas></div>
   <header className={styles.header}><a href="/">SAN LEE</a><b>DELETE SEOUL / CHASE LAB</b><button disabled={screen!=="play"} onClick={()=>show("pause")}>Ⅱ</button></header>
   <section className={styles.objective}><small>OBJECTIVE / {run.phase.toUpperCase()}</small><div>{objective}</div>{run.phase==="unlocking"&&<div className={styles.bar}><i style={{width:Math.round(telemetry.charge*100)+"%"}}/></div>}</section>
   {screen==="play"&&["chase","unlocking","escape"].includes(run.phase)&&<div className={styles.alert}>大慈悲 / {telemetry.exposed?"탐지 중":telemetry.covered?"엄폐 중":"탐색 중"}<div className={styles.bar}><i style={{width:telemetry.meter+"%"}}/></div></div>}
   {screen==="play"&&<><div className={styles.cross}>＋</div><div className={styles.subtitle}>{line}</div>{near&&!touch&&<button className={styles.action} onClick={perform}>E · {NAMES[near]}</button>}{!touch&&!near&&<div className={styles.hint}>WASD 이동 · Shift 달리기 · E 상호작용</div>}{touch&&<><Joystick/><JumpButton action={near?{label:NAMES[near],run:perform}:null}/></>}</>}
   {screen!=="play"&&<div className={styles.overlay}><div className={styles.panel} role="dialog" aria-modal="true">
     <small>SAN LEE / 2026 · FIRST PLAYABLE</small>
     {screen==="intro"&&<><h1>DELETE SEOUL</h1><p>2087년 서울의 복구 테스트에 접속했습니다. 전력 장치 두 개를 복구하고 이산과 함께 지하로 탈출하세요.</p><p>전체 게임이 아닌 추격 구간의 첫 프로토타입입니다.</p><button onClick={start}>테스트 시작</button></>}
     {screen==="pause"&&<><h2>일시정지</h2><p>대자비의 감시도 정지했습니다.</p><button onClick={start}>계속하기</button><button onClick={()=>restart(true)}>처음부터</button></>}
     {screen==="caught"&&<><h2>위치 확인됨</h2><p>대자비가 당신을 발견했습니다. 복구한 전력 장치는 유지됩니다.</p><p>이산: "이번에는 다른 엄폐물을 이용해 봐."</p><button onClick={()=>restart(false)}>체크포인트 재시도</button><button onClick={()=>restart(true)}>처음부터</button></>}
     {screen==="complete"&&<><h2>지하 진입 성공</h2><p>이산과 함께 탈출했습니다. 제작자의 기록과 두 갈래 엔딩은 다음 개발 단계에서 이어집니다.</p><button onClick={()=>restart(true)}>다시 플레이</button></>}
   </div></div>}
 </main>;
}
