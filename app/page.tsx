'use client';
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import WeeklyActions from "./WeeklyActions";
import SyncCode from "./SyncCode";
import FocusTimer from "./FocusTimer";
import SupabaseStatus from "./SupabaseStatus";
import Hooponopono from "./Hooponopono";
import { cloudConfigured, syncLabel } from "../lib/syncLabel";
import { loadActions, loadLocalActions, newActionId, removeAction, saveLocalActions, syncAction, weekKey, type Action } from "../lib/actions";
import { DAILY_TARGET, SLOTS, completeStreak, dateKey, groupByDate, loadLocalViews, loadViews, logicalNow, recordView, slotFor, timeLabel, type View } from "../lib/views";

const visions = [
 {id:"promotion",title:"Promotion & Career",icon:"🚀",tone:"peach",visual:"🚀",visualText:"Leadership • Impact • Recognition",statement:"I am recognised for my experience, leadership, expertise and the value I create.",cards:[["Recognition","🏆","Be known for meaningful results and leadership."],["Leadership","👔","Lead important work with confidence and clarity."],["Innovation","💡","Turn experience into ideas, improvements and impact."],["Growth","📈","Keep growing professionally and financially."]]},
 {id:"travel",title:"Travel with Wife",icon:"❤️",tone:"blue",visual:"🌴",visualText:"Phu Quoc • Singapore • New places",statement:"We travel together, explore beautiful places and create unforgettable memories.",cards:[["Phu Quoc","🏝️","Relax, explore and enjoy time together."],["Singapore","🌆","Discover, eat, walk and make new memories."],["New Places","✈️","Keep adding beautiful destinations to our story."],["Experiences","🥂","Choose experiences, not just destinations."]]},
 {id:"finance",title:"Financial Freedom",icon:"💜",tone:"lavender",visual:"💰",visualText:"Security • Freedom • Choices",statement:"Build lasting financial security and freedom.",cards:[["Wealth","💰","Grow assets steadily and thoughtfully."],["Freedom","🔓","Create choices through financial strength."]]},
 {id:"health",title:"Health & Lifestyle",icon:"🌿",tone:"green",visual:"🌿",visualText:"Energy • Calm • Enjoyment",statement:"Stay energetic, active and ready to enjoy life.",cards:[["Energy","⚡","Protect energy for the things that matter."],["Lifestyle","🌱","Build a calm, enjoyable everyday life."]]},
 {id:"family",title:"Family & Happiness",icon:"🌼",tone:"yellow",visual:"☀️",visualText:"Together • Memories • Joy",statement:"Make time for people, experiences and moments that matter.",cards:[["Together","👨‍👩‍👧","Create more shared memories."],["Joy","☀️","Notice and enjoy the good things."]]}
];

