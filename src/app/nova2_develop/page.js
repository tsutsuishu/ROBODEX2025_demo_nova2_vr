"use client";
import dynamic from 'next/dynamic';
import { AppMode } from '../appmode.js';

const DynamicHome = dynamic(() => import('../home.js'), { ssr: false });

// 実ロボットが無くても動作する
export default function Home() {
  return (
      <DynamicHome appmode={AppMode.develop}/>
  );
}
