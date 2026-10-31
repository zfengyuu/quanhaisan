'use client';
import { useEffect, useState } from 'react';

const resources = [
  '/assets/concept-preview.webp',
  '/assets/harbor-map.webp',
  '/icons/icon-192.png',
];
const messages = ['Đang chuẩn bị thuyền…', 'Đang kiểm tra lưới đánh cá…', 'Đang nhập hải sản tươi…', 'Đang mở cửa quán…'];

export default function GameLoading({onReady}:{onReady:()=>void}) {
  const [done,setDone] = useState(0);
  const [started,setStarted] = useState(false);
  useEffect(()=>{
    let cancelled = false;
    let completed = 0;
    setStarted(true);
    const preload = (src:string) => new Promise<void>((resolve)=>{
      const img = new Image();
      img.onload = img.onerror = ()=>resolve();
      img.src = src;
      if(img.complete)resolve();
    }).then(()=>{
      if(!cancelled){completed++;setDone(completed)}
    });
    void Promise.all(resources.map(preload)).then(()=>{
      if(!cancelled) onReady();
    });
    return ()=>{cancelled=true};
  },[onReady]);
  const progress = Math.round(done/resources.length*100);
  return <div className="startup-screen" role="status" aria-live="polite" aria-label="Đang tải Quán Hải Sản">
    <div className="startup-center">
      <div className="startup-banner">
        <img src="/assets/concept-preview.webp" alt="Quán Hải Sản – Câu Cá & Kinh Doanh"/>
        <div className="startup-brand"><span>🐟 QUÁN HẢI SẢN</span><small>Câu cá · Nhập hàng · Kinh doanh</small></div>
      </div>
      <div className="startup-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="startup-fill" style={{width:`${progress}%`}}/>
      </div>
      <p className="startup-message">{started?messages[Math.min(messages.length-1, Math.floor(progress/26))]:'Đang khởi động…'} <strong>{progress}%</strong></p>
      <small className="startup-caption">Lần đầu mở game có thể cần tải thêm hình ảnh. Cài PWA để truy cập nhanh hơn.</small>
    </div>
  </div>;
}
