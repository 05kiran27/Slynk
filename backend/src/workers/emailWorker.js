const { Worker } = require('bullmq');
const { sendMail } = require('../utils/mailer');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
});

const worker = new Worker('emailQueue', async (job) => {
  return await sendMail(job.data);
}, { connection });

worker.on('completed', job => console.log(`Email job ${job.id} completed.`));
worker.on('failed', (job, err) => console.error(`Email job ${job.id} failed:`, err));
