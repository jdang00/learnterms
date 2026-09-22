import { getPostHog } from './posthogClient';
import { createStudyToolCapture } from './studyToolEvents';

// Uses the existing production-only client, identity, session, and consent settings.
export const captureStudyTool = createStudyToolCapture(getPostHog);
