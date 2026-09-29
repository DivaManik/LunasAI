import Image from "next/image";

export function LogoMoon({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/images/lunasai-app-icon.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}
