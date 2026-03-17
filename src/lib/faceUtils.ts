/**
 * face-api.js 모델 싱글턴 관리 + 얼굴 임베딩 유틸리티
 *
 * - 모델은 최초 1회만 로드되며, 이후 호출은 캐시된 인스턴스를 반환
 * - faceRecognitionNet은 128차원 임베딩 벡터를 생성 (등록 / 비교에 사용)
 */

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights";

type FaceAPI = typeof import("face-api.js");

let _api: FaceAPI | null = null;
let _loadPromise: Promise<FaceAPI> | null = null;

/**
 * face-api.js 모듈 + 필요한 모델 3종을 로드하고 반환.
 * 이미 로드된 경우 즉시 반환 (멱등).
 */
export async function getFaceAPI(): Promise<FaceAPI> {
  if (_api) return _api;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const faceapi = await import("face-api.js");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      // 128차원 얼굴 임베딩 생성에 필요
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    _api = faceapi;
    return faceapi;
  })();

  return _loadPromise;
}

/**
 * 비디오 프레임에서 단일 얼굴의 128차원 임베딩 벡터 추출.
 * - inputSize 320: 224보다 더 세밀한 얼굴 특징을 잡아 임베딩 품질 향상
 * - scoreThreshold 0.4: 낮춰서 약간 기울어진 얼굴도 감지
 * 얼굴이 없거나 감지 실패 시 null 반환.
 */
export async function extractDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  const faceapi = await getFaceAPI();
  const result = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
    )
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

/**
 * 여러 프레임을 샘플링해 평균 임베딩을 계산 → 더 안정적인 등록 벡터.
 * @param video 캡처할 비디오 엘리먼트
 * @param samples 수집할 프레임 수 (기본 5)
 * @param intervalMs 프레임 간격 ms (기본 200)
 */
export async function extractAveragedDescriptor(
  video: HTMLVideoElement,
  samples = 5,
  intervalMs = 200
): Promise<Float32Array | null> {
  const descriptors: Float32Array[] = [];

  for (let i = 0; i < samples; i++) {
    const d = await extractDescriptor(video);
    if (d) descriptors.push(d);
    if (i < samples - 1) await delay(intervalMs);
  }

  if (descriptors.length === 0) return null;

  // 산술 평균 후 재정규화
  const avg = new Float32Array(128);
  for (const d of descriptors) {
    for (let j = 0; j < 128; j++) avg[j] += d[j];
  }
  for (let j = 0; j < 128; j++) avg[j] /= descriptors.length;
  return avg;
}

/** 유클리드 거리 (face-api.js 표준 지표) */
export function euclideanDistance(
  a: Float32Array | number[],
  b: Float32Array | number[]
): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * 유클리드 거리 → 일치율(%) 변환 (시그모이드 곡선)
 *
 * face-api.js faceRecognitionNet 실측 거리 분포:
 *   동일인 (좋은 조건)  : ~0.15–0.35  → 목표 90%+
 *   동일인 (나쁜 조건)  : ~0.35–0.50  → 목표 70–90%
 *   다른 사람           : ~0.60+       → 목표 30% 이하
 *
 * 공식: 100 / (1 + exp(10 × (distance − 0.40)))
 *   distance 0.10 → ~99%
 *   distance 0.25 → ~96%
 *   distance 0.35 → ~88%   ← 동일인 경계
 *   distance 0.40 → ~50%   ← 변곡점
 *   distance 0.55 → ~18%
 *   distance 0.65 → ~7%
 */
export function distanceToMatchRate(distance: number): number {
  const rate = 100 / (1 + Math.exp(10 * (distance - 0.4)));
  return Math.round(Math.max(0, Math.min(100, rate)));
}

export interface MatchResult {
  name: string;
  matchRate: number; // 0~100
  distance: number;
}

/**
 * 가장 유사한 프로필을 반환.
 * 일치율이 낮아도 무조건 최선의 결과를 반환하므로,
 * 호출자가 임계값(≥90 등)을 적용해야 함.
 */
export function findBestMatch(
  descriptor: Float32Array,
  profiles: { name: string; descriptor: number[] }[]
): MatchResult | null {
  if (profiles.length === 0) return null;

  let best: MatchResult = { name: "", matchRate: -1, distance: Infinity };

  for (const p of profiles) {
    const d = euclideanDistance(descriptor, p.descriptor);
    const rate = distanceToMatchRate(d);
    if (rate > best.matchRate) {
      best = { name: p.name, matchRate: rate, distance: d };
    }
  }

  return best;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
