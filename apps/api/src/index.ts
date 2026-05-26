import cors from 'cors';
import express from 'express';
import pino from 'pino';
import { config } from './config';
import { quotesRouter } from './routes/quotes';

const log = pino({
  level: config.logLevel,
  transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
});

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use('/api', quotesRouter);

app.listen(config.port, () => {
  log.info({ port: config.port }, 'API server started');
});
