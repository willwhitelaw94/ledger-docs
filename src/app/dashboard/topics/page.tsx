import { getDomainTopics } from "@/lib/domain-topics";
import { TopicsClient } from "./topics-client";

export default function TopicsPage() {
  const categories = getDomainTopics();
  return <TopicsClient categories={categories} />;
}
