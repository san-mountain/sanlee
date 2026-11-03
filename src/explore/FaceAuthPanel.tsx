'use client';
import { useEffect, useRef, useState } from 'react';
import { executeFace, missingFace, type FaceState, type FaceMethod } from './faceAuth';
import { protection } from './recordProtection';
import type { ActivityResult } from './citizenRecords';

function FaceIcon({ hands = false }: { hands?: boolean }) {
  return <svg viewBox="0 0 160 130" width="150" height="122" aria-label={hands ? '손에 가린 현장 스캔' : '도시가 생성한 표준 얼굴'} role="img"><rect x="1" y="1" width="158" height="128" fill="#111e27" stroke="#43dce1"/><ellipse cx="80" cy="61" rx="35" ry="44" fill="none" stroke="#c4d8db" strokeWidth="3"/><path d="M61 48h9m20 0h9M62 73q18 22 36 0" fill="none" stroke="#43dce1" strokeWidth="3"/>{hands && <path d="M48 100L62 40 78 92 94 40 112 100" stroke="#c0a58b" strokeWidth="14" fill="none"/>}</svg>;
}
export default function FaceAuthPanel({ state, update, close, commit, protectionIntended }: { protectionIntended: boolean; state: FaceState; update: (s: FaceState) => void; close: () => void; commit: (method: FaceMethod, requireProtection: boolean) => ActivityResult }) {
  const [method, setMethod] = useState<FaceMethod | null>(state.prepared);
  const [selected, select] = useState<'scan' | 'specs' | null>(null);
  const [intended, intend] = useState(protectionIntended || protection.isProtected());
  const [expired, setExpired] = useState(false);
  const [message, setMessage] = useState('표정 불일치. 협조적인 얼굴로 다시 시도하십시오.');
  const committed = useRef(false);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => { const tick = () => { const s = protection.snapshot(); setRemaining(s.remainingMs); if (s.active) intend(true); }; tick(); const id = setInterval(tick, 100); return () => clearInterval(id); }, []);
  const prepare = (m: FaceMethod) => { const missing = missingFace(state, m); if (missing.length) { setMessage(`이의 신청 사유가 이의뿐입니다. 필요한 자료: ${missing.join(' · ')}`); return; } setMethod(m); update({ ...state, prepared: m }); setExpired(false); setMessage('준비 완료. 창을 닫고 범종을 친 뒤 돌아와도 조사 자료는 유지됩니다.'); };
  const finish = (confirmed = false) => {
    if (!method || committed.current) return;
    const result = executeFace(state, method, intended, protection.isProtected(), confirmed);
    if (result.status === 'expired') { setExpired(true); setMessage('보호 꺼짐 — 활동 기록이 남습니다'); return; }
    if (result.status !== 'success') return;
    const activity = commit(method, intended && !confirmed);
    if (activity.status === "protection-expired") { setExpired(true); setMessage("보호 꺼짐 — 활동 기록이 남습니다"); return; }
    committed.current = true; update(result.state);
    setMessage(`${method === 'standard' ? '확인되지 않은 표정을 표준값으로 대체합니다. 표정 정보가 개선되었습니다. 본인 확인 완료.' : '대조 기준의 자동 생성 항목을 확인했습니다. 현장 예외 인증 완료. 정상 여부는 확인되지 않았습니다.'} ${activity.status === 'protected' || activity.status === 'unregistered' ? '시민 활동 기록 없음.' : activity.status === 'full' ? '시민 활동 기록 저장 용량 초과.' : '시민 활동 기록 생성.'}`);
  };
  return <div className="panel-wrap"><div className="panel face-panel" role="dialog" aria-modal="true" aria-labelledby="face-title"><div className="panel-head"><h2 id="face-title">얼굴을 맞추십시오</h2><button className="btn" onClick={close}>닫기</button></div>
    <div className="face-comparison"><figure><FaceIcon/><figcaption>등록 얼굴 · {state.specs ? "표준 미소 자동 생성" : "협조적인 표정"}</figcaption></figure><figure><FaceIcon hands={!state.scan}/><figcaption>현장 스캔 · {state.scan ? '머리 유효 / 표정 미확인' : '손에 가림'}</figcaption></figure></div>
    <p role="status">{message}</p><p>기록 보호 {remaining > 0 ? `${(remaining / 1000).toFixed(1)}초` : '꺼짐'} · 인증 진행은 보호 여부와 관계없이 저장됩니다.</p>
    {state.method ? <><p>얼굴 처리: {state.method === 'standard' ? '표준 보정 · 규격화된 미소' : '현장 예외 · 표정 유지, 향후 추가 확인 가능'}</p><p>이산: “{state.lampDim ? '빛 돌려준 거…… 너였어?' : '……아까부터 거기 있었어?'}”</p>{state.portrait && <p>“저 그림, 네가 그린 거야?” “응. 얼굴 사진은 아니고.”</p>}<p>머리 부분만 복원되었습니다. 다른 인증이 끝날 때까지 이산은 여기 머뭅니다.</p></> : <>
    <p>검사 장치: {state.scanner === 'low' ? '손 높이' : '머리 높이'} · 받침대 정면과 측면에서 직접 관찰하고 옆의 스캐너와 명세판을 조사하십시오.</p>
    <div className="panel-actions"><button className="btn" onClick={() => { if (state.scanner === 'low') setMessage('손은 얼굴로 인정되지 않습니다. 얼굴을 가리는 행위는 얼굴의 책임입니다.'); else { update({ ...state, scan: true }); setMessage('머리 영역 검사 완료. 등록 얼굴과 표정 불일치. 표준 미소 보정을 제안합니다.'); } }}>현장 스캔</button><button className="btn" onClick={() => { if (!state.scan) { setMessage('적용할 시민을 먼저 지정하십시오.'); return; } update({ ...state, preview: true }); setMessage('표준 보정 미리보기: 일반 인증에 유리하며 감정 표현에 제약이 생깁니다.'); }}>표준 보정 미리보기</button></div>
    <p>확인 자료: {state.front ? '손 가림 관찰 · ' : ''}{state.side ? '측면 윤곽 · ' : ''}{state.scan ? '현장 스캔 · ' : ''}{state.specs ? '보정 명세' : ''}</p>
    <div className="panel-actions"><button className="btn" disabled={!state.scan} aria-pressed={selected === 'scan'} onClick={() => select('scan')}>자료: 현장 스캔</button><button className="btn" disabled={!state.specs} aria-pressed={selected === 'specs'} onClick={() => select('specs')}>자료: 보정 명세</button></div><div className="panel-actions">{[0,1].map(i => <button className="btn" key={i} onClick={() => { if (selected !== (i === 0 ? 'scan' : 'specs')) { setMessage('선택한 자료와 제출 칸을 확인하십시오.'); return; } const slots: [boolean,boolean] = [...state.slots]; slots[i] = true; update({ ...state, slots }); }}>{i === 0 ? '현장 결과 칸' : '등록 기준 칸'} {state.slots[i] ? '✓' : '—'}</button>)}</div>
    <div className="panel-actions"><button className="btn" onClick={() => prepare('standard')}>표준 보정 준비</button><button className="btn" onClick={() => prepare('exception')}>대조 오류 증명 준비</button></div>
    {method && <><p>{method === 'standard' ? '표준 미소를 적용합니다.' : '표정 항목 제외 후 현장 인증. 중앙 데이터베이스는 변경하지 않습니다.'}</p><button className="btn primary" onClick={() => finish()}>최종 인증 실행</button></>}
    {expired && <div className="panel-actions"><button className="btn" onClick={() => finish(true)}>활동 기록을 남기고 실행</button><button className="btn" onClick={close}>취소하고 범종으로</button></div>}</>}
  </div></div>;
}
