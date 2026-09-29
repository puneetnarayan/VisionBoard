'use client';
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const visions = [
 {id:"promotion",title:"Promotion & Career",icon:"🚀",tone:"peach",statement:"I am recognised for my experience, leadership, expertise and the value I create.",cards:[["Recognition","🏆","Be known for meaningful results and leadership."],["Leadership","👔","Lead important work with confidence and clarity."],["Innovation","💡","Turn experience into ideas, improvements and impact."],["Growth","📈","Keep growing professionally and financially."]]},
 {id:"travel",title:"Travel with Wife",icon:"❤️",tone:"blue",statement:"We travel together, explore beautiful places and create unforgettable memories.",cards:[["Phu Quoc","🏝️","Relax, explore and enjoy time together."],["Singapore","🌆","Discover, eat, walk and make new memories."],["New Places","✈️","Keep adding beautiful destinations to our story."],["Experiences","🥂","Choose experiences, not just destinations."]]},
 {id:"finance",title:"Financial Freedom",icon:"💜",tone:"lavender",statement:"Build lasting financial security and freedom.",cards:[["Wealth","💰","Grow assets steadily and thoughtfully."],["Freedom","🔓","Create choices through financial strength."]]},
 {id:"health",title:"Health & Lifestyle",icon:"🌿",tone:"green",statement:"Stay energetic, active and ready to enjoy life.",cards:[["Energy","⚡","Protect energy for the things that matter."],["Lifestyle","🌱","Build a calm, enjoyable everyday life."]]},
 {id:"family",title:"Family & Happiness",icon:"🌼",tone:"yellow",statement:"Make time for people, experiences and moments that matter.",cards:[["Together","👨‍👩‍👧","Create more shared memories."],["Joy","☀️","Notice and enjoy the good things."]]}
];

function todayKey(){
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function loadViews(){
 try{return JSON.parse(localStorage.getItem("visionboard_views")||"[]")}catch{return []}
}
function visitorId(){
 const key="visionboard_visitor_id";
 try{
   let id=localStorage.getItem(key);
   if(!id){id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():`vb-${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(key,id)}
   return id;
 }catch{return "anonymous-browser"}
}
function mergeDates(a:string[],b:string[]){return Array.from(new Set([...a,...b])).sort()}

export default function Home(){
 const [views,setViews]=useState<string[]>([]),[message,setMessage]=useState("");
 const [muted,setMuted]=useState(false),[soundStarted,setSoundStarted]=useState(false),[soundBlocked,setSoundBlocked]=useState(false),[syncing,setSyncing]=useState(false);
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
   const local=loadViews();setViews(local);
   const loadCloud=async()=>{
     if(!supabase)return;
     const id=visitorId();
     const {data,error}=await supabase.from("vision_board_views").select("view_date").eq("visitor_id",id).order("view_date",{ascending:true});
     if(active&&!error&&data){
       const cloud=data.map(row=>row.view_date);
       const merged=mergeDates(local,cloud);
       setViews(merged);
       localStorage.setItem("visionboard_views",JSON.stringify(merged));
     }
   };
   loadCloud();
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

 const today=todayKey(),viewedToday=views.includes(today),monthPrefix=today.slice(0,7);
 const monthViews=useMemo(()=>views.filter(v=>v.startsWith(monthPrefix)).length,[views,monthPrefix]);
 const streak=useMemo(()=>{let d=new Date(),s=0,set=new Set(views);while(set.has(todayKeyFromDate(d))){s++;d.setDate(d.getDate()-1)}return s},[views]);
 function todayKeyFromDate(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}

 async function markViewed(){
   if(viewedToday){setMessage("Already recorded for today ✓");window.setTimeout(()=>setMessage(""),2200);return}
   const id=visitorId(),date=today;
   const next=mergeDates(views,[date]);
   setViews(next);localStorage.setItem("visionboard_views",JSON.stringify(next));setSyncing(true);setMessage("Vision viewed ✓");
   if(supabase){
     const {error}=await supabase.from("vision_board_views").upsert({visitor_id:id,view_date:date,viewed_at:new Date().toISOString()},{onConflict:"visitor_id,view_date",ignoreDuplicates:true});
     if(error)setMessage("Vision viewed ✓ • saved locally; cloud sync unavailable");
   }
   setSyncing(false);
   window.setTimeout(()=>setMessage(""),2600);
 }

 return <main className="page" onClick={()=>{if(!soundStarted)void startOm()}}>
  <header className="topbar">
   <div className="brand"><Image src="/om.svg" alt="Om" width={62} height={62} priority/><div><div className="eyebrow">PERSONAL VISION BOARD</div><h1>See it. Feel it. <span>Work towards it.</span></h1></div></div>
   <div className="header-actions"><button className={"sound-button "+(muted?"muted":"")} onClick={(e)=>{e.stopPropagation();setMuted(x=>!x);if(muted)void startOm()}} aria-label={muted?"Unmute OM chanting":"Mute OM chanting"}>{muted?"🔇":"🔊"} {muted?"Unmute OM":"Mute OM"}</button><div className="datebox"><strong>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong><small>{viewedToday?"✓ Viewed today":"Ready for today's vision"}</small></div></div>
  </header>

  <section className="hero"><div><p className="hero-kicker">ॐ • MY LIFE • MY DIRECTION</p><h2>Keep the important things<br/><em>in front of you.</em></h2><p className="hero-copy">A quiet place to see where you are going — especially the career growth and experiences you want to share with your wife.</p></div><div className="stats"><div><b>{streak}</b><span>day streak</span></div><div><b>{monthViews}</b><span>views this month</span></div><div><b>{views.length}</b><span>total views</span></div></div></section>

  <section className="board">{visions.map((v,i)=><article key={v.id} className={"vision "+v.tone+" "+(i<2?"priority":"")}><div className="vision-label">{v.icon} PRIORITY {i+1}</div><h3>{v.title}</h3><p>{v.statement}</p><div className="cards">{v.cards.map(([title,icon,text])=><div className="mini-card" key={title}><div className="mini-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div></div>)}</div></article>)}</section>

  <section className="view-panel"><div className="view-copy"><div className="view-icon">👁</div><div><h3>Take a moment</h3><p>Look through your board, then mark today's viewing.</p></div></div><button onClick={markViewed} disabled={syncing}>{syncing?"Saving…":viewedToday?"✓ Viewed Today":"I Saw My Vision Board"}</button>{message&&<div className="toast">{message}</div>}</section>
  {soundBlocked&&!soundStarted&&<div className="sound-hint">🔊 Tap anywhere on the board once to start the continuous OM chanting. Your default is sound ON.</div>}
  <footer><span>ॐ MY VISION BOARD</span><span>{supabase?"Cloud tracking enabled • Supabase":"Local tracking only • add Supabase environment variables"}</span><span>Small daily attention • Long-term direction</span></footer>
 </main>
}
