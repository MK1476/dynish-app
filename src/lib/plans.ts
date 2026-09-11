export const PLANS = {
  test_7days: {
    id: 'test_7days',
    name: 'Tester Pack',
    price: 10,
    amountInPaise: 10 * 100,
    durationDays: 7,
    description: 'Special ₹10 tester pack (valid for 7 days). Exclusive for live testing.',
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Pro',
    price: 199,
    amountInPaise: 199 * 100,
    durationDays: 30,
    description: 'Billed monthly. Unlimited counter billing & catalog.',
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Super Saver',
    price: 1999,
    amountInPaise: 1999 * 100,
    durationDays: 365,
    description: 'Save 16% compared to monthly. Best value for retail.',
  },
} as const;

export type PlanType = keyof typeof PLANS;
