import { useState } from 'react';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileDown,
  Loader2,
  ArrowLeft,
  Send,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { challengesApi, type StepGenerationResponse } from '../lib/api/challenges';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const STEP_LABELS: Record<number, string> = {
  1: 'Widen',
  2: 'Diagnose',
  3: 'Converge',
  4: 'Select & Create Brief',
  5: 'Build',
  6: 'Test & Showcase',
};

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Rapidly surface personas, pains, workarounds, metrics, insights, and risks related to the challenge.',
  2: 'Drill into the chosen pain using Five Whys, hypotheses, disproof evidence, and quick tests for validation.',
  3: 'Cluster ideas into three options, score impact and do-ability, and recommend one with metrics for leadership.',
  4: 'Create a one-page brief with users, problem, flow, screens, sample copy, and data to enable rapid prototyping.',
  5: 'Generate a platform-specific builder prompt from the brief — flows, components, data, metrics, and constraints for the first-cut prototype.',
  6: 'Generate an executive summary with testing insights, deployment notes, and next-step recommendations.',
};

const STEP_COLORS: Record<number, string> = {
  1: 'text-violet-500',
  2: 'text-blue-500',
  3: 'text-emerald-500',
  4: 'text-amber-500',
  5: 'text-rose-500',
  6: 'text-cyan-500',
};

const STEP_BG: Record<number, string> = {
  1: 'bg-violet-500/10 border-violet-500/20',
  2: 'bg-blue-500/10 border-blue-500/20',
  3: 'bg-emerald-500/10 border-emerald-500/20',
  4: 'bg-amber-500/10 border-amber-500/20',
  5: 'bg-rose-500/10 border-rose-500/20',
  6: 'bg-cyan-500/10 border-cyan-500/20',
};

const STEP_BADGE_BG: Record<number, string> = {
  1: 'bg-violet-500',
  2: 'bg-blue-500',
  3: 'bg-emerald-500',
  4: 'bg-amber-500',
  5: 'bg-rose-500',
  6: 'bg-cyan-500',
};

