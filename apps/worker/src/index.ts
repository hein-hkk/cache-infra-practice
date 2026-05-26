import { Queue, Worker } from 'bullmq';
import pino from 'pino';
import { config } from './config';
import { rotateHighlight } from './jobs/rotate-highlight';

const log = pino({
  level: config.logLevel,
  transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
});

// Parse REDIS_URL into host/port options so BullMQ creates its own connection
// (avoids ioredis version mismatch between worker and bullmq).
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    maxRetriesPerRequest: null as null,
  };
}

async function main() {
  const connection = parseRedisUrl(config.redisUrl);
  const queue = new Queue('highlight', { connection });

  // Ensure the repeating job exists (idempotent — BullMQ deduplicates by jobId)
  await queue.add('rotate-highlight', {}, {
    repeat: { every: 5 * 60 * 1000 },
    jobId: 'rotate-highlight-repeat',
  });

  const worker = new Worker('highlight', rotateHighlight, { connection });

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Job failed');
  });

  log.info('Worker started, listening for jobs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
