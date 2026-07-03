import logoUrl from "@/assets/logo.svg";
import { cn } from "@/lib/utils";

interface LogicVerseLogoProps {
  className?: string;
  size?: number;
}

export function LogicVerseLogo({ className, size = 32 }: LogicVerseLogoProps) {
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
