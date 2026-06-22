import { defineApp } from 'convex/server';
import agent from '@convex-dev/agent/convex.config';
import polar from '@convex-dev/polar/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import rag from '@convex-dev/rag/convex.config.js';
import r2 from '@convex-dev/r2/convex.config.js';

const app = defineApp();
app.use(agent);
app.use(polar);
app.use(rateLimiter);
app.use(rag);
app.use(r2);

export default app;
