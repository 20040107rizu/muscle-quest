import Dexie, { type Table } from "dexie";
import type { Exercise, Profile, QuestAttempt, QuestClear, RunRecord, WorkoutEntry, XpEvent } from "@/domain/types";
import type { Reaction } from "../repository";

export interface FriendshipRow {
  userId: string;
  createdAt: number;
}

/** 端末内DB。テーブル構成は supabase/migrations のスキーマと対応させている */
export class MuscleQuestDB extends Dexie {
  profile!: Table<Profile, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<WorkoutEntry, string>;
  runs!: Table<RunRecord, string>;
  xpEvents!: Table<XpEvent, string>;
  friendships!: Table<FriendshipRow, string>;
  reactions!: Table<Reaction, string>;
  questClears!: Table<QuestClear, string>;
  questAttempts!: Table<QuestAttempt, string>;

  constructor(name = "muscle-quest") {
    super(name);
    this.version(1).stores({
      profile: "id",
      exercises: "id",
      workouts: "id, date, exerciseId, createdAt",
      runs: "id, date, createdAt",
      xpEvents: "id, date, sourceType, sourceId",
      friendships: "userId",
      reactions: "id, activityId",
    });
    this.version(2).stores({ questClears: "id, dungeonId" });
    this.version(3).stores({ questAttempts: "id" });
  }
}
