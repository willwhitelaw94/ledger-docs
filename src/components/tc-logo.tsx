import { cn } from "@/lib/utils";

export function TcLogo({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "size-6",
    default: "size-8",
    lg: "size-10",
  };

  return (
    <img
      src="/icon.png"
      alt="TC-Docs"
      className={cn(sizeClasses[size], "rounded", className)}
    />
  );
}
