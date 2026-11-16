# MUSCLE QUEST 開発メモ

- 画面は `src/data/hooks.ts` の `getRepo()` / `useMyData()` 経由でのみデータに触る。Dexie を直接触らない。
- 経験値の計算ロジックは `src/domain/` に集約。画面側では「獲得予定」のプレビュー表示にのみ使い、確定値は Repository の保存結果を使う。
- `useLiveQuery` 内は読み取り専用。書き込み（初期化を含む）は `init()` などイベント/Effect 側で行う。
- App Router の page ファイルから default 以外を export しない（ビルドエラーになる）。
- 変更後は `npm test` と `npm run build` を通すこと。
