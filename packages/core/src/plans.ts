/**
 * Pricing from the research plan (USD-first). These are starting guesses to
 * validate in the 20 customer interviews, not final prices.
 */
export type PlanId = 'free' | 'creator' | 'pro' | 'agency';

export type Plan = {
  id: PlanId;
  name: string;
  monthlyUsd: number;
  /** Effective monthly price when billed yearly. */
  yearlyMonthlyUsd: number;
  videosPerMonth: number;
  maxVideoSeconds: number;
  seats: number;
  watermark: boolean;
  proTemplates: boolean;
  srtExport: boolean;
  brandKit: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyUsd: 0,
    yearlyMonthlyUsd: 0,
    videosPerMonth: 3,
    maxVideoSeconds: 60,
    seats: 1,
    watermark: true,
    proTemplates: false,
    srtExport: false,
    brandKit: false,
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    monthlyUsd: 12,
    yearlyMonthlyUsd: 8,
    videosPerMonth: 30,
    maxVideoSeconds: 180,
    seats: 1,
    watermark: false,
    proTemplates: true,
    srtExport: false,
    brandKit: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyUsd: 29,
    yearlyMonthlyUsd: 19,
    videosPerMonth: 100,
    maxVideoSeconds: 180,
    seats: 1,
    watermark: false,
    proTemplates: true,
    srtExport: true,
    brandKit: true,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    monthlyUsd: 79,
    yearlyMonthlyUsd: 59,
    videosPerMonth: 400,
    maxVideoSeconds: 180,
    seats: 5,
    watermark: false,
    proTemplates: true,
    srtExport: true,
    brandKit: true,
  },
};

export const PLAN_ORDER: readonly PlanId[] = ['free', 'creator', 'pro', 'agency'];
