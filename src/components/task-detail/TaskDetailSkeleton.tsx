
import { Skeleton } from '@/components/ui/skeleton';

const TaskDetailSkeleton = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
        </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
        </div>
    </div>
);

export default TaskDetailSkeleton;
