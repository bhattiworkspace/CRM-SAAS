export interface AiGenerateParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  context?: Record<string, unknown>;
}

export interface AiGenerateResult {
  content: string;
  provider: string;
  model: string;
  generatedAt: Date;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface AiScoreParams {
  entityType: 'LEAD' | 'DEAL' | 'CONTACT';
  entityData: Record<string, unknown>;
  scoringVersion: string;
}

export interface AiScoreResult {
  score: number;
  explanation: string;
  provider: string;
  model: string;
  scoringVersion: string;
  generatedAt: Date;
}

export interface AiProvider {
  generateText(params: AiGenerateParams): Promise<AiGenerateResult>;
  scoreLead(params: AiScoreParams): Promise<AiScoreResult>;
  extractEntities(text: string): Promise<AiGenerateResult>;
  generateDraftResponse(params: AiGenerateParams): Promise<AiGenerateResult>;
}

export class MockAiProvider implements AiProvider {
  private readonly provider = 'mock';
  private readonly model = 'mock-v1';

  private formatResponse(content: string): AiGenerateResult {
    return {
      content: `[MOCK — Development AI] ${content}`,
      provider: this.provider,
      model: this.model,
      generatedAt: new Date(),
      tokenUsage: {
        prompt: 10,
        completion: 20,
        total: 30,
      },
    };
  }

  async generateText(params: AiGenerateParams): Promise<AiGenerateResult> {
    return this.formatResponse(`Generated response for: "${params.prompt.substring(0, 50)}..."`);
  }

  async scoreLead(params: AiScoreParams): Promise<AiScoreResult> {
    let score = 50;
    const reasons: string[] = ['Base score of 50.'];

    if (params.entityData.email) {
      score += 20;
      reasons.push('+20 for having an email address.');
    }
    if (params.entityData.phone) {
      score += 15;
      reasons.push('+15 for having a phone number.');
    }
    if (params.entityData.company) {
      score += 10;
      reasons.push('+10 for having a company name.');
    }

    score = Math.min(score, 99);

    return {
      score,
      explanation: `[MOCK — Development AI] ${reasons.join(' ')}`,
      provider: this.provider,
      model: this.model,
      scoringVersion: params.scoringVersion,
      generatedAt: new Date(),
    };
  }

  async extractEntities(text: string): Promise<AiGenerateResult> {
    return this.formatResponse(`Extracted entities from text length ${text.length}.`);
  }

  async generateDraftResponse(params: AiGenerateParams): Promise<AiGenerateResult> {
    return this.formatResponse(`Draft response based on: "${params.prompt.substring(0, 50)}..."`);
  }
}

import { ProviderError, logger } from '@/lib/utils/errors';
import { safeJsonParse } from '@/lib/utils/json';

export class OpenAiProvider implements AiProvider {
  private readonly provider = 'openai';
  private get model() {
    return process.env.OPENAI_MODEL || 'gpt-4o';
  }
  private get apiKey() {
    return process.env.OPENAI_API_KEY;
  }

  async generateText(params: AiGenerateParams): Promise<AiGenerateResult> {
    if (!this.apiKey) throw new ProviderError(this.provider, 'OpenAI API key missing');
    
    try {
      const messages = [];
      if (params.systemPrompt) {
        messages.push({ role: 'system', content: params.systemPrompt });
      }
      messages.push({ role: 'user', content: params.prompt });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: params.maxTokens
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error('OpenAI API error', { status: res.status, errorText });
        throw new ProviderError(this.provider, 'Failed to generate text');
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        provider: this.provider,
        model: this.model,
        generatedAt: new Date(),
        tokenUsage: data.usage ? {
          prompt: data.usage.prompt_tokens,
          completion: data.usage.completion_tokens,
          total: data.usage.total_tokens
        } : undefined
      };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      logger.error('OpenAI fetch error', { error: e instanceof Error ? e.message : 'Unknown error' });
      throw new ProviderError(this.provider, 'Failed to communicate with OpenAI');
    }
  }

