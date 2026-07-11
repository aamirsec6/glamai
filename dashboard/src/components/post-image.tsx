"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn, POST_IMAGE_FALLBACK, resolveMediaUrl } from "@/lib/utils";

type PostImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
};

export function PostImage({ src, alt, className, imgClassName }: PostImageProps) {
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const resolved = resolveMediaUrl(src) || POST_IMAGE_FALLBACK;
  const displaySrc = failed ? POST_IMAGE_FALLBACK : resolved;

  return (
    <div className={cn("relative overflow-hidden bg-muted/20", className)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt || "Post image"}
        className={cn("h-full w-full object-cover", imgClassName)}
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
