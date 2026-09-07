import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      alt="REIN"
      className={cn("h-auto w-full", className)}
      height={509}
      priority={priority}
      src="/rein-logo.png"
      unoptimized
      width={871}
    />
  );
}
