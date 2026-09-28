export interface JobOptions {
  name: string;
  data: Record<string, unknown>;
  delay?: number;
  organizationId?: string;
  idempotencyKey?: string;
  maxRetries?: number;
}

export type JobResult = {
  jobId: string;
  status: 'queued' | 'skipped' | 'duplicate';
};

export interface JobService {
  enqueue(options: JobOptions): Promise<JobResult>;
}

export class DevelopmentJobService implements JobService {
  async enqueue(options: JobOptions): Promise<JobResult> {
    console.log(`[JobQueue Mock] Enqueued job '${options.name}':`, {
      ...options.data,
      _meta: {
        organizationId: options.organizationId,
        idempotencyKey: options.idempotencyKey,
        maxRetries: options.maxRetries
      }
    });
    return {
      jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'queued',
    };
  }
}

export const jobService: JobService = new DevelopmentJobService();
