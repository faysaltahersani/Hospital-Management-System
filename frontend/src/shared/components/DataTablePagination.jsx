const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export function DataTablePagination({
  isLoading = false,
  limit,
  onLimitChange,
  onPageChange,
  page,
  totalItems,
  totalPages,
}) {
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, totalItems);

  return (
    <div className="flex items-center justify-end gap-6 px-6 py-4 text-[15px] text-[#4e5962] max-sm:flex-wrap max-sm:justify-center">
      <label className="flex items-center gap-2">
        <span>Rows per page</span>
        <select
          aria-label="Rows per page"
          className="rounded-[4px] border border-[#cfd9de] bg-white px-2 py-1 font-medium text-[#1f2c33] outline-none focus:border-[#1976d2] disabled:opacity-50"
          disabled={isLoading}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          value={limit}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div aria-live="polite">{`${rangeStart}-${rangeEnd} of ${totalItems}`}</div>

      <div className="flex items-center gap-4 text-[#65727d]">
        <button
          aria-label="Previous page"
          className="rounded p-1 hover:bg-[#f0f4f7] disabled:cursor-not-allowed disabled:opacity-35"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M9.8 3.2 5 8l4.8 4.8 1.4-1.4L7.8 8l3.4-3.4-1.4-1.4Z" />
          </svg>
        </button>
        <button
          aria-label="Next page"
          className="rounded p-1 hover:bg-[#f0f4f7] disabled:cursor-not-allowed disabled:opacity-35"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="m6.2 3.2-1.4 1.4L8.2 8l-3.4 3.4 1.4 1.4L11 8 6.2 3.2Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