export function BusinessChallengePlanner() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isLight = theme === 'light';

  const [customerName, setCustomerName] = useState('');
  const [customerAbout, setCustomerAbout] = useState('');
  const [challenge, setChallenge] = useState('');
  const [steps, setSteps] = useState<StepGenerationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge.trim()) {
      toast.error('Please describe the business challenge before submitting.');
      return;
    }

    setLoading(true);
    try {
      const result = await challengesApi.generateStandalonePrompts(
        challenge.trim(),
        customerName.trim(),
        customerAbout.trim(),
      );
      setSteps(result);
      setSubmitted(true);
      setExpandedSteps(new Set([1]));
      toast.success('Six-stage prompts generated successfully!');
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast.error('Failed to generate prompts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSteps([]);
    setExpandedSteps(new Set([1]));
  };

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(stepNumber) ? next.delete(stepNumber) : next.add(stepNumber);
      return next;
    });
  };

  const copyToClipboard = async (content: string, stepNumber: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStep(stepNumber);
      toast.success(`Step ${stepNumber} prompt copied`);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const exportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-ups are blocked. Please allow pop-ups and try again.');
      return;
    }

    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const stepsHtml = steps
      .map(s => {
        const label = STEP_LABELS[s.step_number] ?? s.step_name;
        return `
          <div class="step">
            <div class="step-header">
              <span class="step-badge step-${s.step_number}">${s.step_number}</span>
              <div>
                <div class="step-title">${escape(label)}</div>
                <div class="step-desc">${escape(STEP_DESCRIPTIONS[s.step_number] ?? '')}</div>
              </div>
            </div>
            <pre class="step-content">${escape(s.content)}</pre>
          </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Business Challenge Planner${customerName ? ` — ${customerName}` : ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; padding: 32px 40px; }
    .cover { margin-bottom: 36px; border-bottom: 2px solid #7c3aed; padding-bottom: 24px; }
    .cover h1 { font-size: 22pt; font-weight: 700; color: #7c3aed; margin-bottom: 4px; }
    .cover .subtitle { font-size: 10pt; color: #666; margin-bottom: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .meta-box { background: #f5f3ff; border: 1px solid #ede9fe; border-radius: 8px; padding: 12px 16px; }
    .meta-box.wide { grid-column: 1 / -1; }
    .meta-label { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed; margin-bottom: 4px; }
    .meta-value { font-size: 10pt; color: #1a1a2e; white-space: pre-wrap; line-height: 1.5; }
    .step { margin-bottom: 28px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .step-header { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; background: #fafafa; border-bottom: 1px solid #e5e7eb; }
    .step-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; font-size: 11pt; font-weight: 700; color: #fff; flex-shrink: 0; }
    .step-1 { background: #7c3aed; }
    .step-2 { background: #3b82f6; }
    .step-3 { background: #10b981; }
    .step-4 { background: #f59e0b; }
    .step-5 { background: #ef4444; }
    .step-6 { background: #06b6d4; }
    .step-title { font-size: 12pt; font-weight: 600; color: #111; }
    .step-desc { font-size: 9pt; color: #555; margin-top: 2px; line-height: 1.4; }
    .step-content { font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: #222; background: #fdfdfd; padding: 16px 18px; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 8pt; color: #aaa; display: flex; justify-content: space-between; }
    h2 { font-size: 14pt; font-weight: 600; color: #1a1a2e; margin: 28px 0 14px; }
    @media print {
      body { padding: 20px 28px; }
      .step { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>Business Challenge Planner</h1>
    <div class="subtitle">Six-stage AI workshop prompts — generated ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="meta-grid">
      ${customerName ? `<div class="meta-box"><div class="meta-label">Customer / Company</div><div class="meta-value">${escape(customerName)}</div></div>` : ''}
      ${customerAbout ? `<div class="meta-box${!customerName ? ' wide' : ''}"><div class="meta-label">About the Customer</div><div class="meta-value">${escape(customerAbout)}</div></div>` : ''}
      <div class="meta-box wide"><div class="meta-label">Business Challenge</div><div class="meta-value">${escape(challenge)}</div></div>
    </div>
  </div>

  <h2>Six-Stage Prompts</h2>
  ${stepsHtml}

  <div class="footer">
    <span>Qbrain AI Labs — Business Challenge Planner</span>
    <span>Confidential</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className={`min-h-screen px-4 py-10 ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/facilitator/dashboard')}
            className={`p-2 rounded-lg transition-colors ${
              isLight ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-surface-700 text-gray-400'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-violet/10">
              <Lightbulb className="w-6 h-6 text-brand-violet" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Business Challenge Planner
              </h1>
              <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Enter customer details and challenge to get AI-tailored prompts for each of the six stages
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div
              className={`rounded-2xl border p-8 shadow-sm ${
                isLight ? 'bg-white border-gray-200' : 'bg-surface-800/80 border-white/10'
              }`}
            >

              {/* Customer Name */}
              <div className="mb-5">
                <label
                  htmlFor="customer-name"
                  className={`block text-sm font-semibold mb-1.5 ${isLight ? 'text-gray-800' : 'text-white'}`}
                >
                  Customer Name
                  <span className={`ml-1.5 font-normal ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>(optional)</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  maxLength={120}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet transition-shadow ${
                    isLight
                      ? 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                      : 'bg-surface-700 border-white/10 text-gray-100 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* About the Customer */}
              <div className="mb-5">
                <label
                  htmlFor="customer-about"
                  className={`block text-sm font-semibold mb-1.5 ${isLight ? 'text-gray-800' : 'text-white'}`}
                >
                  About the Customer
                  <span className={`ml-1.5 font-normal ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>(domain, industry, offerings)</span>
                </label>
                <textarea
                  id="customer-about"
                  value={customerAbout}
                  onChange={e => setCustomerAbout(e.target.value)}
                  placeholder="e.g. Acme is a mid-size logistics company operating in Australia. They manage a fleet of 500 vehicles and run a real-time tracking platform for B2B clients across retail and healthcare..."
                  rows={4}
                  maxLength={1000}
                  className={`w-full px-4 py-3 rounded-xl border text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-violet transition-shadow ${
                    isLight
                      ? 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                      : 'bg-surface-700 border-white/10 text-gray-100 placeholder-gray-500'
                  }`}
                />
                <div className={`text-right mt-1 text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                  {customerAbout.length}/1000
                </div>
              </div>

              {/* Business Challenge */}
              <div className="mb-2">
                <label
                  htmlFor="challenge-input"
                  className={`block text-sm font-semibold mb-1.5 ${isLight ? 'text-gray-800' : 'text-white'}`}
                >
                  Business Challenge
                  <span className={`ml-1.5 font-normal text-rose-500`}>*</span>
                </label>
                <p className={`text-xs mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Be as specific as possible — the more context you provide, the richer the stage prompts will be.
                </p>
                <textarea
                  id="challenge-input"
                  value={challenge}
                  onChange={e => setChallenge(e.target.value)}
                  placeholder="e.g. Our customer onboarding process takes 3–5 days and involves manual document collection, leading to high drop-off rates and poor first impressions. We need to redesign the end-to-end onboarding journey to reduce time-to-value for new customers while maintaining compliance requirements..."
                  rows={8}
                  maxLength={3000}
                  className={`w-full px-4 py-3 rounded-xl border text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-violet transition-shadow ${
                    isLight
                      ? 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                      : 'bg-surface-700 border-white/10 text-gray-100 placeholder-gray-500'
                  }`}
                />
                <div className="flex justify-between items-center mt-1 mb-6">
                  <span className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    {challenge.length}/3000 characters
                  </span>
                  {challenge.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setChallenge('')}
                      className={`text-xs underline ${isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Six-stage preview */}
              <div
                className={`rounded-xl border p-4 mb-6 ${
                  isLight ? 'bg-gray-50 border-gray-200' : 'bg-surface-700/40 border-white/10'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Six stages that will be generated
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-mono ${STEP_COLORS[n]}`}>{n}</span>
                      <span className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                        {STEP_LABELS[n]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading || !challenge.trim()}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {loading ? 'Generating Prompts…' : 'Submit Challenge'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          /* Results View */
          <div className="space-y-6">

            {/* Summary banner */}
            <div
              className={`rounded-2xl border p-5 ${
                isLight ? 'bg-white border-gray-200' : 'bg-surface-800/80 border-white/10'
              }`}
            >
              {/* Customer + Challenge info */}
              <div className="mb-4">
                {customerName && (
                  <div className="mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      Customer
                    </span>
                    <p className={`text-sm font-semibold mt-0.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {customerName}
                    </p>
                  </div>
                )}
                {customerAbout && (
                  <div className="mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      About
                    </span>
                    <p className={`text-sm mt-0.5 line-clamp-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      {customerAbout}
                    </p>
                  </div>
                )}
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Business Challenge
                  </span>
                  <p className={`text-sm mt-0.5 leading-relaxed line-clamp-3 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                    {challenge}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className={`flex items-center gap-2 flex-wrap pt-3 border-t border-dashed ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                <Button
                  variant="secondary"
                  onClick={exportAsPdf}
                  className="flex items-center gap-2 text-xs px-3 py-2"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export as PDF
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="flex items-center gap-2 text-xs px-3 py-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Edit / New Challenge
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSubmitted(false);
                    setSteps([]);
                    setCustomerName('');
                    setCustomerAbout('');
                    setChallenge('');
                    setExpandedSteps(new Set([1]));
                  }}
                  className="flex items-center gap-2 text-xs px-3 py-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Start Fresh
                </Button>
              </div>
            </div>

            {/* Stage cards */}
            <div className="space-y-3">
              <h2 className={`text-base font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                Six-Stage Prompts
              </h2>

              {steps.map(step => {
                const isExpanded = expandedSteps.has(step.step_number);
                const label = STEP_LABELS[step.step_number] ?? step.step_name;
                const isCopied = copiedStep === step.step_number;

                return (
                  <div
                    key={step.step_number}
                    className={`rounded-xl border overflow-hidden ${
                      isLight ? 'bg-white border-gray-200' : 'bg-surface-800/70 border-white/10'
                    }`}
                  >
                    {/* Accordion header */}
                    <button
                      type="button"
                      onClick={() => toggleStep(step.step_number)}
                      className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                        isLight ? 'hover:bg-gray-50' : 'hover:bg-surface-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold font-mono border ${STEP_BG[step.step_number]} ${STEP_COLORS[step.step_number]}`}
                        >
                          {step.step_number}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
                              {label}
                            </p>
                            <span className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${STEP_BADGE_BG[step.step_number]}`}>
                              Stage {step.step_number}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            {STEP_DESCRIPTIONS[step.step_number]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {/* Inline copy button always visible */}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            copyToClipboard(step.content, step.step_number);
                          }}
                          title="Copy prompt"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isCopied
                              ? 'text-emerald-500'
                              : isLight
                              ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                              : 'text-gray-500 hover:text-gray-300 hover:bg-surface-600'
                          }`}
                        >
                          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {isExpanded
                          ? <ChevronUp className={`w-5 h-5 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
                          : <ChevronDown className={`w-5 h-5 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
                        }
                      </div>
                    </button>

                    {/* Accordion body */}
                    {isExpanded && (
                      <div className={`border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                        <div className={`flex justify-end gap-2 px-5 pt-3 pb-2`}>
                          <Button
                            variant="ghost"
                            onClick={() => copyToClipboard(step.content, step.step_number)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 ${
                              isCopied ? 'text-emerald-500' : ''
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {isCopied ? 'Copied!' : 'Copy Prompt'}
                          </Button>
                        </div>

                        <div className="px-5 pb-5">
                          <pre
                            className={`text-xs leading-relaxed whitespace-pre-wrap font-mono rounded-xl p-4 border overflow-auto max-h-[500px] ${
                              isLight
                                ? 'bg-gray-50 border-gray-200 text-gray-700'
                                : 'bg-surface-900/60 border-white/10 text-gray-300'
                            }`}
                          >
                            {step.content}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom export */}
            <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${
              isLight ? 'bg-white border-gray-200' : 'bg-surface-800/60 border-white/10'
            }`}>
              <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                All six prompts are ready. Export as PDF to share with your team.
              </p>
              <Button
                variant="primary"
                onClick={exportAsPdf}
                className="flex items-center gap-2 text-sm px-5 py-2.5 shrink-0"
              >
                <FileDown className="w-4 h-4" />
                Export as PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