export default function Home(){
 const [views,setViews]=useState<View[]>([]),[message,setMessage]=useState("");
 const [muted,setMuted]=useState(false),[soundStarted,setSoundStarted]=useState(false),[soundBlocked,setSoundBlocked]=useState(false),[syncing,setSyncing]=useState(false);
 const [actions,setActions]=useState<Action[]>([]);
 const [mode,setMode]=useState<"board"|"hoo">("board");
 const [focusIndex,setFocusIndex]=useState<number|null>(null),[sessionDone,setSessionDone]=useState(false);
 const audioContextRef=useRef<AudioContext|null>(null),gainRef=useRef<GainNode|null>(null),timerRef=useRef<number|null>(null);

 const startOm=async()=>{
   if(typeof window==="undefined")return;
   try{
     if(!audioContextRef.current){
       const Ctx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
       if(!Ctx)return;
       const ctx=new Ctx(); audioContextRef.current=ctx;
       const master=ctx.createGain(); master.gain.value=muted?0:0.11; master.connect(ctx.destination); gainRef.current=master;
       [68.05,136.1,272.2,408.3].forEach((freq,index)=>{
         const osc=ctx.createOscillator(),g=ctx.createGain();
         osc.type=index===0?"sine":"triangle"; osc.frequency.value=freq; g.gain.value=index===0?.08:.025/index;
         osc.connect(g);g.connect(master);osc.start();
       });
       const pulse=()=>{
         if(!gainRef.current||muted)return;
         const now=ctx.currentTime;
         master.gain.cancelScheduledValues(now);
         master.gain.setValueAtTime(.025,now);
         master.gain.linearRampToValueAtTime(.11,now+.75);
         master.gain.linearRampToValueAtTime(.065,now+2.45);
         master.gain.linearRampToValueAtTime(.025,now+3.75);
         master.gain.linearRampToValueAtTime(.025,now+4.2);
       };
       pulse();timerRef.current=window.setInterval(pulse,4200);
     }
     if(audioContextRef.current.state==="suspended")await audioContextRef.current.resume();
     if(audioContextRef.current.state==="running"){setSoundStarted(true);setSoundBlocked(false)}
     else setSoundBlocked(true);
   }catch{setSoundBlocked(true)}
 };

 useEffect(()=>{
   let active=true;
   setViews(loadLocalViews());
   setActions(loadLocalActions());
   loadActions().then(a=>{if(active)setActions(a)}).catch(()=>{});
   loadViews().then(v=>{if(active)setViews(v)}).catch(()=>{});
   const attempt=window.setTimeout(()=>{void startOm()},150);
   const onGesture=()=>{void startOm()};
   window.addEventListener("pointerdown",onGesture,{once:true});
   return()=>{active=false;window.clearTimeout(attempt);window.removeEventListener("pointerdown",onGesture);if(timerRef.current)window.clearInterval(timerRef.current);void audioContextRef.current?.close()};
 },[]);

 useEffect(()=>{
   if(gainRef.current){
     gainRef.current.gain.setTargetAtTime(muted?0:.11,gainRef.current.context.currentTime,.04);
     if(!muted&&audioContextRef.current?.state==="suspended")void audioContextRef.current.resume();
   }
 },[muted]);

 useEffect(()=>{
   if(focusIndex===null)return;
   document.getElementById("card-"+visions[focusIndex].id)?.scrollIntoView({behavior:"smooth",block:"center"});
 },[focusIndex]);
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 // Time-dependent values are blank until mounted so server HTML and first client render match.
 const real=new Date(),now=logicalNow(),today=mounted?dateKey(now):"",currentSlot=mounted?slotFor(real):"morning",monthPrefix=mounted?today.slice(0,7):"none";
 const byDate=useMemo(()=>groupByDate(views),[views]);
 const todayViews=byDate.get(today)||[],viewedSlot=todayViews.some(v=>v.slot===currentSlot);
 const monthViews=useMemo(()=>views.filter(v=>v.date.startsWith(monthPrefix)).length,[views,monthPrefix]);
 const streak=useMemo(()=>completeStreak(byDate),[byDate]);
 const currentSlotLabel=SLOTS.find(s=>s.id===currentSlot)!.label.toLowerCase();

 const thisWeek=mounted?weekKey(now):"";
 const weekActions=actions.filter(a=>a.week===thisWeek);
 const weekDone=weekActions.filter(a=>a.done).length;
 function updateActions(next:Action[],changed?:Action,removedId?:string){
   const pending=changed?{...changed,synced:false}:undefined;
   const list=pending?next.map(a=>a.id===pending.id?pending:a):next;
   setActions(list);saveLocalActions(list);
   const ok=changed?syncAction(changed):removedId?removeAction(removedId):Promise.resolve(true);
   void ok.then(good=>{
     if(changed&&good)setActions(cur=>cur.map(a=>a.id===changed.id&&a.text===changed.text&&a.done===changed.done?{...a,synced:true}:a));
     if(!good&&cloudConfigured){setMessage("Saved on this device only — Supabase did not accept it");window.setTimeout(()=>setMessage(""),3200)}
   });
 }
 const addAction=(area:string,text:string)=>{const a:Action={id:newActionId(),area,week:thisWeek,text,done:false};updateActions([...actions,a],a)};
 const patchAction=(id:string,patch:Partial<Action>)=>{const next=actions.map(a=>a.id===id?{...a,...patch}:a);updateActions(next,next.find(a=>a.id===id))};
 const deleteAction=(id:string)=>updateActions(actions.filter(a=>a.id!==id),undefined,id);

 async function markViewed(){
   if(viewedSlot){setMessage(`Already recorded for this ${currentSlotLabel} ✓`);window.setTimeout(()=>setMessage(""),2200);return}
   setSyncing(true);setSessionDone(false);setMessage("Vision viewed ✓ • saving…");
   const {views:next,cloudOk}=await recordView(views,{date:today,slot:currentSlot,at:new Date().toISOString()});
   setViews(next);
   setMessage(`Vision viewed ✓ • ${syncLabel(cloudOk).text}`);
   setSyncing(false);
   window.setTimeout(()=>setMessage(""),3600);
 }

 return <main className="page" onClick={()=>{if(!soundStarted)void startOm()}}>
  <header className="topbar">
   <div className="brand"><Image src="/om.svg" alt="Om" width={62} height={62} priority/><div><div className="eyebrow">PERSONAL VISION BOARD</div><h1>See it. Feel it. <span>Work towards it.</span></h1></div></div>
   <div className="header-actions"><SupabaseStatus/><button className={"sound-button "+(muted?"muted":"")} onClick={(e)=>{e.stopPropagation();setMuted(x=>!x);if(muted)void startOm()}} aria-label={muted?"Unmute OM chanting":"Mute OM chanting"}>{muted?"🔇":"🔊"} {muted?"Unmute OM":"Mute OM"}</button><div className="datebox"><strong>{mounted?now.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):""}</strong><small>{todayViews.length>=DAILY_TARGET?"✓ All 3 views done":`${todayViews.length}/${DAILY_TARGET} views today`}</small></div></div>
  </header>

  <section className="hero"><div><p className="hero-kicker">ॐ • MY LIFE • MY DIRECTION</p><h2>Keep the important things<br/><em>in front of you.</em></h2><p className="hero-copy">A quiet place to see where you are going — especially the career growth and experiences you want to share with your wife.</p></div><div className="stats"><div><b>{todayViews.length}/{DAILY_TARGET}</b><span>views today</span></div><div><b>{streak}</b><span>days with 3/3 streak</span></div><div><b>{monthViews}</b><span>views this month</span></div><div><b>{weekDone}/{weekActions.length}</b><span>actions this week</span></div><div><b>{views.length}</b><span>total views</span></div></div></section>

  <div className="mode-switch" role="group" aria-label="Choose view"><button type="button" aria-pressed={mode==="board"} className={mode==="board"?"active":""} onClick={()=>setMode("board")}>🖼 Vision Board</button><button type="button" aria-pressed={mode==="hoo"} className={mode==="hoo"?"active":""} onClick={()=>{setMode("hoo");setFocusIndex(null)}}>🌺 Hoʻoponopono</button></div>

  {mode==="hoo"?<Hooponopono/>:<>
  <FocusTimer cards={visions.map(v=>({id:v.id,title:v.title,icon:v.icon}))} onFocus={i=>{setFocusIndex(i);if(i!==null)setSessionDone(false)}} onComplete={()=>{setSessionDone(true);setMessage("Session complete 🔔 — tap “I Saw My Vision Board”");window.setTimeout(()=>setMessage(""),6000)}}/>

  <section className="board">{visions.map((v,i)=><article key={v.id} id={"card-"+v.id} className={"vision "+v.tone+" "+(i<2?"priority":"")+(focusIndex!==null?(focusIndex===i?" focused":" dimmed"):"")}><div className="vision-label">{v.icon} {i<2?"PRIORITY":"LIFE AREA"} {i+1}</div><div className="vision-visual"><span>{v.visual}</span><small>{v.visualText}</small></div><h3>{v.title}</h3><p>{v.statement}</p><div className="cards">{v.cards.map(([title,icon,text])=><div className="mini-card" key={title}><div className="mini-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div></div>)}</div><WeeklyActions actions={weekActions.filter(a=>a.area===v.id)} onAdd={t=>addAction(v.id,t)} onToggle={id=>patchAction(id,{done:!actions.find(a=>a.id===id)!.done})} onEdit={(id,t)=>patchAction(id,{text:t})} onDelete={deleteAction}/></article>)}</section>

  <section className="view-panel"><div className="view-copy"><div className="view-icon">👁</div><div><h3>Take a moment</h3><p>Look through your board, then mark your {currentSlotLabel} viewing.</p><div className="slot-row">{SLOTS.map(sl=>{const v=todayViews.find(x=>x.slot===sl.id);return <span key={sl.id} title={`${sl.label}: ${sl.hours}`} className={"slot-pill "+(v?"done":"")+(sl.id===currentSlot?" now":"")}>{sl.icon} {sl.label}{v?` ✓ ${timeLabel(v.at)} • ${v.synced?"☁ saved in Supabase":"device only"}`:""}</span>})}</div><small className="slot-hours">{SLOTS.map(sl=>`${sl.label} ${sl.hours}`).join("  •  ")}</small></div></div><div className="view-actions"><span className={"sound-status "+(soundStarted&&!muted?"on":"off")}>{soundStarted&&!muted?"● OM chanting ON":muted?"○ OM muted":"○ OM ready"}</span><Link className="calendar-link" href="/calendar">📅 Calendar</Link><button className={sessionDone&&!viewedSlot?"pulse":""} onClick={markViewed} disabled={syncing}>{syncing?"Saving…":viewedSlot?`✓ ${SLOTS.find(s=>s.id===currentSlot)!.label} done`:"I Saw My Vision Board"}</button></div>{message&&<div className="toast">{message}</div>}</section>
  </>}
  {soundBlocked&&!soundStarted&&<div className="sound-hint">🔊 Tap anywhere on the board once to start the continuous OM chanting. Your default is sound ON.</div>}
  <SyncCode/>
  <footer><span>ॐ MY VISION BOARD</span><span>Small daily attention • Long-term direction</span></footer>
 </main>
}
