import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Copy, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChallengeCard, StepGenerationResponse } from '../../lib/api/challenges';
import { challengesApi } from '../../lib/api/challenges';
import { toast } from 'sonner';

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
      <div className="bg-surface-800/95 backdrop-blur border border-white/10 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{challenge.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Challenge Description
          </h3>
          <p className="text-gray-300 whitespace-pre-wrap">{challenge.challenge_description}</p>
        </div>

        {challenge.success_criteria && challenge.success_criteria.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Success Criteria
            </h3>
            <ul className="space-y-2">
              {challenge.success_criteria.map((criterion, idx) => (
                <li key={idx} className="text-gray-300 flex items-start">
                  <span className="text-brand-violet mr-2">•</span>
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-white/10 pt-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Building on the Challenge - Six-Step Process</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((stepNumber) => {
              const isExpanded = expandedSteps.has(stepNumber);
              const stepContent = generatedContent[stepNumber];
              const promptLoading = loading[`prompt-${stepNumber}`];
              const summaryLoading = loading[`summary-${stepNumber}`];

              return (
                <div
                  key={stepNumber}
                  className="bg-surface-700/50 border border-white/10 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleStep(stepNumber)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-700/80 transition-colors"
                  >
                    <div>
                      <span className="text-brand-violet font-mono text-sm mr-3">
                        Step {stepNumber}
                      </span>
                      <span className="font-semibold text-white">{STEP_NAMES[stepNumber]}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <p className="text-sm text-gray-400">{STEP_DESCRIPTIONS[stepNumber]}</p>

                      {isFacilitator && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePrompt(stepNumber)}
                            disabled={promptLoading}
                          >
                            {promptLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Generate Prompt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateSummary(stepNumber)}
                            disabled={summaryLoading}
                          >
                            {summaryLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Generate Summary
                          </Button>
                        </div>
                      )}

                      {stepContent?.prompt && (
                        <div className="bg-surface-800/50 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-white">Generated Prompt</h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(stepContent.prompt!.content)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  downloadAsFile(
                                    stepContent.prompt!.content,
                                    `step-${stepNumber}-prompt.txt`
                                  )
                                }
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                            {stepContent.prompt.content}
                          </pre>
                        </div>
                      )}

                      {stepContent?.summary && (
                        <div className="bg-surface-800/50 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-white">One-Slide Summary</h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(stepContent.summary!.content)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  downloadAsFile(
                                    stepContent.summary!.content,
                                    `step-${stepNumber}-summary.md`
                                  )
                                }
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 whitespace-pre-wrap">
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

        <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
