import Image from "next/image";

export default function AntigravityEnterpriseBadge({
  size = "lg",
}: {
  size?: "sm" | "lg";
}) {
  const logoSize = size === "lg" ? 72 : 48;
  const title = size === "lg" ? "text-4xl md:text-5xl lg:text-6xl" : "text-2xl md:text-3xl";

  return (
    <div className="inline-flex items-center gap-4 md:gap-5">
      <Image
        src="/antigravity-logo.png"
        alt="Antigravity"
        width={logoSize}
        height={logoSize}
        className={`shrink-0 rounded-2xl ${size === "lg" ? "h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]" : "h-12 w-12"}`}
        priority
      />
      <p className={`${title} font-semibold tracking-tight text-text leading-tight`}>
        Antigravity{" "}
        <span className="text-text-secondary font-medium">Enterprise</span>
      </p>
    </div>
  );
}
