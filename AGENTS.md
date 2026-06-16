# Video To PDF Coding Guide

This document defines how code should be written in this project.

The goal is:

- consistency
- readability
- maintainability
- scalability
- reusability

Every feature should follow these rules.

---

# Core Principles

## 1. Keep Things Simple

Avoid over engineering.

Do not introduce:

- unnecessary abstractions
- complex patterns
- deeply nested structures
- premature optimization

Prefer:

- readable code
- predictable structure
- explicit logic

---

# 2. Strong Type Safety

TypeScript should be used properly.

Avoid:

- any
- unknown without validation
- unsafe casting

Always:

- define types
- use zod validation
- infer types when possible

Example:

```ts
export const createMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
```

---

# 3. Reusable CRUD Pattern

Forms must follow a reusable CRUD architecture.

Preferred approach:

- shared form component
- edit mode support
- react-hook-form
- zod validation

Example:

```tsx
<MemberForm edit={!!data} defaultValues={data} />
```

Avoid:

- separate create/edit forms
- duplicated validation
- duplicated submit logic

---

# 4. Keep Components Small

A component should ideally do one thing.

Avoid:

- giant pages
- 500+ line components
- mixing UI and business logic

Extract:

- tables
- forms
- dialogs
- filters
- cards

---

# 5. Server First

Prefer:

- Server Components
- server-side fetching
- server actions later if needed

Avoid unnecessary client components.

Use "use client" only when required.

---

# 6. Feature-Based Thinking

Code should be organized around features.

Bad: components/ misc/ utils2/

Good: subscriptions/ members/ payments/

---

# 7. Validation Everywhere

Never trust frontend input.

Validate:

- forms
- API payloads
- query params

Always use zod.

---

# 8. Consistent API Responses

Every API route should return predictable responses.

Example:

```ts
{
  success: true,
  message: "Member created successfully",
  data
}
```

Error:

```ts
{
  success: false,
  message: "Validation failed"
}
```

---

# 9. Database Rules

## Important

Do NOT initialize new mongoose connection. use it only from lib/db.ts.

## DB Setup

write model.ts,services.ts and other necessary file inside a folder inside
server/modules.

## Mongoose Models

- One model per file
- Use timestamps
- Export safely to prevent overwrite

Example:

```ts
export default mongoose.models.Member || mongoose.model("Member", memberSchema);
```

---

# 10. Separation of Concerns

## Pages

Responsible for:

- layout
- fetching
- composition

## Components

Responsible for:

- UI rendering

## Services

Responsible for:

- business logic
- database queries

## Validations

Responsible for:

- schemas
- input validation

---

# Form Rules

## Required Stack

- react-hook-form
- zod
- @hookform/resolvers/zod

---

# Preferred Form Structure

Example: forms/ └── member-form.tsx

The form should:

- support create/edit
- accept defaultValues
- accept edit boolean
- contain reusable fields

---

# Table Rules

Use:

- TanStack Table

Tables should support:

- sorting
- searching
- pagination later

Avoid hardcoded table structures inside pages.

---

# UI Rules

Use:

- shadcn/ui
- TailwindCSS

Keep UI:

- clean
- spacious
- minimal

Avoid:

- random colors
- inconsistent spacing
- giant shadows
- flashy effects

---

# Styling Rules

Prefer:

- reusable utility classes
- cn() helper
- semantic spacing

Avoid:

- inline styles
- duplicated classNames

---

# Naming Rules

## Components

PascalCase

```tsx
MemberForm;
SubscriptionCard;
PaymentTable;
```

## Files

kebab-case

```txt
member-form.tsx
payment-table.tsx
```

## Variables

camelCase

## Constants

UPPER_CASE

---

# Async Rules

Always:

- use try/catch
- handle loading states
- handle empty states
- handle error states

---

# Notifications

Use toast notifications consistently.

Success:

- clear
- short

Error:

- user friendly

---

# Mail System Rules

All mail logic should live inside: lib/mail.ts

Avoid:

- mail logic inside routes
- duplicated transporter setup

---

# Environment Variables

All env variables must:

- be validated
- documented

Example:

```env
MONGODB_URI=
NEXTAUTH_SECRET=
MAIL_USER=
MAIL_PASS=
```

---

# Code Style

Preferred:

- early returns
- descriptive naming
- small functions
- explicit logic

Avoid:

- nested ternaries
- magic numbers
- long functions

---

# Performance Philosophy

Optimize only when needed.

Focus first on:

- correctness
- readability
- maintainability

---

# Long-Term Philosophy

This project should feel:

- professional
- scalable
- predictable
- easy to contribute to

Any developer joining the project should quickly understand:

- structure
- patterns
- architecture
- conventions
