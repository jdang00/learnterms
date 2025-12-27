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
import type * as chunkContent from "../chunkContent.js";
import type * as class_ from "../class.js";
import type * as cohort from "../cohort.js";
import type * as contentLib from "../contentLib.js";
import type * as module from "../module.js";
import type * as progress from "../progress.js";
import type * as question from "../question.js";
import type * as questionMedia from "../questionMedia.js";
import type * as school from "../school.js";
import type * as semester from "../semester.js";
import type * as userProgress from "../userProgress.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authQueries: typeof authQueries;
  chunkContent: typeof chunkContent;
  class: typeof class_;
  cohort: typeof cohort;
  contentLib: typeof contentLib;
  module: typeof module;
  progress: typeof progress;
  question: typeof question;
  questionMedia: typeof questionMedia;
  school: typeof school;
  semester: typeof semester;
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

export declare const components: {};
