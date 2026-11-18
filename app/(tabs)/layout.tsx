import { FxProvider } from "@/components/fx/FxLayer";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { TabBar } from "@/components/ui/TabBar";
import { DemoBanner } from "@/components/ui/DemoBanner";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FxProvider>
      <FeedbackProvider>
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
        <DemoBanner />
        {children}
      </main>
      <TabBar />
      </FeedbackProvider>
    </FxProvider>
  );
}
