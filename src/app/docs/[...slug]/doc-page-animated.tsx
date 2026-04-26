"use client";

import { MotionPreset } from "@/components/ui/motion-preset";

export function AnimatedDocHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionPreset fade slide={{ direction: "up", offset: 20 }} delay={0}>
      {children}
    </MotionPreset>
  );
}

export function AnimatedDocContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionPreset fade slide={{ direction: "up", offset: 30 }} delay={0.1}>
      {children}
    </MotionPreset>
  );
}

export function AnimatedDocNav({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionPreset fade slide={{ direction: "up", offset: 20 }} delay={0.25}>
      {children}
    </MotionPreset>
  );
}

export function AnimatedDocToc({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionPreset fade slide={{ direction: "right", offset: 15 }} delay={0.2}>
      {children}
    </MotionPreset>
  );
}
