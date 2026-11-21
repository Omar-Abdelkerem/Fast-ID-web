// Dark mode for the shared components (FormField, PageHeader, EmptyState...), which this feature does not own.
// Put it on the root element of a page.
export const darkScope =
  "dark:[&_.label]:text-[#E8F0FE] dark:[&_.page-title]:text-white dark:[&_.card]:bg-[#1b2048] dark:[&_.card]:border-[#2f3670] " +
  "dark:[&_.btn-secondary]:bg-transparent dark:[&_.btn-secondary]:text-[#E8F0FE] dark:[&_.btn-secondary]:border-[#8da0ff]";
