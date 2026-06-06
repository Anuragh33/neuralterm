import { Bot, Check, KeyRound, SquareTerminal } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

const steps = [
  {
    icon: SquareTerminal,
    title: 'Real terminal workspaces',
    body: 'Create named shell sessions, organize them by workspace, and split terminals side by side.',
  },
  {
    icon: Bot,
    title: 'AI context when it matters',
    body: 'NeuralTerm watches opted-in terminals for failures and can attach the output to Claude Code.',
  },
  {
    icon: KeyRound,
    title: 'Bring your Anthropic key',
    body: 'Add an API key in Settings. The desktop app stores it in your operating system keychain.',
  },
];

export function Onboarding() {
  const complete = useSettingsStore((state) => state.onboardingComplete);
  const setComplete = useSettingsStore((state) => state.setOnboardingComplete);
  const [step, setStep] = useState(0);
  if (complete) return null;

  const item = steps[step];
  const Icon = item.icon;
  const last = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-[#111118] shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="text-xs font-semibold uppercase text-[#7f77dd]">Welcome to NeuralTerm</div>
          <div className="mt-1 text-sm text-secondary">Step {step + 1} of {steps.length}</div>
        </div>
        <div className="p-6">
          <div className="grid h-12 w-12 place-items-center rounded-md border border-border bg-active text-[#b09ee0]">
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-primary">{item.title}</h1>
          <p className="mt-2 text-sm leading-6 text-secondary">{item.body}</p>
        </div>
        <div className="flex items-center gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="text-xs text-secondary hover:text-primary"
            onClick={() => setComplete(true)}
          >
            Skip
          </button>
          <button
            type="button"
            className="ml-auto rounded-md bg-[#7f77dd] px-4 py-2 text-sm font-medium text-white hover:bg-[#9188ef]"
            onClick={() => (last ? setComplete(true) : setStep((value) => value + 1))}
          >
            {last ? (
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Start working</span>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
