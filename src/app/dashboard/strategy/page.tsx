import { redirect } from "next/navigation";

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams(params);
  qs.set("mode", "plan");
  redirect(`/dashboard?${qs.toString()}`);
}
