import { FxProvider } from "@/components/fx/FxLayer";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { TabBar } from "@/components/ui/TabBar";
import { NameGate } from "@/components/ui/NameGate";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <FxProvider>
      <FeedbackProvider>
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
        {children}
      </main>
      <TabBar />
      <NameGate />
      </FeedbackProvider>
    </FxProvider>
  );
}
