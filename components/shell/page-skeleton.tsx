import { Skeleton } from "@/components/ui/skeleton";

// Stand-in shaped like a cabinet page (title, breadcrumbs, then cards), so the page that replaces
// it lands where the placeholder was instead of jumping in from a different layout.
export function PageSkeleton() {
  return (
    <div className="dashShellPageWrapper" role="status">
      <span className="srOnly">Загружаем раздел…</span>
      <div className="dashPageHeader" aria-hidden="true">
        <div className="dashPageHeaderText">
          <Skeleton className="pageSkeletonTitle" />
          <Skeleton className="pageSkeletonCrumbs" />
        </div>
      </div>
      <div className="dashWorkspace" aria-hidden="true">
        <Skeleton className="pageSkeletonCard is-tall" />
        <div className="dashOverviewGrid">
          <Skeleton className="pageSkeletonCard" />
          <Skeleton className="pageSkeletonCard" />
        </div>
      </div>
    </div>
  );
}