  async scoreLead(params: AiScoreParams): Promise<AiScoreResult> {
    const prompt = `Score this ${params.entityType} out of 100 based on this data: ${JSON.stringify(params.entityData)}. Return JSON in this format: {"score": number, "explanation": "string"}`;
    const result = await this.generateText({
      prompt,
      systemPrompt: 'You are an expert CRM lead scorer. Always output valid JSON only.',
    });

    const parsed = safeJsonParse(result.content);
    if (!parsed || typeof parsed !== 'object' || !('score' in parsed) || !('explanation' in parsed)) {
      throw new ProviderError(this.provider, 'Failed to parse score response as valid JSON');
    }

    return {
      score: Number(parsed.score) || 0,
      explanation: String(parsed.explanation),
      provider: this.provider,
      model: this.model,
      scoringVersion: params.scoringVersion,
      generatedAt: new Date(),
    };
  }

  async extractEntities(text: string): Promise<AiGenerateResult> {
    return this.generateText({
      prompt: `Extract entities from this text:\n\n${text}`,
      systemPrompt: 'You are an entity extraction assistant.'
    });
  }

  async generateDraftResponse(params: AiGenerateParams): Promise<AiGenerateResult> {
    return this.generateText({
      prompt: `Draft a response for this request: ${params.prompt}`,
      systemPrompt: params.systemPrompt || 'You are a helpful CRM assistant drafting a response.'
    });
  }
}

export class AnthropicAiProvider implements AiProvider {
  private readonly provider = 'anthropic';
  private get model() {
    return process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
  }
  private get apiKey() {
    return process.env.ANTHROPIC_API_KEY;
  }

  async generateText(params: AiGenerateParams): Promise<AiGenerateResult> {
    if (!this.apiKey) throw new ProviderError(this.provider, 'Anthropic API key missing');

    try {
      const messages = [{ role: 'user', content: params.prompt }];
      
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          system: params.systemPrompt,
          max_tokens: params.maxTokens || 1024
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error('Anthropic API error', { status: res.status, errorText });
        throw new ProviderError(this.provider, 'Failed to generate text');
      }

      const data = await res.json();
      return {
        content: data.content?.[0]?.text || '',
        provider: this.provider,
        model: this.model,
        generatedAt: new Date(),
        tokenUsage: data.usage ? {
          prompt: data.usage.input_tokens,
          completion: data.usage.output_tokens,
          total: data.usage.input_tokens + data.usage.output_tokens
        } : undefined
      };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      logger.error('Anthropic fetch error', { error: e instanceof Error ? e.message : 'Unknown error' });
      throw new ProviderError(this.provider, 'Failed to communicate with Anthropic');
    }
  }

  async scoreLead(params: AiScoreParams): Promise<AiScoreResult> {
    const prompt = `Score this ${params.entityType} out of 100 based on this data: ${JSON.stringify(params.entityData)}. Return JSON in this format: {"score": number, "explanation": "string"}`;
    const result = await this.generateText({
      prompt,
      systemPrompt: 'You are an expert CRM lead scorer. Output valid JSON only, with no other text.',
    });

    const parsed = safeJsonParse(result.content);
    if (!parsed || typeof parsed !== 'object' || !('score' in parsed) || !('explanation' in parsed)) {
      throw new ProviderError(this.provider, 'Failed to parse score response as valid JSON');
    }

    return {
      score: Number(parsed.score) || 0,
      explanation: String(parsed.explanation),
      provider: this.provider,
      model: this.model,
      scoringVersion: params.scoringVersion,
      generatedAt: new Date(),
    };
  }

  async extractEntities(text: string): Promise<AiGenerateResult> {
    return this.generateText({
      prompt: `Extract entities from this text:\n\n${text}`,
      systemPrompt: 'You are an entity extraction assistant.'
    });
  }

  async generateDraftResponse(params: AiGenerateParams): Promise<AiGenerateResult> {
    return this.generateText({
      prompt: `Draft a response for this request: ${params.prompt}`,
      systemPrompt: params.systemPrompt || 'You are a helpful CRM assistant drafting a response.'
    });
  }
}

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || 'mock';
  switch (provider) {
    case 'openai': return new OpenAiProvider();
    case 'anthropic': return new AnthropicAiProvider();
    case 'mock':
    default: return new MockAiProvider();
  }
}
