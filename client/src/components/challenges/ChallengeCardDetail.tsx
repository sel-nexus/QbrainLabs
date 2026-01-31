import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Copy, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChallengeCard, StepGenerationResponse } from '../../lib/api/challenges';
import { challengesApi } from '../../lib/api/challenges';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

interface ChallengeCardDetailProps {
  challenge: ChallengeCard;
  onClose: () => void;
  isFacilitator: boolean;
}

const STEP_NAMES: Record<number, string> = {
  1: 'Widen',
  2: 'Diagnose',
  3: 'Converge',
  4: 'Brief',
  5: 'Build',
  6: 'Share-back'
};

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Rapidly surface personas, pains, workarounds, metrics, insights, risks related to the challenge',
  2: 'Drill into chosen pain using five Whys, hypotheses, disproof evidence, and quick tests for validation',
  3: 'Cluster ideas into three options, score impact and do-ability, recommend one with metrics for leadership',
  4: 'Create one-page brief with users, problem, flow, screens, sample copy, and data, enabling rapid prototyping',
  5: 'Generate platform-specific builder prompt from brief, including flows, components, data, metrics, constraints for first-cut prototype creation',
  6: 'Generate a 2-3 min executive sales pitch style storyline highlighting what has been done so far and what\'s next'
};

export function ChallengeCardDetail({ challenge, onClose, isFacilitator }: ChallengeCardDetailProps) {
  const { theme } = useTheme();
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [generatedContent, setGeneratedContent] = useState<Record<number, { prompt?: StepGenerationResponse; summary?: StepGenerationResponse }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  const generatePrompt = async (stepNumber: number) => {
    const key = `prompt-${stepNumber}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await challengesApi.generateStepPrompt(challenge.id, stepNumber, {
        include_workshop_context: false,
        include_previous_steps: false
      });
      setGeneratedContent(prev => ({
        ...prev,
        [stepNumber]: { ...prev[stepNumber], prompt: response }
      }));
      toast.success(`Prompt generated for Step ${stepNumber}: ${STEP_NAMES[stepNumber]}`);
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast.error('Failed to generate prompt');
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const generateSummary = async (stepNumber: number) => {
    const key = `summary-${stepNumber}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await challengesApi.generateStepSummary(challenge.id, stepNumber, {
        include_workshop_context: false,
        include_previous_steps: false,
        format: 'markdown'
      });
      setGeneratedContent(prev => ({
        ...prev,
        [stepNumber]: { ...prev[stepNumber], summary: response }
      }));
      toast.success(`Summary generated for Step ${stepNumber}: ${STEP_NAMES[stepNumber]}`);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`backdrop-blur border rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
          theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-surface-800/95 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            {challenge.title}
          </h2>
          <Button variant="ghost" onClick={onClose} className="px-3 py-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="mb-6">
          <h3
            className={`text-sm font-semibold uppercase tracking-wider mb-2 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}
          >
            Challenge Description
          </h3>
          <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} whitespace-pre-wrap`}>
            {challenge.challenge_description}
          </p>
        </div>

        {challenge.success_criteria && challenge.success_criteria.length > 0 && (
          <div className="mb-6">
            <h3
              className={`text-sm font-semibold uppercase tracking-wider mb-2 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              Success Criteria
            </h3>
            <ul className="space-y-2">
              {challenge.success_criteria.map((criterion, idx) => (
                <li
                  key={idx}
                  className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} flex items-start`}
                >
                  <span className="text-brand-violet mr-2">•</span>
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={`border-t pt-6 mt-6 ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            Building on the Challenge - Six-Step Process
          </h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((stepNumber) => {
              const isExpanded = expandedSteps.has(stepNumber);
              const stepContent = generatedContent[stepNumber];
              const promptLoading = loading[`prompt-${stepNumber}`];
              const summaryLoading = loading[`summary-${stepNumber}`];

              return (
                <div
                  key={stepNumber}
                  className={`border rounded-lg overflow-hidden ${
                    theme === 'light'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-surface-700/50 border-white/10'
                  }`}
                >
                  <button
                    onClick={() => toggleStep(stepNumber)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                      theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-surface-700/80'
                    }`}
                  >
                    <div>
                      <span className="text-brand-violet font-mono text-sm mr-3">
                        Step {stepNumber}
                      </span>
                      <span className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {STEP_NAMES[stepNumber]}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={`w-5 h-5 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`} />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                        {STEP_DESCRIPTIONS[stepNumber]}
                      </p>

                      {isFacilitator && (
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => generatePrompt(stepNumber)}
                            disabled={promptLoading}
                            className="text-xs px-3 py-2"
                          >
                            {promptLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Generate Prompt
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => generateSummary(stepNumber)}
                            disabled={summaryLoading}
                            className="text-xs px-3 py-2"
                          >
                            {summaryLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Generate Summary
                          </Button>
                        </div>
                      )}

                      {stepContent?.prompt && (
                        <div
                          className={`rounded-lg p-4 border ${
                            theme === 'light'
                              ? 'bg-white border-gray-200'
                              : 'bg-surface-800/50 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              Generated Prompt
                            </h4>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => copyToClipboard(stepContent.prompt!.content)}
                                className="px-2 py-2"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  downloadAsFile(
                                    stepContent.prompt!.content,
                                    `step-${stepNumber}-prompt.txt`
                                  )
                                }
                                className="px-2 py-2"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <pre
                            className={`text-sm whitespace-pre-wrap font-mono ${
                              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                            }`}
                          >
                            {stepContent.prompt.content}
                          </pre>
                        </div>
                      )}

                      {stepContent?.summary && (
                        <div
                          className={`rounded-lg p-4 border ${
                            theme === 'light'
                              ? 'bg-white border-gray-200'
                              : 'bg-surface-800/50 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              One-Slide Summary
                            </h4>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => copyToClipboard(stepContent.summary!.content)}
                                className="px-2 py-2"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  downloadAsFile(
                                    stepContent.summary!.content,
                                    `step-${stepNumber}-summary.md`
                                  )
                                }
                                className="px-2 py-2"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div
                            className={`text-sm whitespace-pre-wrap ${
                              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                            }`}
                          >
                            {stepContent.summary.content}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`flex justify-end mt-6 pt-4 border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
