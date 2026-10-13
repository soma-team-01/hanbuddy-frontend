"use client";

import { useRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { PhotoGalleryDialog } from "@/components/activity/PhotoGalleryDialog";
import { Avatar } from "./Avatar";

/** Opt-in photo viewing; plain Avatar stays non-interactive in cards and navigation. */
export function ZoomableAvatar(props: Readonly<ComponentProps<typeof Avatar>>) {
  const t = useTranslations("Accessibility");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (!props.src) return <Avatar {...props} />;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("enlargePhoto", { name: props.name })}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex shrink-0 cursor-zoom-in rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${props.className ?? ""}`}
      >
        <Avatar {...props} className="" />
      </button>
      {open ? (
        <PhotoGalleryDialog
          images={[props.src]}
          alt={props.name}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
