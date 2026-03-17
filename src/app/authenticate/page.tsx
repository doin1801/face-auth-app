"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FaceCamera, { DetectionResult } from "@/components/FaceCamera";
import { extractDescriptor, findBestMatch, distanceToMatchRate } from "@/lib/faceUtils";
import { fetchProfiles, FaceProfile } from "@/lib/supabase";

type Step = "loading" | "idle" | "verifying" | "success" | "failed";

/** 인증 성공 임계값 */
const AUTH_THRESHOLD = 90;
/** 검증 창 (초) */
const VERIFY_SECONDS = 4;

export default function AuthenticatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [step, setStep] = useState<Step>("loading");
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [profileError, setProfileError] = useState("");

  // 실시간 비교 상태
  const [faceDetected, setFaceDetected] = useState(false);
  const [liveMatch, setLiveMatch] = useState<{ name: string; rate: number } | null>(null);

  // 검증 타이머 상태
  const [countdown, setCountdown] = useState(VERIFY_SECONDS);
  const verifyingRef = useRef(false);
  const processingRef = useRef(false); // 동시 descriptor 추출 방지
  const peakMatchRef = useRef<{ name: string; rate: number } | null>(null); // 최고 일치율

  // 최신 profiles를 ref로 보관 (콜백 stale closure 방지)
  const profilesRef = useRef<FaceProfile[]>([]);
  profilesRef.current = profiles;

  // ── Supabase에서 등록된 얼굴 프로필 로드 ─────────────────────
  useEffect(() => {
    fetchProfiles()
      .then((data) => {
        setProfiles(data);
        setStep("idle");
      })
      .catch((err: unknown) => {
        setProfileError(
          err instanceof Error ? err.message : "프로필 로드 실패"
        );
        setStep("idle");
      });
  }, []);

  // ── 얼굴 감지 콜백 ───────────────────────────────────────────
  const handleDetection = useCallback((r: DetectionResult) => {
    setFaceDetected(r.detected);
  }, []);

  // ── 실시간 임베딩 비교 (검증 중에만) ────────────────────────
  useEffect(() => {
    if (step !== "verifying") return;

    let alive = true;
    verifyingRef.current = true;
    peakMatchRef.current = null;
    processingRef.current = false;

    const runComparison = async () => {
      while (alive && verifyingRef.current) {
        const video = videoRef.current;
        if (video && !processingRef.current && profilesRef.current.length > 0) {
          processingRef.current = true;
          try {
            const descriptor = await extractDescriptor(video);
            if (descriptor && alive) {
              const best = findBestMatch(descriptor, profilesRef.current);
              if (best) {
                setLiveMatch({ name: best.name, rate: best.matchRate });
                // 최고 일치율 기록
                if (!peakMatchRef.current || best.matchRate > peakMatchRef.current.rate) {
                  peakMatchRef.current = { name: best.name, rate: best.matchRate };
                }
              }
            }
          } finally {
            processingRef.current = false;
          }
        }
        await new Promise((r) => setTimeout(r, 400)); // 400ms 간격
      }
    };

    runComparison();

    // 카운트다운 타이머
    setCountdown(VERIFY_SECONDS);
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    // 검증 창 종료
    const timeout = setTimeout(() => {
      alive = false;
      verifyingRef.current = false;
      clearInterval(interval);

      const peak = peakMatchRef.current;
      if (peak && peak.rate >= AUTH_THRESHOLD) {
        setStep("success");
      } else {
        setStep("failed");
      }
    }, VERIFY_SECONDS * 1000);

    return () => {
      alive = false;
      verifyingRef.current = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step]);

  const startVerify = () => {
    setLiveMatch(null);
    setStep("verifying");
  };

  const retry = () => {
    setLiveMatch(null);
    setStep("idle");
  };

  // ── 일치율 게이지 색상 ───────────────────────────────────────
  const rateColor = (rate: number) =>
    rate >= 90
      ? "#4ade80"
      : rate >= 70
      ? "#facc15"
      : "#f87171";

  return (
    <main className="flex flex-col min-h-dvh px-5 py-10 bg-[#0a0e1a]">
      {/* 헤더 */}
      <header className="flex items-center gap-3 mb-6">
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-[#0d1526] border border-[#1a2744] flex items-center justify-center active:scale-95 transition-transform">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b8fd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </Link>
        <div>
          <p className="text-[10px] text-[#4f7cff] font-medium tracking-widest uppercase">
            Biometric Verify
          </p>
          <h1 className="text-lg font-bold text-white">인증 시작</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d1526] border border-[#1a2744]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4f7cff" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[10px] text-[#4f7cff] font-medium">보안 연결</span>
        </div>
      </header>

      {/* ── 프로필 로딩 중 ────────────────────────────────────── */}
      {step === "loading" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-[#1a2744]" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#4f7cff] animate-spin" />
          </div>
          <p className="text-sm text-[#4a5a7a]">등록된 프로필 불러오는 중...</p>
        </div>
      )}

      {/* ── 대기 / 검증 단계 ─────────────────────────────────── */}
      {(step === "idle" || step === "verifying") && (
        <div className="flex flex-col gap-5">
          {/* 오류 배너 */}
          {profileError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1a0d0d] border border-[#3d1515]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-[#f87171]">{profileError}</p>
            </div>
          )}

          {/* 등록 인원 없을 때 경고 */}
          {!profileError && profiles.length === 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0f1929] border border-[#1a2744]">
              <p className="text-xs text-[#4a5a7a]">등록된 얼굴이 없습니다.</p>
              <Link href="/register">
                <span className="text-xs text-[#4f7cff] font-semibold">등록하기 →</span>
              </Link>
            </div>
          )}

          {/* 카메라 */}
          <div className="relative">
            <FaceCamera ref={videoRef} onDetection={handleDetection} active />

            {/* 검증 중: 카운트다운 + 실시간 일치율 오버레이 */}
            {step === "verifying" && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#070c18]/90 to-transparent rounded-b-2xl">
                <div className="flex items-end justify-between">
                  {/* 실시간 일치율 */}
                  <div>
                    {liveMatch ? (
                      <>
                        <p className="text-xs text-[#8a9cc4] mb-0.5">최근접 일치</p>
                        <p className="text-base font-bold" style={{ color: rateColor(liveMatch.rate) }}>
                          {liveMatch.name}
                        </p>
                        <p className="text-2xl font-black" style={{ color: rateColor(liveMatch.rate) }}>
                          {liveMatch.rate}%
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-[#4a5a7a]">분석 중...</p>
                    )}
                  </div>
                  {/* 원형 카운트다운 */}
                  <div className="relative w-14 h-14">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="#1a2744" strokeWidth="4" />
                      <circle
                        cx="28" cy="28" r="22"
                        fill="none" stroke="#4f7cff" strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - countdown / VERIFY_SECONDS)}`}
                        className="transition-all duration-1000 linear"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{countdown}</span>
                    </div>
                  </div>
                </div>

                {/* 일치율 게이지 바 */}
                {liveMatch && (
                  <div className="mt-3">
                    <div className="w-full bg-[#1a2744] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${liveMatch.rate}%`,
                          backgroundColor: rateColor(liveMatch.rate),
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#3d4f6e]">0%</span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: liveMatch.rate >= AUTH_THRESHOLD ? "#4ade80" : "#4a5a7a" }}
                      >
                        기준: {AUTH_THRESHOLD}%
                      </span>
                      <span className="text-[10px] text-[#3d4f6e]">100%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 등록 인원 수 */}
          {profiles.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0d1526] border border-[#1a2744]">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f7cff" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="text-xs text-[#8a9cc4]">등록된 사용자</span>
              </div>
              <span className="text-xs font-bold text-white">{profiles.length}명</span>
            </div>
          )}

          {/* 인증 시작 버튼 */}
          {step === "idle" && (
            <button
              onClick={startVerify}
              disabled={!faceDetected || profiles.length === 0}
              className={`w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 ${
                faceDetected && profiles.length > 0
                  ? "bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] text-white shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                  : "bg-[#0d1526] border border-[#1a2744] text-[#3d4f6e] cursor-not-allowed"
              }`}
            >
              {profiles.length === 0
                ? "등록된 얼굴이 없습니다"
                : !faceDetected
                ? "얼굴을 카메라에 위치시키세요"
                : "인증 시작"}
            </button>
          )}
        </div>
      )}

      {/* ── 인증 성공 ─────────────────────────────────────────── */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-6 pt-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-[#0d2a1e] border-2 border-[#4ade80]/40 flex items-center justify-center">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="absolute -inset-3 rounded-full border border-[#4ade80]/15 animate-ping" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">인증 성공</h2>
            <p className="text-sm text-[#4a5a7a]">
              <span className="text-[#4ade80] font-bold text-base">
                {peakMatchRef.current?.name}
              </span>{" "}
              님, 본인 확인 완료
            </p>
          </div>

          {/* 인증 결과 카드 */}
          <div className="w-full bg-[#0d2a1e] rounded-2xl border border-[#1a3d25] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#4ade80]/80">인증 결과</span>
              <span className="text-[10px] text-[#4ade80] bg-[#0a2018] px-2 py-0.5 rounded-full font-bold">
                인증 완료
              </span>
            </div>

            {/* 일치율 게이지 */}
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs text-[#4a5a7a]">최종 일치율</span>
                <span className="text-2xl font-black text-[#4ade80]">
                  {peakMatchRef.current?.rate ?? 0}%
                </span>
              </div>
              <div className="w-full bg-[#0a2018] rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-500"
                  style={{ width: `${peakMatchRef.current?.rate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-[#4ade80]/60">
                  기준({AUTH_THRESHOLD}%) 초과 ✓
                </span>
              </div>
            </div>

            {[
              { label: "인증 사용자", value: peakMatchRef.current?.name ?? "-" },
              { label: "인증 시각", value: new Date().toLocaleTimeString("ko-KR") },
              { label: "인증 방법", value: "얼굴 인식 (face-api.js)" },
              { label: "임베딩 차원", value: "128D Euclidean" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-t border-[#1a3d25]">
                <span className="text-xs text-[#4a6a5a]">{item.label}</span>
                <span className="text-xs text-[#a0f0c0] font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          <Link href="/" className="w-full">
            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] text-white text-base font-bold active:scale-[0.98] transition-transform">
              홈으로
            </button>
          </Link>
        </div>
      )}

      {/* ── 인증 실패 ─────────────────────────────────────────── */}
      {step === "failed" && (
        <div className="flex flex-col items-center gap-6 pt-4">
          <div className="w-28 h-28 rounded-full bg-[#2a0d0d] border-2 border-[#f87171]/30 flex items-center justify-center">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">인증 실패</h2>
            <p className="text-sm text-[#4a5a7a]">
              일치율이{" "}
              <span className="text-[#f87171] font-bold">
                {peakMatchRef.current?.rate ?? 0}%
              </span>
              로 기준({AUTH_THRESHOLD}%) 미달
            </p>
          </div>

          {/* 실패 일치율 게이지 */}
          <div className="w-full bg-[#1a0d0d] rounded-2xl border border-[#3d1515] p-4">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs text-[#7a4a4a]">최고 일치율</span>
              <span className="text-xl font-black text-[#f87171]">
                {peakMatchRef.current?.rate ?? 0}%
              </span>
            </div>
            <div className="w-full bg-[#2a0d0d] rounded-full h-2 overflow-hidden mb-1">
              <div
                className="h-2 rounded-full bg-[#f87171] transition-all duration-500"
                style={{ width: `${peakMatchRef.current?.rate ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-[#5a3a3a]">0%</span>
              <span className="text-[10px] text-[#f87171]/60">기준: {AUTH_THRESHOLD}%</span>
              <span className="text-[10px] text-[#5a3a3a]">100%</span>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-[#3d1515] pt-3">
              {[
                "조명이 충분하지 않을 수 있습니다",
                "얼굴이 가려진 경우 인식이 어렵습니다",
                "등록 시와 다른 각도·표정인 경우",
              ].map((r, i) => (
                <p key={i} className="text-xs text-[#7a4a4a] flex items-start gap-1.5">
                  <span className="flex-shrink-0 mt-0.5">·</span>
                  {r}
                </p>
              ))}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={retry}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] text-white text-sm font-bold active:scale-[0.98] transition-transform"
            >
              다시 시도
            </button>
            <Link href="/register" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-[#0d1526] border border-[#1a2744] text-[#8a9cc4] text-sm font-semibold active:scale-[0.98] transition-transform">
                얼굴 재등록
              </button>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
