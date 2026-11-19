/** 選んだ写真を、真ん中で正方形に切り抜いて小さな JPEG（data URL）にする */
export async function makeAvatar(file: File, size = 192): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("写真を読み込めませんでした"));
      i.src = url;
    });
    const side = Math.min(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
