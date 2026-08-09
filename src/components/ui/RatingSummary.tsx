import { useTranslations } from "next-intl";
import { StarIcon } from "@/components/ui/icons";

const SIZE_CLASSES = {
  sm: { star: "size-3.5", text: "text-sm leading-5" },
  md: { star: "size-4", text: "text-base leading-6" },
} as const;

/** 소수 첫째 자리까지만 보여준다. 백엔드도 같은 자리에서 반올림해 내려준다 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * `★ 4.8 (12)` 형태의 별점 요약.
 * 리뷰가 없으면(=`rating`이 null) 아무것도 렌더링하지 않는다.
 */
export function RatingSummary({
  rating,
  reviewCount,
  size = "sm",
  className = "",
}: Readonly<{
  rating: number | null | undefined;
  reviewCount?: number | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}>) {
  const t = useTranslations("Reviews");

  if (rating === null || rating === undefined) return null;

  const classes = SIZE_CLASSES[size];
  const formatted = formatRating(rating);

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold text-ink ${classes.text} ${className}`}
      aria-label={t("ratingAria", { rating: formatted })}
    >
      <StarIcon className={`${classes.star} shrink-0 text-primary`} />
      <span aria-hidden="true">{formatted}</span>
      {reviewCount ? (
        <span className="font-medium text-muted" aria-hidden="true">
          ({reviewCount})
        </span>
      ) : null}
    </span>
  );
}
