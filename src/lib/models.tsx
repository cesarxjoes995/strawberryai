import React from 'react';
import { Brain, Bot, Zap, Cpu, Network, Lightbulb, Sparkles, Star } from 'lucide-react';
import type { ReactNode } from 'react';

export type ModelProvider = 'openrouter' | 'typegpt' | 'samurai';

export interface Model {
  id: string;
  name: string;
  provider: string;
  apiProvider: ModelProvider;
  description: string;
  supportsLiveSearch: boolean;
  icon: ReactNode;
  isReasoning?: boolean;
  thinkingSteps?: string[];
  comingSoon?: boolean;
}

const newModelNames = [
  'Samurai Ai v2',
  'openai/gpt-4.1-mini',
  'rerank-shopify-v0',
  'qwen-plus-latest',
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
  'Qwen-QwQ-32B-Preview',
  'Qwen/QwQ-32B',
  'text-embedding-3-large',
  'nai-4b',
  'deepseek-r1',
  'gpt-4o',
  'gpt-4o-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-flash-2.0',
  'gemini-1.5-flash',
  'anthropic/claude-3.5-sonnet',
  'mistral-large',
  'deepseek-v3',
  'openai/gpt-4.1',
  'openai/gpt-4.1-nano',
  'openai/chatgpt-4o-latest',
  'llama-3.1-405b',
  'Meta-Llama-3.1-405B-Instruct-Turbo',
  'Meta-Llama-3.3-70B-Instruct-Turbo',
  'qwen-turbo-latest',
  'dbrx-instruct',
  'qwen-2.5-32b',
  'qwen-2.5-coder-32b',
  'qwen-qwq-32b',
  'o3-mini',
  'Claude-sonnet-3.7',
  'x-ai/grok-3-beta',
  'openai/gpt-4o-search-preview',
  'openai/gpt-4o-mini-search-preview',
  'DeepResearch',
  'uncensored-r1',
  'gpt-4.1-2025-04-14',
  'perplexity-ai/r1-1776',
  'Qwen/Qwen3-235B-A22B-fp8-tput',
  'deepseek-ai/DeepSeek-V3-0324',
  'o1',
  'o1-2024-12-17',
  'o1-preview-2024-09-12',
  'o3-mini-2025-01-31',
];

export const models: Model[] = newModelNames.map(fullName => {
  const parts = fullName.split('/');
  const name = parts.pop() || fullName;
  const provider = parts.join('/') || 'Unknown';
  return {
    id: fullName,
    name: name,
    provider: provider,
    apiProvider: 'samurai',
    description: 'AI Model',
    supportsLiveSearch: true,
    icon: <Brain className="h-5 w-5 text-blue-400" />,
  };
});