import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Chargement des transactions">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full rounded-xl" />
        </CardContent>
      </Card>

      <Skeleton className="h-4 w-40" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Skeleton className="h-10 min-w-64 flex-1" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-64" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-8">
                <Skeleton className="hidden h-6 w-28 md:block" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
