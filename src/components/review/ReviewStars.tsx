import { StarIcon } from "@/components/ui/icons";

export const MAX_REVIEW_RATING = 5;

const STARS = Array.from({ length: MAX_REVIEW_RATING }, (_, index) => index + 1);

/** 읽기 전용 별 5개 표시. 점수 자체는 aria-label로만 전달한다 */
export function ReviewStars({
  rating,
  label,
  className = "",
  starClassName = "size-4",
}: Readonly<{
  rating: number;
  label: string;
  className?: string;
  starClassName?: string;
}>) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={label}>
      {STARS.map((star) => (
        <StarIcon
          key={star}
          aria-hidden="true"
          className={`${starClassName} ${star <= rating ? "text-primary" : "text-line-strong"}`}
        />
      ))}
    </span>
  );
}
