import { createRoot } from "react-dom/client";
import TabsLayout from "../app/(tabs)/layout";
import HomePage from "../app/(tabs)/page";
import WorkoutPage from "../app/(tabs)/workout/page";
import RunPage from "../app/(tabs)/run/page";
import FriendsPage from "../app/(tabs)/friends/page";
import FriendDetailPage from "../app/(tabs)/friends/[id]/page";
import RankingPage from "../app/(tabs)/ranking/page";
import CharacterPage from "../app/(tabs)/character/page";
import MyPage from "../app/(tabs)/me/page";
import QuestPage from "../app/(tabs)/quest/page";
import DungeonPage from "../app/(tabs)/quest/[id]/page";
import { usePath } from "./shims/router";
import TitlesPage from "../app/(tabs)/titles/page";
import BodyPage from "../app/(tabs)/body/page";

function Router() {
  const path = usePath();
  let page = <HomePage />;
  if (path === "/workout") page = <WorkoutPage />;
  else if (path === "/run") page = <RunPage />;
  else if (path === "/friends") page = <FriendsPage />;
  else if (path.startsWith("/friends/")) page = <FriendDetailPage key={path} />;
  else if (path === "/ranking") page = <RankingPage />;
  else if (path === "/character") page = <CharacterPage />;
  else if (path === "/me") page = <MyPage />;
  else if (path === "/titles") page = <TitlesPage />;
  else if (path === "/body") page = <BodyPage />;
  else if (path === "/quest") page = <QuestPage />;
  else if (path.startsWith("/quest/")) page = <DungeonPage key={path} />;
  return <TabsLayout>{page}</TabsLayout>;
}

createRoot(document.getElementById("root")!).render(<Router />);
