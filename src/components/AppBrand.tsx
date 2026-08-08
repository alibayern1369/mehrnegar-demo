"use client";

type Props = {
  logo?: string | null;
  name?: string;
  /** Tailwind size classes for the mark box, e.g. h-10 w-10 */
  sizeClass?: string;
  textClass?: string;
  showText?: boolean;
  subtitle?: string;
  className?: string;
};

/** Software brand mark — image logo or fallback letter */
export function AppBrand({
  logo,
  name = "مهرنگار",
  sizeClass = "h-10 w-10",
  textClass = "text-sm",
  showText = true,
  subtitle,
  className = "",
}: Props) {
  const letter = (name || "م").trim().charAt(0) || "م";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`grid shrink-0 place-items-center overflow-hidden ${sizeClass} ${
          logo
            ? ""
            : "rounded-2xl grad-brand text-white shadow-lg"
        }`}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} className="h-full w-full object-contain" />
        ) : (
          <span className={`font-black ${textClass}`}>{letter}</span>
        )}
      </div>
      {showText && (
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold text-strong">{name}</p>
          {subtitle && <p className="truncate text-[11px] text-muted">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
