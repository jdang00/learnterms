/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiTelemetry from "../aiTelemetry.js";
import type * as authQueries from "../authQueries.js";
import type * as badgeEngine from "../badgeEngine.js";
import type * as badges from "../badges.js";
import type * as class_ from "../class.js";
import type * as cohort from "../cohort.js";
import type * as contentLib from "../contentLib.js";
import type * as curatorAnalytics from "../curatorAnalytics.js";
import type * as customQuiz from "../customQuiz.js";
import type * as datalab from "../datalab.js";
import type * as documentIngestion from "../documentIngestion.js";
import type * as documentIngestionActions from "../documentIngestionActions.js";
import type * as documentParsing from "../documentParsing.js";
import type * as featureAnnouncements from "../featureAnnouncements.js";
import type * as gradeCalculator from "../gradeCalculator.js";
import type * as gradeCalculatorCatalog from "../gradeCalculatorCatalog.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as module from "../module.js";
import type * as moduleEmoji from "../moduleEmoji.js";
import type * as ogRateLimit from "../ogRateLimit.js";
import type * as pdfExtraction from "../pdfExtraction.js";
import type * as polar from "../polar.js";
import type * as progress from "../progress.js";
import type * as publicQueries from "../publicQueries.js";
import type * as question from "../question.js";
import type * as questionMedia from "../questionMedia.js";
import type * as questionStudio from "../questionStudio.js";
import type * as questionStudio_access from "../questionStudio/access.js";
import type * as questionStudio_authorization from "../questionStudio/authorization.js";
import type * as questionStudio_candidates from "../questionStudio/candidates.js";
import type * as questionStudio_context from "../questionStudio/context.js";
import type * as questionStudio_devTools from "../questionStudio/devTools.js";
import type * as questionStudio_duplicates from "../questionStudio/duplicates.js";
import type * as questionStudio_generation from "../questionStudio/generation.js";
import type * as questionStudio_jobRows from "../questionStudio/jobRows.js";
import type * as questionStudio_jobUpdates from "../questionStudio/jobUpdates.js";
import type * as questionStudio_jobs from "../questionStudio/jobs.js";
import type * as questionStudio_mapping from "../questionStudio/mapping.js";
import type * as questionStudio_mappingState from "../questionStudio/mappingState.js";
import type * as questionStudio_pageSelection from "../questionStudio/pageSelection.js";
import type * as questionStudio_planning from "../questionStudio/planning.js";
import type * as questionStudio_presentation from "../questionStudio/presentation.js";
import type * as questionStudio_provider from "../questionStudio/provider.js";
import type * as questionStudio_quality from "../questionStudio/quality.js";
import type * as questionStudio_questionTypes from "../questionStudio/questionTypes.js";
import type * as questionStudio_review from "../questionStudio/review.js";
import type * as questionStudio_runtime from "../questionStudio/runtime.js";
import type * as questionStudio_saving from "../questionStudio/saving.js";
import type * as questionStudio_shared from "../questionStudio/shared.js";
import type * as questionStudio_sourceRetrieval from "../questionStudio/sourceRetrieval.js";
import type * as questionStudio_text from "../questionStudio/text.js";
import type * as questionStudio_topicMaps from "../questionStudio/topicMaps.js";
import type * as questionStudio_workers from "../questionStudio/workers.js";
import type * as r2Documents from "../r2Documents.js";
import type * as ragKnowledge from "../ragKnowledge.js";
import type * as ragKnowledge_indexing from "../ragKnowledge/indexing.js";
import type * as ragKnowledge_management from "../ragKnowledge/management.js";
import type * as ragKnowledge_previews from "../ragKnowledge/previews.js";
import type * as ragKnowledge_shared from "../ragKnowledge/shared.js";
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
  aiTelemetry: typeof aiTelemetry;
  authQueries: typeof authQueries;
  badgeEngine: typeof badgeEngine;
  badges: typeof badges;
  class: typeof class_;
  cohort: typeof cohort;
  contentLib: typeof contentLib;
  curatorAnalytics: typeof curatorAnalytics;
  customQuiz: typeof customQuiz;
  datalab: typeof datalab;
  documentIngestion: typeof documentIngestion;
  documentIngestionActions: typeof documentIngestionActions;
  documentParsing: typeof documentParsing;
  featureAnnouncements: typeof featureAnnouncements;
  gradeCalculator: typeof gradeCalculator;
  gradeCalculatorCatalog: typeof gradeCalculatorCatalog;
  http: typeof http;
  migrations: typeof migrations;
  module: typeof module;
  moduleEmoji: typeof moduleEmoji;
  ogRateLimit: typeof ogRateLimit;
  pdfExtraction: typeof pdfExtraction;
  polar: typeof polar;
  progress: typeof progress;
  publicQueries: typeof publicQueries;
  question: typeof question;
  questionMedia: typeof questionMedia;
  questionStudio: typeof questionStudio;
  "questionStudio/access": typeof questionStudio_access;
  "questionStudio/authorization": typeof questionStudio_authorization;
  "questionStudio/candidates": typeof questionStudio_candidates;
  "questionStudio/context": typeof questionStudio_context;
  "questionStudio/devTools": typeof questionStudio_devTools;
  "questionStudio/duplicates": typeof questionStudio_duplicates;
  "questionStudio/generation": typeof questionStudio_generation;
  "questionStudio/jobRows": typeof questionStudio_jobRows;
  "questionStudio/jobUpdates": typeof questionStudio_jobUpdates;
  "questionStudio/jobs": typeof questionStudio_jobs;
  "questionStudio/mapping": typeof questionStudio_mapping;
  "questionStudio/mappingState": typeof questionStudio_mappingState;
  "questionStudio/pageSelection": typeof questionStudio_pageSelection;
  "questionStudio/planning": typeof questionStudio_planning;
  "questionStudio/presentation": typeof questionStudio_presentation;
  "questionStudio/provider": typeof questionStudio_provider;
  "questionStudio/quality": typeof questionStudio_quality;
  "questionStudio/questionTypes": typeof questionStudio_questionTypes;
  "questionStudio/review": typeof questionStudio_review;
  "questionStudio/runtime": typeof questionStudio_runtime;
  "questionStudio/saving": typeof questionStudio_saving;
  "questionStudio/shared": typeof questionStudio_shared;
  "questionStudio/sourceRetrieval": typeof questionStudio_sourceRetrieval;
  "questionStudio/text": typeof questionStudio_text;
  "questionStudio/topicMaps": typeof questionStudio_topicMaps;
  "questionStudio/workers": typeof questionStudio_workers;
  r2Documents: typeof r2Documents;
  ragKnowledge: typeof ragKnowledge;
  "ragKnowledge/indexing": typeof ragKnowledge_indexing;
  "ragKnowledge/management": typeof ragKnowledge_management;
  "ragKnowledge/previews": typeof ragKnowledge_previews;
  "ragKnowledge/shared": typeof ragKnowledge_shared;
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
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
