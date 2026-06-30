import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPromptBanner() {
  const { canInstall, isInstalled, isInstalling, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        {/* App Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            Add to Home Screen
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Install this app for quick access anytime
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              disabled={isInstalling}
              className="flex-1 bg-primary text-primary-foreground text-xs font-medium py-1.5 px-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isInstalling ? "Installing…" : "Install"}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-gray-500 py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors -mt-0.5"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Compact button variant — use in nav/sidebar */
export function InstallButton({ className = "" }: { className?: string }) {
  const { canInstall, isInstalling, install } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      disabled={isInstalling}
      className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors disabled:opacity-60 ${className}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
      </svg>
      {isInstalling ? "Installing…" : "Add to Home Screen"}
    </button>
  );
}
