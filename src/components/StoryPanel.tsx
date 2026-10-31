'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Check, LockKeyhole, Target } from 'lucide-react';
import { STORY_CHAPTERS, chapterComplete, currentChapter } from '@/lib/story';
import type { GameState } from '@/lib/economy';

type Tab='story'|'goals';
export default function StoryPanel({game}:{game:GameState}) {
  const unlocked=currentChapter(game);
  const [chapter,setChapter]=useState(unlocked);
  const [tab,setTab]=useState<Tab>('story');
  useEffect(()=>setChapter(unlocked),[unlocked]);
  const c=STORY_CHAPTERS[chapter-1];
  const completed=chapterComplete(game,c);
  return <div className="story-panel">
    <div className="story-chapters" aria-label="Danh sách chương">{STORY_CHAPTERS.map(s=><button key={s.id} title={s.title} onClick={()=>{setChapter(s.id);setTab('story')}} disabled={s.id>unlocked} className={`chapter-chip ${s.id===chapter?'active':''}`}>{s.id>unlocked?<LockKeyhole size={12}/>:s.id}</button>)}</div>
    <div className="story-tabs"><button onClick={()=>setTab('story')} className={tab==='story'?'active':''}><BookOpen size={16}/> Chuyện</button><button onClick={()=>setTab('goals')} className={tab==='goals'?'active':''}><Target size={16}/> Mục tiêu</button></div>
    <div className="story-paper">
      <div className="story-meta">CHƯƠNG {c.id} · {c.subtitle.toUpperCase()}</div>
      <h3>{c.title}</h3>
      {tab==='story'?<>
        <div className="story-illustration" role="img" aria-label="Làng chài Bến Nhỏ với chiếc thuyền và quán hải sản"><img src={`/assets/pixel/story/chapter-${chapter}.png`} alt="Khung cảnh Bến Nhỏ"/></div>
        <p className="story-speaker">✦ {c.speaker} kể chuyện ✦</p>
        {c.dialogue.map((line,i)=><p key={i} className="story-paragraph">{line}</p>)}
      </>:<>
        <p className="story-paragraph">Hoàn thành mục tiêu bằng cách chơi game. Khi đạt đủ, chương kế tiếp sẽ tự mở!</p>
        <div className="story-goals">{c.goals.map(g=>{const value=Math.min(game[g.key],g.target);return <div className="story-goal" key={g.label}><div className="story-goal-head"><span>{value===g.target?<Check size={16}/>:<Target size={16}/>} {g.label}</span><b>{value}/{g.target}</b></div><div className="story-goal-track"><div style={{width:`${value/g.target*100}%`}}/></div></div>})}</div>
      </>}
      <div className="story-reward">{completed?`✅ ${c.reward}`:`🔒 ${c.reward}`}<br/><small>{completed?'Đã hoàn thành các mục tiêu chương này':'Chương tiếp theo mở khi hoàn thành nhiệm vụ'}</small></div>
    </div>
  </div>;
}
