export function getPercentile(data: number[], percentile: number) {
  const sortedData = data.toSorted();
  return sortedData[Math.ceil(percentile * sortedData.length) - 1];
}
