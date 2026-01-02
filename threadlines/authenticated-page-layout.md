---
id: authenticated-page-layout
version: 1.0.0
patterns:
  - "app/**/*.tsx"
  - "app/**/*.ts"
context_files:
  - "app/threadlines/page.tsx"
  - "app/dashboard/page.tsx"
  - "app/check/[id]/page.tsx"
  - "app/account/settings/page.tsx"
---

# Authenticated Page Layout Standards

## Description
All authenticated pages in the Threadline application must follow consistent layout and spacing patterns to ensure a cohesive user experience and efficient use of vertical space.

## Patterns to Check

### Section Padding
- **Required**: Use `py-12` (48px) for section padding
- **Forbidden**: Do not use `py-24` (96px) or other larger padding values
- **Pattern**: `<section className="max-w-7xl mx-auto px-6 py-12">` or `<section className="max-w-4xl mx-auto px-6 py-12">`

### Panel Padding
- **Required**: Use `p-4 md:p-6` (16px mobile, 24px desktop) for panel padding
- **Forbidden**: Do not use `p-8 md:p-12` (32px/48px) or other larger padding values
- **Pattern**: `<div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">`

### Title Margin
- **Required**: Use `mb-3` (12px) for margin below h1 titles
- **Forbidden**: Do not use `mb-6` (24px) or other larger margin values
- **Pattern**: `<h1 className="text-4xl font-bold mb-3 text-white">Title</h1>`

## Reference Implementation
See `app/threadlines/page.tsx` for the canonical example of authenticated page layout.

## Context Files
- `app/threadlines/page.tsx` - Reference implementation
- `app/dashboard/page.tsx` - Example usage
- `app/check/[id]/page.tsx` - Example usage
- `app/account/settings/page.tsx` - Example usage

## Reasoning
Consistent spacing creates a professional, cohesive user experience. The reduced padding values (halved from previous defaults) maximize vertical screen real estate while maintaining readability and visual hierarchy.

