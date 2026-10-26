export type ReferralStatus = "pending" | "verified" | "rejected";

export interface ProfileRow { id: string; display_name: string | null; created_at: string }
export interface ReferralCodeRow { id: string; owner_id: string; code: string; active: boolean; created_at: string }
export interface ReferralRow {
  id: string; referral_code_id: string; referred_user_id: string;
  status: ReferralStatus; created_at: string; verified_at: string | null;
}
export interface ReferralEventRow { id: string; referral_id: string; event_type: string; created_at: string }
export interface ChallengeProgressRow {
  id: string; owner_id: string; challenge_type: string; completed_at: string | null; created_at: string;
}

