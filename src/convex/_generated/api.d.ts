/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authQueries from "../authQueries.js";
import type * as badgeEngine from "../badgeEngine.js";
import type * as badges from "../badges.js";
import type * as class_ from "../class.js";
import type * as cohort from "../cohort.js";
import type * as contentLib from "../contentLib.js";
import type * as curatorAnalytics from "../curatorAnalytics.js";
import type * as customQuiz from "../customQuiz.js";
import type * as featureAnnouncements from "../featureAnnouncements.js";
import type * as gradeCalculator from "../gradeCalculator.js";
import type * as gradeCalculatorCatalog from "../gradeCalculatorCatalog.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as module from "../module.js";
import type * as ogRateLimit from "../ogRateLimit.js";
import type * as polar from "../polar.js";
import type * as progress from "../progress.js";
import type * as publicQueries from "../publicQueries.js";
import type * as question from "../question.js";
import type * as questionMedia from "../questionMedia.js";
import type * as questionStudio from "../questionStudio.js";
import type * as questionStudio_helpers from "../questionStudio/helpers.js";
import type * as questionStudio_shared from "../questionStudio/shared.js";
import type * as r2Documents from "../r2Documents.js";
import type * as ragKnowledge from "../ragKnowledge.js";
import type * as ragKnowledgeInternal from "../ragKnowledgeInternal.js";
import type * as school from "../school.js";
import type * as semester from "../semester.js";
import type * as tags from "../tags.js";
import type * as userProgress from "../userProgress.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authQueries: typeof authQueries;
  badgeEngine: typeof badgeEngine;
  badges: typeof badges;
  class: typeof class_;
  cohort: typeof cohort;
  contentLib: typeof contentLib;
  curatorAnalytics: typeof curatorAnalytics;
  customQuiz: typeof customQuiz;
  featureAnnouncements: typeof featureAnnouncements;
  gradeCalculator: typeof gradeCalculator;
  gradeCalculatorCatalog: typeof gradeCalculatorCatalog;
  http: typeof http;
  migrations: typeof migrations;
  module: typeof module;
  ogRateLimit: typeof ogRateLimit;
  polar: typeof polar;
  progress: typeof progress;
  publicQueries: typeof publicQueries;
  question: typeof question;
  questionMedia: typeof questionMedia;
  questionStudio: typeof questionStudio;
  "questionStudio/helpers": typeof questionStudio_helpers;
  "questionStudio/shared": typeof questionStudio_shared;
  r2Documents: typeof r2Documents;
  ragKnowledge: typeof ragKnowledge;
  ragKnowledgeInternal: typeof ragKnowledgeInternal;
  school: typeof school;
  semester: typeof semester;
  tags: typeof tags;
  userProgress: typeof userProgress;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
