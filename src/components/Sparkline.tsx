/** Bieu do duong (sparkline) giong mockup - SVG khong thu vien. */
interface SparklineProps {
  values: number[];
  height?: number;
}

export function Sparkline({ values, height = 90 }: SparklineProps) {
  const width = 320;
  if (values.length < 2) {
    return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 8;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points.join(' ')} />
    </svg>
  );
}
