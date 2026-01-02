---
id: pagination-pattern
version: 1.0.0
patterns:
  - "app/**/*.tsx"
  - "app/**/*.ts"
  - "app/api/**/*.ts"
context_files:
  - "app/threadlines/page.tsx"
  - "app/api/threadlines/route.ts"
  - "app/components/pagination.tsx"
---

# Pagination Pattern Standards

## Description
All paginated pages in the Threadline application must follow consistent pagination patterns for both UI components and API endpoints to ensure a uniform user experience.

## UI Pattern

### Component Usage
- **Required**: Use the `<Pagination>` component from `app/components/pagination.tsx`
- **Forbidden**: Do not create custom pagination implementations
- **Pattern**: 
  ```tsx
  import { Pagination } from "../components/pagination";
  
  <Pagination
    page={pagination.page}
    totalPages={pagination.totalPages}
    total={pagination.total}
    limit={pagination.limit}
    itemName="threadline" // or "check", etc.
    onPageChange={handlePageChange}
  />
  ```

### URL State
- **Required**: Use URL query parameters for pagination state (`?page=2`)
- **Required**: Use `useSearchParams` from `next/navigation` to read page from URL
- **Required**: Use `router.push()` to update URL when page changes
- **Pattern**: `router.push(`/endpoint?page=${newPage}`)`

### Page Size
- **Required**: Use fixed page size of 20 items per page
- **Forbidden**: Do not use variable or user-configurable page sizes
- **Pattern**: `limit=20` in API calls

## API Pattern

### Query Parameters
- **Required**: Accept `page` query parameter (defaults to 1)
- **Required**: Accept `limit` query parameter (defaults to 20, max 100)
- **Pattern**: 
  ```typescript
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  ```

### SQL Query
- **Required**: Use `COUNT(*) OVER()` for total count in a single query
- **Required**: Use `LIMIT` and `OFFSET` for pagination
- **Pattern**:
  ```sql
  SELECT 
    -- columns
    COUNT(*) OVER() as total_count
  FROM table
  WHERE conditions
  ORDER BY column DESC
  LIMIT $limit OFFSET $offset
  ```

### Response Format
- **Required**: Return pagination metadata object
- **Required**: Include `page`, `limit`, `total`, `totalPages` in response
- **Pattern**:
  ```typescript
  return NextResponse.json({
    items: result.rows.map(...),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
  ```

## Reference Implementation
See `app/threadlines/page.tsx` and `app/api/threadlines/route.ts` for the canonical example of pagination implementation.

## Context Files
- `app/threadlines/page.tsx` - UI reference implementation
- `app/api/threadlines/route.ts` - API reference implementation
- `app/components/pagination.tsx` - Pagination component

## Reasoning
Consistent pagination patterns ensure users have a predictable experience across all paginated pages. Using a shared component reduces code duplication and makes it easier to maintain and update pagination behavior. URL-based state allows users to bookmark specific pages and share links.

