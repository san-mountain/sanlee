"use client";
import { useEffect, useRef, useState } from "react";
import { input } from "../input";

/** Independent touch control for the experimental chase route.
 * It deliberately does not depend on the legacy joystick's CSS or capture area.
 */
export default function ChaseTouchOverlay() {
 const pointer = useRef<number | null>(null);
 const origin = useRef({ x: 0, y: 0 });
 const [offset, setOffset] = useState({ x: 0, y: 0 });
 const [mobile, setMobile] = useState(false);
 useEffect(() => {
   setMobile(window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
   return () => { input.joy.x = 0; input.joy.y = 0; };
 }, []);
 const release = (id: number) => {
   if (pointer.current !== id) return;
   pointer.current = null;
   input.joy.x = 0; input.joy.y = 0;
   setOffset({ x: 0, y: 0 });
 };
 if (!mobile) return null;
 return <div style={{ position: "fixed", zIndex: 90, left: 0, bottom: 0, width: "42vw", maxWidth: 230, height: "38vh", minHeight: 180, touchAction: "none", userSelect: "none" }}
   aria-label="이동 조이스틱"
   onPointerDown={e => {
     if (pointer.current !== null) return;
     e.preventDefault(); e.stopPropagation();
     pointer.current = e.pointerId;
     origin.current = { x: e.clientX, y: e.clientY };
     e.currentTarget.setPointerCapture(e.pointerId);
   }}
   onPointerMove={e => {
     if (pointer.current !== e.pointerId) return;
     e.preventDefault(); e.stopPropagation();
     const dx = e.clientX - origin.current.x, dy = e.clientY - origin.current.y;
     const scale = Math.max(1, Math.hypot(dx, dy) / 46);
     const x = dx / scale, y = dy / scale;
     input.joy.x = x / 46;
     input.joy.y = -y / 46;
     setOffset({ x, y });
   }}
   onPointerUp={e => release(e.pointerId)}
   onPointerCancel={e => release(e.pointerId)}
   onLostPointerCapture={e => release(e.pointerId)}
 >
   <div style={{ position: "absolute", left: 35, bottom: 48, width: 106, height: 106, border: "2px solid #8de4df", background: "#0a2436b8", borderRadius: "50%", display: "grid", placeItems: "center", pointerEvents: "none" }}>
     <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#5bcac4", boxShadow: "0 0 18px #5bcac488", transform: `translate(${offset.x}px, ${offset.y}px)` }}/>
   </div>
 </div>;
}
