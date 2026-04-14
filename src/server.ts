import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app: Application = express();

app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(helmet());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'API is running optimally.' });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
