export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 120,
    amountInPaise: 120 * 100,
    durationDays: 30,
    description: 'Billed monthly. Auto-renewal available.',
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Super Saver',
    price: 1099,
    amountInPaise: 1099 * 100,
    durationDays: 365,
    description: 'Save ₹341 compared to monthly. Best value for retail.',
  },
} as const;

export type PlanType = keyof typeof PLANS;
