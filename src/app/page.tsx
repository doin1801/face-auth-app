"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col min-h-dvh px-6 py-10 bg-[#0a0e1a]">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4f7cff] to-[#a78bfa] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
              <circle cx="12" cy="10" r="3"/>
              <path d="M6.5 19.5a6 6 0 0 1 11 0"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#c7d0f8] tracking-widest uppercase">FaceAuth</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#151c30] flex items-center justify-center border border-[#1e2a45]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7fa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
        </div>
      </header>

      {/* 상태 칩 */}
      <div className="mt-4 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f1929] border border-[#1a2744] text-xs text-[#6b8fd4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          시스템 정상 운영 중
        </div>
      </div>

      {/* 메인 타이틀 */}
      <section className="mb-10">
        <p className="text-xs font-medium text-[#4f7cff] tracking-widest uppercase mb-2">
          Biometric Authentication
        </p>
        <h1 className="text-3xl font-bold text-white leading-tight mb-3">
          안전하고 빠른<br />
          <span className="bg-gradient-to-r from-[#4f7cff] to-[#a78bfa] bg-clip-text text-transparent">
            얼굴 인증
          </span>
        </h1>
        <p className="text-sm text-[#5a6a8a] leading-relaxed">
          생체 인증 기술로 간편하고 안전하게<br />본인을 확인하세요.
        </p>
      </section>

      {/* 보안 지표 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: "인증 속도", value: "0.3s", icon: "⚡" },
          { label: "보안 등급", value: "A+", icon: "🛡" },
          { label: "정확도", value: "99.9%", icon: "🎯" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center py-4 rounded-2xl bg-[#0d1526] border border-[#1a2744]"
          >
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="text-base font-bold text-white">{item.value}</span>
            <span className="text-[10px] text-[#4a5a7a] mt-0.5">{item.label}</span>
          </div>
        ))}
      </div>

      {/* 주요 액션 버튼 */}
      <div className="flex flex-col gap-4 mb-8">
        {/* 얼굴 등록 버튼 */}
        <Link href="/register" className="block">
          <button className="w-full relative overflow-hidden rounded-2xl py-5 px-6 bg-gradient-to-r from-[#1a2f6e] to-[#1e1a4e] border border-[#2a3f8f] group active:scale-[0.98] transition-transform duration-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4f7cff] to-[#3b5bd4] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M6.5 19.5a6 6 0 0 1 11 0"/>
                  <line x1="19" y1="5" x2="23" y2="5"/>
                  <line x1="21" y1="3" x2="21" y2="7"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-white">얼굴 등록</p>
                <p className="text-xs text-[#5a75b8] mt-0.5">처음 사용 시 얼굴을 등록하세요</p>
              </div>
              <div className="ml-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f7cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
            {/* 글로우 효과 */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-100 bg-white/5 transition-opacity duration-100" />
          </button>
        </Link>

        {/* 인증 시작 버튼 */}
        <Link href="/authenticate" className="block">
          <button className="w-full relative overflow-hidden rounded-2xl py-5 px-6 bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] group active:scale-[0.98] transition-transform duration-100 shadow-lg shadow-blue-900/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-white">인증 시작</p>
                <p className="text-xs text-blue-200/70 mt-0.5">얼굴 인식으로 본인 확인</p>
              </div>
              <div className="ml-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
            {/* 글로우 효과 */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-100 bg-white/10 transition-opacity duration-100" />
          </button>
        </Link>
      </div>

      {/* 최근 인증 내역 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#8a9cc4]">최근 인증 내역</h2>
          <button className="text-xs text-[#4f7cff]">전체 보기</button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { time: "오늘 09:23", status: "성공", detail: "얼굴 인증 완료" },
            { time: "어제 18:45", status: "성공", detail: "얼굴 인증 완료" },
            { time: "어제 08:12", status: "실패", detail: "얼굴 인식 불일치" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0d1526] border border-[#141e35]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    item.status === "성공"
                      ? "bg-[#0d2a1e] text-[#4ade80]"
                      : "bg-[#2a0d0d] text-[#f87171]"
                  }`}
                >
                  {item.status === "성공" ? "✓" : "✕"}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#c0cceb]">{item.detail}</p>
                  <p className="text-[10px] text-[#3d4f6e] mt-0.5">{item.time}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  item.status === "성공"
                    ? "bg-[#0d2a1e] text-[#4ade80]"
                    : "bg-[#2a0d0d] text-[#f87171]"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 보안 배너 */}
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0d1526] border border-[#141e35]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f7cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="text-[11px] text-[#4a5a7a]">
            256-bit 암호화 · ISO 27001 인증 · FIDO2 준수
          </span>
        </div>
      </div>
    </main>
  );
}
