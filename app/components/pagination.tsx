"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  itemName?: string; // e.g., "threadline", "check" - defaults to "item"
  onPageChange: (newPage: number) => void;
}

/**
 * Pagination component for authenticated pages
 * 
 * Displays pagination controls with:
 * - "Showing X-Y of Z" text
 * - Previous/Next buttons
 * - Page number buttons with ellipsis for large page counts
 * - Current page highlighted in green
 * 
 * Reference implementation: app/threadlines/page.tsx
 */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  itemName = "item",
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Calculate page numbers to show (current page ± 2 pages)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // Show 5 page numbers around current
    
    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show ellipsis and smart page numbers
      if (page <= 3) {
        // Near start
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        if (totalPages > 5) pages.push('...', totalPages);
      } else if (page >= totalPages - 2) {
        // Near end
        pages.push(1, '...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle
        pages.push(1, '...');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-slate-400">
        Showing {startItem}-{endItem} of {total} {itemName}{total !== 1 ? 's' : ''}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            page === 1
              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isCurrent = pageNum === page;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            page === totalPages
              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

