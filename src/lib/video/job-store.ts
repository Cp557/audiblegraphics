/**
 * In-memory job storage for video generation
 * No database required - all job status tracked in server memory
 *
 * NOTE: Job status is lost if server restarts. This is acceptable since
 * video files are temporary and cleaned up automatically.
 */

import { randomUUID } from 'crypto';

export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoJob {
  id: string;
  presentationId: string;
  userId: string;
  status: VideoJobStatus;
  progress: number;
  videoUrl: string | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// In-memory job storage
const jobs = new Map<string, VideoJob>();

/**
 * Create a new video generation job
 */
export function createVideoJob(presentationId: string, userId: string): VideoJob {
  const job: VideoJob = {
    id: randomUUID(),
    presentationId,
    userId,
    status: 'pending',
    progress: 0,
    videoUrl: null,
    error: null,
    createdAt: new Date(),
    completedAt: null,
  };

  jobs.set(job.id, job);
  return job;
}

/**
 * Get a job by ID
 */
export function getVideoJob(jobId: string): VideoJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Update a job's status and properties
 */
export function updateVideoJob(
  jobId: string,
  updates: Partial<Pick<VideoJob, 'status' | 'progress' | 'videoUrl' | 'error' | 'completedAt'>>
): void {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  Object.assign(job, updates);
  jobs.set(jobId, job);
}

/**
 * Delete a job from storage
 */
export function deleteVideoJob(jobId: string): void {
  jobs.delete(jobId);
}

/**
 * Get all jobs (for debugging/monitoring)
 */
export function getAllJobs(): VideoJob[] {
  return Array.from(jobs.values());
}

/**
 * Clean up old jobs (called periodically)
 */
export function cleanupOldJobs(maxAgeMinutes: number = 60): void {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  for (const [jobId, job] of jobs.entries()) {
    const age = now - job.createdAt.getTime();
    if (age > maxAgeMs) {
      jobs.delete(jobId);
      console.log(`Cleaned up old job: ${jobId}`);
    }
  }
}
