import { FxProvider } from "@/components/fx/FxLayer";
import { MyDataProvider } from "@/data/hooks";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { TabBar } from "@/components/ui/TabBar";
import { NameGate } from "@/components/ui/NameGate";
import { UpdateWatcher } from "@/components/ui/UpdateWatcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MyDataProvider>
    <FxProvider>
      <FeedbackProvider>
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
        {children}
      </main>
      <TabBar />
      <NameGate />
      <UpdateWatcher />
      </FeedbackProvider>
    </FxProvider>
    </MyDataProvider>
  );
}
