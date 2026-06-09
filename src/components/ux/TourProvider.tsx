import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Joyride,
  STATUS,
  type Step,
  type TooltipRenderProps,
  type EventData,
} from 'react-joyride';

/* ── localStorage keys ────────────────────────────────── */
const TOUR_COMPLETED_KEY = 'fieldflow-tour-completed';
const TOUR_PENDING_KEY = 'fieldflow-tour-pending';

/* ── Tour steps ───────────────────────────────────────── */
const tourSteps: Step[] = [
  {
    target: '[data-tour="nav-pipeline"]',
    title: 'Your Client Pipeline',
    content:
      'All your clients live here, organized by project stage — from first lead to completed installation.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="add-client"]',
    title: 'Add New Clients',
    content:
      'Start by adding a lead. Fill in basic info and they\'ll appear on your pipeline board instantly.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="pipeline-board"]',
    title: 'Drag to Advance',
    content:
      'Drag client cards between columns as projects progress through stages, or use the stage selector on a client\'s detail page.',
    placement: 'top',
  },
  {
    target: '[data-tour="nav-archive"]',
    title: 'Client Archive',
    content:
      'Completed or paused projects move here. You can always restore them to the pipeline later.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-settings"]',
    title: 'Business Settings',
    content:
      'Set up your business profile for invoice PDFs and connect Google Calendar to sync milestones.',
    placement: 'right',
  },
];

/* ── Custom tooltip ───────────────────────────────────── */
function TourTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="w-80 rounded-lg border border-border bg-card p-5 shadow-lg"
    >
      {step.title && (
        <h3 className="font-heading text-sm font-bold tracking-tight mb-1">
          {step.title as string}
        </h3>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {step.content}
      </p>

      <div className="flex items-center justify-between mt-4">
        {/* Left: skip */}
        {!isLastStep && (
          <button
            {...skipProps}
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
        )}
        {isLastStep && <span />}

        {/* Right: back / next */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {index + 1}/{size}
          </span>
          {index > 0 && (
            <button
              {...backProps}
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isLastStep ? 'Done' : 'Next'}
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        {...closeProps}
        type="button"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close tour"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ── Context ──────────────────────────────────────────── */
interface TourContextValue {
  startTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

/* ── Provider ─────────────────────────────────────────── */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const [run, setRun] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-start tour when landing on /pipeline for the first time (or after replay)
  useEffect(() => {
    if (location.pathname !== '/pipeline') return;

    const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
    const pending = localStorage.getItem(TOUR_PENDING_KEY) === 'true';

    if (!completed || pending) {
      localStorage.removeItem(TOUR_PENDING_KEY);
      const timer = setTimeout(() => setRun(true), 700);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Handle tour events
  const handleEvent = useCallback((data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      setRun(false);
    }
  }, []);

  // Replay from settings — navigate to pipeline, set pending flag
  const startTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    localStorage.setItem(TOUR_PENDING_KEY, 'true');
    if (location.pathname === '/pipeline') {
      // Already on pipeline — start directly
      localStorage.removeItem(TOUR_PENDING_KEY);
      setTimeout(() => setRun(true), 300);
    } else {
      navigate('/pipeline');
    }
  }, [location.pathname, navigate]);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      <Joyride
        run={run}
        steps={tourSteps}
        continuous
        scrollToFirstStep
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        options={{
          skipBeacon: true,
          buttons: ['back', 'skip', 'close', 'primary'],
          overlayClickAction: false,
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(var(--card))',
        }}
      />
    </TourContext.Provider>
  );
}
