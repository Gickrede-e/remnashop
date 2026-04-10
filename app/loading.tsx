import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="appStatePage">
      <div className="appStateSkeletonStack">
        <Skeleton className="appStateSkeletonHero" />
        <Skeleton className="appStateSkeletonCanvas" />
      </div>
    </div>
  );
}
