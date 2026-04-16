import Image from "next/image";

type RosterlyLogoProps = {
  size?: number;
  priority?: boolean;
};

export function RosterlyLogo({ size = 40, priority = false }: RosterlyLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex-shrink-0 overflow-hidden rounded"
    >
      <Image
        src="/rosterly_logo_cropped.png"
        alt="Rosterly logo"
        fill
        sizes={`${size}px`}
        priority={priority}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
