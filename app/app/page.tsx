import { requireChatGPTUser } from "../chatgpt-auth";
import FunctionalEduAIApp from "../ui/FunctionalEduAIApp";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  await requireChatGPTUser("/app");
  return <FunctionalEduAIApp />;
}
