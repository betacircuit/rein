# Information Architecture

## 1. Top-level hierarchy

```text
Student OS
├─ Home
│  ├─ Today: lessons and prep
│  ├─ Match inbox
│  ├─ Tutoring earned / received / outstanding
│  ├─ Accounts and monthly cash flow
│  ├─ Subscription renewals and trials
│  ├─ Actual available surplus and Grow status
│  └─ Household alerts: low stock, cleaning, settlement
├─ Tutoring
│  ├─ Students
│  │  ├─ Student list
│  │  ├─ Create/edit student
│  │  └─ Student detail
│  │     ├─ Overview
│  │     ├─ Schedule
│  │     ├─ Lessons
│  │     ├─ Preparation/history
│  │     └─ Billing/receivables
│  ├─ Lessons
│  │  ├─ Scheduled
│  │  ├─ Completed
│  │  └─ Cancelled
│  ├─ Calendar
│  └─ Receivables shortcut
├─ Money
│  ├─ Overview
│  ├─ Accounts
│  │  ├─ Account list
│  │  ├─ Account detail
│  │  ├─ Sync/import
│  │  └─ Transfer between own accounts
│  ├─ Transactions
│  │  ├─ All
│  │  ├─ Income
│  │  ├─ Expense
│  │  ├─ Transfer
│  │  └─ Match/reconciliation inbox
│  ├─ Receivables
│  ├─ Subscriptions
│  │  ├─ Dashboard
│  │  ├─ All subscriptions
│  │  ├─ Renewal calendar
│  │  ├─ Trial endings
│  │  ├─ Review/cancel candidates
│  │  └─ Subscription detail and payment history
│  ├─ Grow
│  │  ├─ Available surplus
│  │  ├─ Safety reserve
│  │  ├─ Monthly contribution plan
│  │  └─ Cash/investment asset overview
│  └─ Analytics
│     ├─ Monthly cash flow
│     ├─ Spending categories
│     ├─ Tutoring by student
│     ├─ Effective hourly rate
│     ├─ Fixed/subscription cost
│     └─ Asset trend
├─ Household
│  ├─ Overview
│  ├─ Fridge / Inventory
│  │  ├─ Refrigerated
│  │  ├─ Frozen
│  │  ├─ Room temperature
│  │  └─ Low stock / expiry
│  ├─ Shopping list
│  ├─ Cleaning
│  │  ├─ Due
│  │  ├─ Upcoming
│  │  └─ Completion history
│  ├─ Shared expenses
│  │  ├─ Monthly list
│  │  ├─ Add/classify expense
│  │  └─ Expense detail/splits
│  └─ Settlement
│     ├─ Net balance
│     ├─ Included expenses
│     └─ Settlement history
└─ Settings
   ├─ Profile and locale
   ├─ Household and members
   ├─ Tutoring defaults
   ├─ Categories
   ├─ Accounts
   ├─ Integrations
   │  ├─ Google Calendar
   │  └─ Bank provider / CSV import
   ├─ Notifications/reminders
   ├─ Data export/backup
   └─ Account deletion
```

## 2. Primary navigation behavior

### Mobile
Persistent bottom navigation: `홈 · 과외 · 돈 · 자취 · 설정`. A visually distinct global `+` action is available without obscuring a tab and respects safe-area insets.

### Desktop
Left sidebar with the same five destinations. Money and Household show secondary navigation. Global add appears in the app header.

## 3. Global quick-add

The action sheet adapts to context but always offers:

- New lesson
- Income
- Expense
- Process/match deposit or charge
- Inventory item
- Shared expense
- Shopping item

From a student page, new lesson/student billing is first. From Household, inventory/shared expense is first. From Money, transaction/subscription is first.

## 4. URL structure recommendation

```text
/
/tutoring/students
/tutoring/students/[studentId]
/tutoring/lessons
/tutoring/lessons/[lessonId]
/money
/money/accounts
/money/accounts/[accountId]
/money/transactions
/money/receivables
/money/subscriptions
/money/subscriptions/[subscriptionId]
/money/subscriptions/calendar
/money/grow
/money/analytics
/household
/household/inventory
/household/shopping
/household/cleaning
/household/expenses
/household/settlements
/settings/*
```

Use route groups/layouts as appropriate; URLs are a recommendation, not permission to omit pages.

## 5. Cross-link rules

- Student and lesson cards link to receivables, but the source receivable remains one Money record.
- Account transactions link to the matched domain record.
- Household expense detail may display a private transaction summary to its owner only; roommate sees payer and shared amount, not private account detail.
- Subscription occurrence links to one actual transaction and optionally one shared expense.
- Home cards are summaries and never maintain their own business state.
