import { createRoot } from "react-dom/client";
import { AppShell as TabsLayout } from "../src/components/AppShell";
import HomePage from "../app/page";
import WorkoutPage from "../app/workout/page";
import RunPage from "../app/run/page";
import FriendsPage from "../app/friends/page";
import FriendDetailPage from "../app/friends/[id]/page";
import RankingPage from "../app/ranking/page";
import CharacterPage from "../app/character/page";
import MyPage from "../app/me/page";
import QuestPage from "../app/quest/page";
import DungeonPage from "../app/quest/[id]/page";
import { usePath } from "./shims/router";
import TitlesPage from "../app/titles/page";
import BodyPage from "../app/body/page";

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
