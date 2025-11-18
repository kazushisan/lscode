export const forwardMatch = (content: string, keyword: string): number[] => {
  if (!keyword) {
    return [];
  }

  const positions: number[] = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    const index = content.indexOf(keyword, currentIndex);

    if (index === -1) {
      break;
    }

    positions.push(index);
    currentIndex = index + 1;
  }

  return positions;
};
