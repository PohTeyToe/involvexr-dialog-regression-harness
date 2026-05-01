import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24 flex flex-col items-center text-center space-y-4">
      <span className="font-mono text-xs text-[var(--muted-foreground)]">
        404
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md">
        The page you're looking for doesn't exist. It may have been a stale link
        from the demo, or a scenario that no longer ships in this build.
      </p>
      <Button asChild>
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
