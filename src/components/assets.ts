/**
 * public/ 以下の画像の URL。
 * プレビュー版（preview/build.mjs）ではこのモジュールが差し替わり、画像が data URI で埋め込まれる。
 */
export function assetUrl(path: string): string {
  return `/${path}`;
}
