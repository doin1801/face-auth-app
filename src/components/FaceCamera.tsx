"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getFaceAPI } from "@/lib/faceUtils";

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  landmarkCount: number;
}

interface Props {
  onDetection?: (result: DetectionResult) => void;
  active?: boolean;
}

/**
 * 실시간 얼굴 감지 카메라 컴포넌트.
 * forwardRef로 내부 <video> 엘리먼트를 외부에 노출 →
 * 부모에서 extractDescriptor(videoRef.current) 호출 가능.
 */
const FaceCamera = forwardRef<HTMLVideoElement, Props>(function FaceCamera(
  { onDetection, active = true },
  forwardedRef
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const onDetectionRef = useRef(onDetection);
  onDetectionRef.current = onDetection;
  const prevDetectedRef = useRef(false);

  const [phase, setPhase] = useState<"loading" | "running" | "error">("loading");
  const [loadMsg, setLoadMsg] = useState("AI 모델 초기화 중...");
  const [faceOn, setFaceOn] = useState(false);

  // 내부 videoRef를 forwardedRef와 동기화
  useImperativeHandle(forwardedRef, () => videoRef.current!, []);

  useEffect(() => {
    if (!active) return;
    let alive = true;

    (async () => {
      try {
        setLoadMsg("얼굴 인식 모델 로딩 중...");
        // faceUtils 싱글턴 — 이미 로드된 경우 즉시 반환
        const faceapi = await getFaceAPI();
        if (!alive) return;

        setLoadMsg("카메라 연결 중...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (!alive) return;

        setPhase("running");

        // ── 실시간 감지 루프 ───────────────────────────────────
        const canvas = canvasRef.current!;
        const opts = new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.5,
        });

        const loop = async () => {
          if (!alive) return;

          if (video.readyState === 4) {
            const W = video.videoWidth;
            const H = video.videoHeight;
            if (canvas.width !== W) canvas.width = W;
            if (canvas.height !== H) canvas.height = H;

            const dets = await faceapi
              .detectAllFaces(video, opts)
              .withFaceLandmarks(true);

            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, W, H);

            // 비디오 CSS mirror(scaleX-1)와 좌표 일치를 위해 ctx 반전
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-W, 0);

            dets.forEach((det) => {
              const { x, y, width: bw, height: bh } = det.detection.box;
              const score = det.detection.score;

              // 바운딩 박스
              ctx.fillStyle = "rgba(79,124,255,0.07)";
              ctx.fillRect(x, y, bw, bh);
              ctx.strokeStyle = "#4f7cff";
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x, y, bw, bh);

              // 코너 액센트
              const cL = Math.min(bw, bh) * 0.18;
              ctx.strokeStyle = "#7c5cfc";
              ctx.lineWidth = 3;
              ctx.lineCap = "round";
              (
                [
                  [[x, y + cL], [x, y], [x + cL, y]],
                  [[x + bw - cL, y], [x + bw, y], [x + bw, y + cL]],
                  [[x, y + bh - cL], [x, y + bh], [x + cL, y + bh]],
                  [[x + bw - cL, y + bh], [x + bw, y + bh], [x + bw, y + bh - cL]],
                ] as [number, number][][]
              ).forEach(([[x1, y1], [x2, y2], [x3, y3]]) => {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.stroke();
              });

              // 신뢰도 뱃지
              const label = `${Math.round(score * 100)}%`;
              ctx.font = "bold 11px system-ui";
              const tw = ctx.measureText(label).width + 16;
              ctx.fillStyle = "rgba(79,124,255,0.88)";
              ctx.beginPath();
              ctx.roundRect(x, y - 26, tw, 20, 4);
              ctx.fill();
              ctx.fillStyle = "#fff";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(label, x + tw / 2, y - 16);

              // ── 68개 특징점 ─────────────────────────────────
              const pts = det.landmarks.positions;
              const GROUPS: {
                start: number; end: number;
                color: string; r: number; close?: boolean;
              }[] = [
                { start: 0,  end: 16, color: "#93c5fd", r: 1.2 },
                { start: 17, end: 21, color: "#c4b5fd", r: 1.8 },
                { start: 22, end: 26, color: "#c4b5fd", r: 1.8 },
                { start: 27, end: 35, color: "#67e8f9", r: 1.8 },
                { start: 36, end: 41, color: "#4ade80", r: 2.2, close: true },
                { start: 42, end: 47, color: "#4ade80", r: 2.2, close: true },
                { start: 48, end: 59, color: "#fb923c", r: 1.8, close: true },
                { start: 60, end: 67, color: "#fbbf24", r: 1.6, close: true },
              ];

              GROUPS.forEach(({ start, end, color, r, close }) => {
                const gPts = pts.slice(start, end + 1);
                ctx.beginPath();
                ctx.moveTo(gPts[0].x, gPts[0].y);
                gPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
                if (close) ctx.closePath();
                ctx.strokeStyle = color + "50";
                ctx.lineWidth = 0.8;
                ctx.stroke();
                gPts.forEach((p) => {
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                  ctx.fillStyle = color;
                  ctx.shadowColor = color;
                  ctx.shadowBlur = 5;
                  ctx.fill();
                  ctx.shadowBlur = 0;
                });
              });
            });

            ctx.restore();

            const detected = dets.length > 0;
            if (detected !== prevDetectedRef.current) {
              prevDetectedRef.current = detected;
              setFaceOn(detected);
            }
            onDetectionRef.current?.({
              detected,
              confidence: dets[0]?.detection.score ?? 0,
              landmarkCount: dets[0]?.landmarks.positions.length ?? 0,
            });
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err: unknown) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : "";
        setLoadMsg(
          msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")
            ? "카메라 접근 권한이 필요합니다.\n브라우저 설정에서 허용해 주세요."
            : "초기화에 실패했습니다.\n인터넷 연결을 확인하고 새로고침해 주세요."
        );
        setPhase("error");
      }
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-[#070c18]"
      style={{ aspectRatio: "4/3" }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* 로딩 / 에러 오버레이 */}
      {phase !== "running" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#070c18]">
          {phase === "loading" ? (
            <>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#1a2744]" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#4f7cff] animate-spin" />
                <div className="absolute inset-3 rounded-full border border-[#4f7cff]/20 animate-pulse" />
              </div>
              <p className="text-sm text-[#4a5a7a] text-center px-6 leading-relaxed whitespace-pre-line">
                {loadMsg}
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-[#2a0d0d] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm text-[#f87171] text-center px-6 leading-relaxed whitespace-pre-line">
                {loadMsg}
              </p>
            </>
          )}
        </div>
      )}

      {/* 감지 상태 뱃지 */}
      {phase === "running" && (
        <div
          className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm transition-all duration-300 ${
            faceOn
              ? "bg-[#0d2a1e]/80 border border-[#4ade80]/40 text-[#4ade80]"
              : "bg-[#0d1526]/70 border border-[#1a2744] text-[#4a5a7a]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              faceOn ? "bg-[#4ade80] animate-pulse" : "bg-[#3d4f6e]"
            }`}
          />
          {faceOn ? "얼굴 감지됨" : "얼굴 탐색 중..."}
        </div>
      )}

      {/* 뷰파인더 코너 */}
      {phase === "running" &&
        [
          "top-3 left-3 border-t-2 border-l-2 rounded-tl-lg",
          "top-3 right-3 border-t-2 border-r-2 rounded-tr-lg",
          "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg",
          "bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg",
        ].map((cls, i) => (
          <div key={i} className={`absolute w-5 h-5 border-[#4f7cff]/50 ${cls}`} />
        ))}
    </div>
  );
});

export default FaceCamera;
