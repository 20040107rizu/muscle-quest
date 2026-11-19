# オンライン版の公開手順（Supabase ＋ Vercel、どちらも無料）

## しくみ
- 記録は今まで通り各自の端末に保存し、変更があるたびにアプリのサーバー（`/api/sync`）へ送る。
- サーバーは経験値を記録から計算し直して Supabase に保存する（ブラウザから送られた経験値は使わない）。
- 友達＝筋トレかランを1回以上記録したプレイヤー全員（`/api/players`）。開いただけの人は出ない。
- ブラウザは Supabase に直接さわれない（RLS で全部禁止）。秘密の鍵は Vercel のサーバーの中だけにある。
- 体重・体の写真・メニューはサーバーに送らない。

## 1. Supabase（データベース）
1. https://supabase.com で登録し「New project」。名前は muscle-quest、地域は Tokyo（Northeast Asia）。
2. 左の「SQL Editor」で `supabase/online_setup.sql` の①②③を1つずつ貼って「Run」（何度実行しても大丈夫）。
3. 左下の「Project Settings」→「Data API」で **Project URL** を控える。
4. 「Project Settings」→「API Keys」で **Secret key**（sb_secret_…）を控える。
   見当たらなければ「Legacy API Keys」の **service_role** でもよい。
   ※ この鍵は秘密。チャットや画面共有に出さない。

## 2. Vercel（アプリの置き場）
1. https://vercel.com で「Continue with GitHub」で登録。
2. 「Add New…」→「Project」→ リポジトリ `muscle-quest` を「Import」。
3. 「Environment Variables」に2つ登録:
   - `SUPABASE_URL` = 手順1-3の Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = 手順1-4の鍵
4. 「Deploy」。できあがった URL（例: https://muscle-quest-xxxx.vercel.app）が公開URL。
   誰でもログインなしで開ける。

## メモ
- `supabase/migrations/` の 0001・0002 は、将来ログイン機能を入れるときの設計案。オンライン版で使うのは `online_setup.sql` だけ。
- claude.ai のプレビュー版（`preview/`）はサーバーが無いので、端末だけで動く版になる（`NEXT_PUBLIC_MQ_OFFLINE=1`）。

## 実際の公開（Render を使った）
- 公開URL: https://muscle-quest.onrender.com
- Render の Web Service「muscle-quest」（無料プラン・シンガポール）。このブランチに push すると自動で公開し直す。
  - ビルド: `npm ci && npm run build` / 起動: `npm start`
  - 環境変数: `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（Supabase の Secret key）、`NODE_VERSION=22`
- 無料プランは15分ほど誰も開かないと止まり、次に開くとき30秒〜1分かかる。
- Supabase のプロジェクトは「muscle-quest」（Tokyo）。
- 応援と1週間対決を相手に届けるため、`supabase/online_social.sql` も実行済み（`online_setup.sql` のあとに実行する）。
- プロフィール写真のため `supabase/online_avatar.sql` も実行済み（online_social.sql のあと）。
