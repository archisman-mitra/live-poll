export default function DonutChart({ javaVotes, pythonVotes }) {
  const total = javaVotes + pythonVotes;
  if (total === 0) return null;

  const javaPct = javaVotes / total;
  const pythonPct = pythonVotes / total;

  // SVG parameters
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  const javaDash = javaPct * circumference;
  const pythonDash = pythonPct * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1f2937" /* gray-800 */
            strokeWidth={strokeWidth}
          />

          {/* Java segment */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#3b82f6" /* blue-500 */
            strokeWidth={strokeWidth}
            strokeDasharray={`${javaDash} ${circumference}`}
            strokeDashoffset={0}
            className="transition-all duration-1000 ease-out"
          />

          {/* Python segment */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#10b981" /* emerald-500 */
            strokeWidth={strokeWidth}
            strokeDasharray={`${pythonDash} ${circumference}`}
            strokeDashoffset={-javaDash}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-gray-400">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-gray-300">Java ({Math.round(javaPct * 100)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-gray-300">Python ({Math.round(pythonPct * 100)}%)</span>
        </div>
      </div>
    </div>
  );
}
