import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** face_profiles 테이블 행 타입 */
export interface FaceProfile {
  id: string;
  name: string;
  /** PostgreSQL float8[] → JS number[] (128차원 얼굴 임베딩) */
  descriptor: number[];
  created_at: string;
}

// ── CRUD 헬퍼 ─────────────────────────────────────────────────────────

/** 모든 얼굴 프로필 조회 */
export async function fetchProfiles(): Promise<FaceProfile[]> {
  const { data, error } = await supabase
    .from("face_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`프로필 조회 실패: ${error.message}`);
  return data as FaceProfile[];
}

/** 새 얼굴 프로필 저장 */
export async function saveProfile(
  name: string,
  descriptor: Float32Array
): Promise<FaceProfile> {
  const { data, error } = await supabase
    .from("face_profiles")
    .insert({ name, descriptor: Array.from(descriptor) })
    .select()
    .single();

  if (error) throw new Error(`프로필 저장 실패: ${error.message}`);
  return data as FaceProfile;
}

/** 프로필 삭제 */
export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from("face_profiles")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`프로필 삭제 실패: ${error.message}`);
}
