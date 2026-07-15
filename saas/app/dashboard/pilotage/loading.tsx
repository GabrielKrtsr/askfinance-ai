import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getT } from "@/lib/i18n/server";

function WidgetSkeleton({ chart = false }: { chart?: boolean }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {chart ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function PilotageLoading() {
  const { t } = getT();
  return (
    <div className="space-y-6" role="status" aria-label={t("pages.loadingPilotage")}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <WidgetSkeleton />
      <WidgetSkeleton chart />
      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
      <span className="sr-only">{t("pages.loading")}</span>
    </div>
  );
}
