"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import FaceCamera, { DetectionResult } from "@/components/FaceCamera";
import { extractDescriptor } from "@/lib/faceUtils";
import { saveProfile } from "@/lib/supabase";

type Step = "form" | "capturing" | "saving" | "done" | "error";

export default function RegisterPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [savedName, setSavedName] = useState("");

  const handleDetection = useCallback((r: DetectionResult) => {
    setFaceDetected(r.detected);
  }, []);

  /** 얼굴 캡처 → 평균 임베딩 → Supabase 저장 */
  const handleRegister = async () => {
    if (!name.trim() || !faceDetected) return;
    const video = videoRef.current;
    if (!video) return;

    setStep("capturing");
    setCaptureProgress(0);

    try {
      // 10프레임 수집 후 평균 임베딩 계산 (샘플 수↑ → 노이즈 감소 → 인식률↑)
      const SAMPLES = 10;
      const descriptors = [];

      for (let i = 0; i < SAMPLES; i++) {
        const d = await extractDescriptor(video);
        if (d) descriptors.push(d);
        setCaptureProgress(Math.round(((i + 1) / SAMPLES) * 75));
        await new Promise((r) => setTimeout(r, 200));
      }

      if (descriptors.length < 5) {
        throw new Error(
          `얼굴 인식 데이터가 부족합니다 (${descriptors.length}/${SAMPLES}프레임).\n밝은 곳에서 정면을 바라보고 다시 시도하세요.`
        );
      }

      // 평균 임베딩
      const avg = new Float32Array(128);
      for (const d of descriptors) {
        for (let j = 0; j < 128; j++) avg[j] += d[j];
      }
      for (let j = 0; j < 128; j++) avg[j] /= descriptors.length;

      setCaptureProgress(85);
      setStep("saving");

      await saveProfile(name.trim(), avg);

      setCaptureProgress(100);
      setSavedName(name.trim());
      setStep("done");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "등록 중 오류가 발생했습니다."
      );
      setStep("error");
    }
  };

  const retry = () => {
    setStep("form");
    setCaptureProgress(0);
    setErrorMsg("");
  };

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
            Face Registration
          </p>
          <h1 className="text-lg font-bold text-white">얼굴 등록</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {(["form", "capturing", "done"] as const).map((s, i) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s === step || (step === "saving" && s === "capturing")
                  ? "w-5 h-2 bg-[#4f7cff]"
                  : step === "done" || (step !== "form" && i === 0)
                  ? "w-2 h-2 bg-[#4f7cff]/60"
                  : "w-2 h-2 bg-[#1a2744]"
              }`}
            />
          ))}
        </div>
      </header>

      {/* ── 카메라: 조건문 밖에 단일 인스턴스로 유지 ─────────────
           step 전환 시 언마운트/리마운트 없이 스트림이 끊기지 않음   */}
      <div
        className={`flex flex-col gap-5 ${
          step === "done" || step === "error" ? "hidden" : ""
        }`}
      >
        {/* 이름 입력 (form 단계만 표시) */}
        {step === "form" && (
          <div className="bg-[#0d1526] rounded-2xl border border-[#1a2744] p-4">
            <label className="block text-xs font-semibold text-[#8a9cc4] mb-2">
              사용자 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              maxLength={20}
              className="w-full bg-[#0a0e1a] border border-[#1a2744] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3d4f6e] outline-none focus:border-[#4f7cff] transition-colors"
            />
          </div>
        )}

        {/* 카메라 — 항상 마운트 유지 */}
        <FaceCamera ref={videoRef} onDetection={handleDetection} active />

        {/* 안내사항 (form 단계만 표시) */}
        {step === "form" && (
          <div className="bg-[#0d1526] rounded-2xl border border-[#1a2744] p-4">
            <p className="text-xs font-semibold text-[#8a9cc4] mb-3">등록 전 확인사항</p>
            <ul className="flex flex-col gap-2">
              {[
                { icon: "☀️", text: "밝은 환경에서 촬영하세요" },
                { icon: "😐", text: "정면을 바라보고 중립 표정 유지" },
                { icon: "🚫", text: "선글라스·마스크 등 착용 금지" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs text-[#5a6a8a]">
                  <span>{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 진행률 카드 (capturing / saving 단계) */}
        {(step === "capturing" || step === "saving") && (
          <div className="bg-[#0d1526] rounded-2xl border border-[#1a2744] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4f7cff] animate-pulse" />
                <span className="text-xs font-semibold text-[#8a9cc4]">
                  {step === "saving" ? "Supabase에 저장 중..." : "얼굴 데이터 수집 중..."}
                </span>
              </div>
              <span className="text-sm font-bold text-white">{captureProgress}%</span>
            </div>
            <div className="w-full bg-[#141e35] rounded-full h-2 overflow-hidden mb-4">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] transition-all duration-300"
                style={{ width: `${captureProgress}%` }}
              />
            </div>
            {[
              { label: "얼굴 감지 및 특징점 추출", done: captureProgress >= 30 },
              { label: "128차원 임베딩 벡터 생성", done: captureProgress >= 60 },
              { label: "다중 프레임 평균화", done: captureProgress >= 75 },
              { label: "Supabase 데이터베이스 저장", done: captureProgress >= 100 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 py-1.5">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.done ? "bg-[#0d2a1e]" : "bg-[#0f1929]"
                  }`}
                >
                  {item.done ? (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2a3f6e]" />
                  )}
                </div>
                <span className={`text-[11px] ${item.done ? "text-[#4ade80]" : "text-[#3d4f6e]"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 등록 버튼 (form) / 안내 문구 (capturing·saving) */}
        {step === "form" ? (
          <button
            onClick={handleRegister}
            disabled={!name.trim() || !faceDetected}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 ${
              name.trim() && faceDetected
                ? "bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] text-white shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                : "bg-[#0d1526] border border-[#1a2744] text-[#3d4f6e] cursor-not-allowed"
            }`}
          >
            {!name.trim()
              ? "이름을 입력하세요"
              : !faceDetected
              ? "얼굴을 카메라에 위치시키세요"
              : "얼굴 등록 시작"}
          </button>
        ) : (
          <p className="text-center text-xs text-[#3d4f6e]">
            정면을 바라봐 주세요. 자동으로 완료됩니다.
          </p>
        )}
      </div>

      {/* ── 3단계: 등록 완료 ──────────────────────────────────── */}
      {step === "done" && (
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
            <h2 className="text-2xl font-bold text-white mb-1">등록 완료!</h2>
            <p className="text-sm text-[#4a5a7a]">
              <span className="text-[#4f7cff] font-semibold">{savedName}</span>
              님의 얼굴이 등록되었습니다.
            </p>
          </div>

          <div className="w-full bg-[#0d1526] rounded-2xl border border-[#1a2744] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#8a9cc4]">등록 정보</span>
              <span className="text-[10px] text-[#4ade80] bg-[#0d2a1e] px-2 py-0.5 rounded-full font-semibold">
                저장됨
              </span>
            </div>
            {[
              { label: "이름", value: savedName },
              { label: "등록 일시", value: new Date().toLocaleString("ko-KR") },
              { label: "임베딩 차원", value: "128 (faceRecognitionNet)" },
              { label: "저장 위치", value: "Supabase PostgreSQL" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-t border-[#141e35]">
                <span className="text-xs text-[#4a5a7a]">{item.label}</span>
                <span className="text-xs text-[#c0cceb] font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={retry}
              className="flex-1 py-4 rounded-2xl bg-[#0d1526] border border-[#1a2744] text-[#8a9cc4] text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              추가 등록
            </button>
            <Link href="/authenticate" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] text-white text-sm font-bold active:scale-[0.98] transition-transform">
                인증 시작
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── 오류 ──────────────────────────────────────────────── */}
      {step === "error" && (
        <div className="flex flex-col items-center gap-6 pt-4">
          <div className="w-24 h-24 rounded-full bg-[#2a0d0d] border-2 border-[#f87171]/30 flex items-center justify-center">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">등록 실패</h2>
            <p className="text-sm text-[#f87171] leading-relaxed px-4 whitespace-pre-line">
              {errorMsg}
            </p>
          </div>
          <button
            onClick={retry}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] text-white text-base font-bold active:scale-[0.98] transition-transform"
          >
            다시 시도
          </button>
        </div>
      )}
    </main>
  );
}
