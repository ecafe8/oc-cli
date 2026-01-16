import chroma from "chroma-js";

export const getRandomAvatarColors = (
  color?: string,
): {
  bgColor: string;
  textColor: string;
} => {
  const bgColor = color ?? chroma.random().hex();
  const luminance = chroma(bgColor).luminance();
  const textColor = luminance > 0.5 ? "#222" : "#fff";
  return { bgColor, textColor };
};

export const getRandomDarkColors = (): string => {
  // 生成一个随机的RGB颜色
  const randomRGB = chroma.random().hex();

  // 将颜色转换为深色背景
  const deepColor = chroma(randomRGB).darken(50).brighten(20).hex();

  return deepColor;
};

const memoColors = new Map<
  string,
  {
    bgColor: string;
    textColor: string;
  }
>();
export const getMemoColor = (text: string) => {
  const memoColor = memoColors.get(text);
  if (memoColor) {
    return memoColor;
  }
  const { bgColor, textColor } = getRandomAvatarColors();
  memoColors.set(text, { bgColor, textColor });
  return { bgColor, textColor };
};
