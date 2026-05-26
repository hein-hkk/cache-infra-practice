import cors from 'cors';
import express from 'express';
import { config } from './config';
import { log } from './lib/logger';
import { quotesRouter } from './routes/quotes';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use('/api', quotesRouter);

app.listen(config.port, () => {
  log.info({ port: config.port }, 'API server started');
});
