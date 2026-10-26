export type SlotStatus = "pending" | "verified";

export interface ReferralSlot { slot: number; status: SlotStatus }

/** Shape returned by the get-challenge-progress Edge Function. */
export interface ChallengeProgress {
  verified: number;
  pendingAwaitingVerification: number;
  target: number;
  completed: boolean;
  completedAt: string | null;
  slots: ReferralSlot[];
  myAttribution: "pending" | "verified" | "rejected" | null;
}

/** Shape returned by get-challenge-status. */
export interface ChallengeStatus {
  completed: boolean;
  verified: number;
  target: number;
  completedAt: string | null;
}

export interface ReferralCodeResponse { code: string; referralUrl: string }

export const TARGET_REFERRALS = 5;
export const REWARD_LABEL = "1,00,000";

