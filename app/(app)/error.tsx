"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] p-8 text-center gap-4 max-w-sm mx-auto">
      <h2 className="font-bold text-xl">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred on this page.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Go home</Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
