'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, type Easing } from 'framer-motion';
import ParticleCanvas from './components/ParticleCanvas';
import type { LogItem } from './types/api';

// ISO日付文字列を yyyy/MM/dd 形式に変換
function formatSessionDate(iso: string): string {
  // new Date() でパースし、月・日を2桁ゼロ埋めしてスラッシュ区切りで結合
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// 5カテゴリスコアの平均値を 0〜100 のスコアに変換
function computeScore(scores: { analytical: number; strategic: number; exploratory: number; reflective: number; social: number; } | null): number {
  if (!scores) return 0; // スコアが未取得（分析未実行）のときは 0 を返す
  // DBでは 0〜1 スケールで保存されているため、5値の平均に ×100 して整数化
  const vals = [scores.analytical, scores.strategic, scores.exploratory, scores.reflective, scores.social];
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}

// スコアをアニメーションしながらカウントアップするカスタムフック
function useCountUp(target: number, duration: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // 3次イーズアウトで加速→減速するカウントアップ
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

const EASE_OUT: Easing = 'easeOut';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: delay / 1000, ease: EASE_OUT },
});

interface IgnitionParticle {
  id: number;
  angle: number;
  dist: number;
  size: number;
  delay: number;
}

export default function Home() {
  const router = useRouter();
  const [targetScore, setTargetScore] = useState(0);
  const [recentSessions, setRecentSessions] = useState<LogItem[]>([]);
  const [exiting, setExiting] = useState(false);
  const [igniting, setIgniting] = useState(false);
  const [ignitionPos, setIgnitionPos] = useState({ x: 0, y: 0 });
  const [ignitionParticles, setIgnitionParticles] = useState<IgnitionParticle[]>([]);
  const sessionBtnRef = useRef<HTMLButtonElement>(null);
  const score = useCountUp(targetScore, 1500);

  // 画面表示時にAgility Scoreと直近3件のログをAPIから取得
  useEffect(() => {
    // portfolio から Agility Score を取得してカウントアップアニメーションを開始
    fetch('/api/portfolio')
      .then((res) => res.json())
      .then((data) => { if (!data.agility?.isEmpty) setTargetScore(data.agility.score); })
      .catch(() => { });
    // 直近3件のセッションログを取得してホーム画面の履歴エリアに表示
    fetch('/api/logs')
      .then((res) => res.json())
      .then((data) => setRecentSessions((data.logs ?? []).slice(0, 3)))
      .catch(() => { });
  }, []);

  // ページ遷移時にフェードアウトアニメーションと点火パーティクルを起動
  const handleNavigate = (path = '/session') => {
    if (exiting) return;

    // /session への遷移時のみボタン中心から放射状にパーティクルを飛ばす
    if (path === '/session' && sessionBtnRef.current) {
      const rect = sessionBtnRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setIgnitionPos({ x: cx, y: cy });

      const particles: IgnitionParticle[] = Array.from({ length: 14 }, (_, i) => ({
        id: i,
        angle: (i / 14) * Math.PI * 2,
        dist: 48 + Math.random() * 36,
        size: 3 + Math.random() * 3,
        delay: i * 0.018,
      }));
      setIgnitionParticles(particles);
      setIgniting(true);
    }

    setExiting(true);
    setTimeout(() => router.push(path), 700);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#050810',
        position: 'relative',
        padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 24px)',
      }}
    >
      <ParticleCanvas opacity={1.0} />

      {/* 点火パーティクル */}
      {igniting && ignitionParticles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: ignitionPos.x, y: ignitionPos.y, opacity: 1, scale: 1 }}
          animate={{
            x: ignitionPos.x + Math.cos(p.angle) * p.dist,
            y: ignitionPos.y + Math.sin(p.angle) * p.dist,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: p.delay }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.id % 3 === 0
              ? 'rgba(129,140,248,0.95)'
              : p.id % 3 === 1
                ? 'rgba(79,110,247,0.9)'
                : 'rgba(56,189,248,0.8)',
            boxShadow: '0 0 8px rgba(79,110,247,0.7)',
            pointerEvents: 'none',
            zIndex: 9998,
            translateX: '-50%',
            translateY: '-50%',
          }}
        />
      ))}

      <motion.div
        animate={exiting ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeIn' }}
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 480,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          justifyContent: 'space-between',
        }}
      >
        {/* 上部: アプリ名 */}
        <motion.div {...fadeUp(0)}>
          <span
            style={{
              fontFamily: 'var(--font-serif), serif',
              fontSize: 14,
              letterSpacing: '0.15em',
              color: 'rgba(241,245,249,0.4)',
            }}
          >
            Receptor
          </span>
        </motion.div>

        {/* 中央エリア */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div style={{ textAlign: 'center' }} {...fadeUp(200)}>
            <div
              style={{
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#64748B',
                marginBottom: 12,
              }}
            >
              Agility Score
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 'clamp(72px, 12vw, 96px)',
                color: '#E2E8F0',
                textShadow:
                  '0 0 40px rgba(79,110,247,0.5), 0 0 80px rgba(79,110,247,0.2)',
                lineHeight: 1,
              }}
            >
              {score}
            </div>

            <div
              style={{
                width: 120,
                height: 1,
                background: 'rgba(79,110,247,0.2)',
                margin: '20px auto 0',
              }}
            />

            <div
              style={{
                fontFamily: 'var(--font-serif), serif',
                fontSize: 13,
                color: 'rgba(241,245,249,0.35)',
                marginTop: 16,
              }}
            >
              思考の柔軟性
            </div>
          </motion.div>

          <motion.div {...fadeUp(500)} style={{ marginTop: 48 }}>
            <button
              ref={sessionBtnRef}
              onClick={() => handleNavigate('/session')}
              disabled={exiting}
              style={{
                border: '1px solid rgba(79,110,247,0.4)',
                background: 'rgba(79,110,247,0.08)',
                color: 'rgba(129,140,248,0.9)',
                padding: '14px 36px',
                borderRadius: 2,
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: 13,
                letterSpacing: '0.12em',
                backdropFilter: 'blur(8px)',
                cursor: exiting ? 'default' : 'pointer',
                transition: 'all 300ms ease-out',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(79,110,247,0.15)';
                el.style.borderColor = 'rgba(129,140,248,0.7)';
                el.style.boxShadow = '0 0 24px rgba(79,110,247,0.25)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(79,110,247,0.08)';
                el.style.borderColor = 'rgba(79,110,247,0.4)';
                el.style.boxShadow = 'none';
              }}
            >
              Start Night Session
            </button>
          </motion.div>
        </div>

        {/* 下部: 処方箋 + 履歴 */}
        <div style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 28 }}>

          {recentSessions.length > 0 && (
            <motion.div {...fadeUp(1000)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B' }}>
                  Recent Sessions
                </span>
                <button
                  onClick={() => handleNavigate('/history')}
                  style={{ background: 'none', border: 'none', color: 'rgba(100,116,139,0.5)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', padding: 0, transition: 'color 200ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(129,140,248,0.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}
                >
                  すべて見る →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentSessions.map((session, i) => (
                  <div
                    key={session.id}
                    onClick={() => handleNavigate('/history')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(79,110,247,0.07)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, color: 'rgba(100,116,139,0.55)' }}>
                      {formatSessionDate(session.createdAt)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: computeScore(session.scores) >= 70 ? 'rgba(99,179,237,0.8)' : 'rgba(252,129,129,0.8)' }}>
                      {computeScore(session.scores)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
      {exiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: 'easeIn' }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#050810', pointerEvents: 'none' }}
        />
      )}
    </main>
  );
}
