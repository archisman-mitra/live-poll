export default function TransactionSteps({ status }) {
  if (!status || status === "failed") return null;

  const steps = [
    { id: "building", label: "Building" },
    { id: "signing", label: "Signing" },
    { id: "submitting", label: "Submitting" },
    { id: "confirmed", label: "Confirmed" },
  ];

  const getStepState = (stepId) => {
    const order = ["building", "signing", "submitting", "confirmed"];
    const currentIndex = order.indexOf(status);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="mt-4 flex w-full items-center justify-between rounded-xl border border-gray-800/40 bg-gray-900/30 p-4">
      {steps.map((step, idx) => {
        const state = getStepState(step.id);
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ${
                  state === "completed"
                    ? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : state === "active"
                    ? "border-blue-500 bg-blue-900/40 text-blue-400 shadow-lg shadow-blue-500/30"
                    : "border-gray-700 bg-gray-800 text-gray-500"
                }`}
              >
                {state === "completed" ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : state === "active" ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="text-xs font-semibold">{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  state === "completed" ? "text-green-400" : state === "active" ? "text-blue-400" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`mx-2 h-[2px] flex-1 rounded-full transition-all duration-500 ${
                  state === "completed" ? "bg-green-500" : "bg-gray-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
