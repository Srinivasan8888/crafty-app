"use client";

export type StepperProps = {
  steps: string[];
  current: number;
};

export function Stepper({ steps, current }: StepperProps) {
  const currentLabel = steps[current];

  return (
    <div>
      <div className="stepper" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1}>
        {steps.map((label, i) => {
          const state = i < current ? "done" : i === current ? "active" : "";
          return (
            <span key={`step-${i}`} className="contents">
              <span
                className={`dot${state ? ` ${state}` : ""}`}
                aria-label={label}
                aria-current={i === current ? "step" : undefined}
              >
                {i < current ? "✓" : i + 1}
              </span>
              {i < steps.length - 1 && (
                <span className={`line${i < current ? " done" : ""}`} aria-hidden="true" />
              )}
            </span>
          );
        })}
      </div>
      {currentLabel && (
        <div className="label" style={{ textAlign: "center" }}>
          Step {current + 1} of {steps.length}: {currentLabel}
        </div>
      )}
    </div>
  );
}

export default Stepper;
