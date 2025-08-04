/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as class_ from "../class.js";
import type * as cohort from "../cohort.js";
import type * as module from "../module.js";
import type * as question from "../question.js";
import type * as school from "../school.js";
import type * as semester from "../semester.js";
import type * as userProgress from "../userProgress.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  class: typeof class_;
  cohort: typeof cohort;
  module: typeof module;
  question: typeof question;
  school: typeof school;
  semester: typeof semester;
  userProgress: typeof userProgress;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
