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
  agent: {
    apiKeys: {
      destroy: FunctionReference<
        "mutation",
        "internal",
        { apiKey?: string; name?: string },
        | "missing"
        | "deleted"
        | "name mismatch"
        | "must provide either apiKey or name"
      >;
      issue: FunctionReference<
        "mutation",
        "internal",
        { name?: string },
        string
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { apiKey: string },
        boolean
      >;
    };
    files: {
      addFile: FunctionReference<
        "mutation",
        "internal",
        {
          filename?: string;
          hash: string;
          mediaType?: string;
          mimeType?: string;
          storageId: string;
        },
        { fileId: string; storageId: string }
      >;
      copyFile: FunctionReference<
        "mutation",
        "internal",
        { fileId: string },
        null
      >;
      deleteFiles: FunctionReference<
        "mutation",
        "internal",
        { fileIds: Array<string>; force?: boolean },
        Array<string>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { fileId: string },
        null | {
          _creationTime: number;
          _id: string;
          filename?: string;
          hash: string;
          lastTouchedAt: number;
          mediaType?: string;
          mimeType?: string;
          refcount: number;
          storageId: string;
        }
      >;
      getFilesToDelete: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            filename?: string;
            hash: string;
            lastTouchedAt: number;
            mediaType?: string;
            mimeType?: string;
            refcount: number;
            storageId: string;
          }>;
        }
      >;
      useExistingFile: FunctionReference<
        "mutation",
        "internal",
        { filename?: string; hash: string },
        null | { fileId: string; storageId: string }
      >;
    };
    messages: {
      addMessages: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          embeddings?: {
            dimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            model: string;
            vectors: Array<Array<number> | null>;
          };
          failPendingSteps?: boolean;
          finishStreamId?: string;
          hideFromUserIdSearch?: boolean;
          messages: Array<{
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mediaType?: string;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args?: any;
                            input: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args: any;
                            input?: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  reason?: string;
                                  type: "execution-denied";
                                }
                              | {
                                  type: "content";
                                  value: Array<
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        text: string;
                                        type: "text";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                    | {
                                        data: string;
                                        filename?: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-id";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-file-id";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "custom";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                        | {
                            approvalId: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            type: "tool-approval-request";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<
                    | {
                        args?: any;
                        experimental_content?: Array<
                          | { text: string; type: "text" }
                          | { data: string; mimeType?: string; type: "image" }
                        >;
                        isError?: boolean;
                        output?:
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              reason?: string;
                              type: "execution-denied";
                            }
                          | {
                              type: "content";
                              value: Array<
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    text: string;
                                    type: "text";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    type: "media";
                                  }
                                | {
                                    data: string;
                                    filename?: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-id";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-file-id";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "custom";
                                  }
                              >;
                            };
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        result?: any;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-result";
                      }
                    | {
                        approvalId: string;
                        approved: boolean;
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        reason?: string;
                        type: "tool-approval-response";
                      }
                  >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status?: "pending" | "success" | "failed";
            text?: string;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pendingMessageId?: string;
          promptMessageId?: string;
          threadId: string;
          userId?: string;
        },
        {
          messages: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mediaType?: string;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args?: any;
                            input: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args: any;
                            input?: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  reason?: string;
                                  type: "execution-denied";
                                }
                              | {
                                  type: "content";
                                  value: Array<
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        text: string;
                                        type: "text";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                    | {
                                        data: string;
                                        filename?: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-id";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-file-id";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "custom";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                        | {
                            approvalId: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            type: "tool-approval-request";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<
                    | {
                        args?: any;
                        experimental_content?: Array<
                          | { text: string; type: "text" }
                          | { data: string; mimeType?: string; type: "image" }
                        >;
                        isError?: boolean;
                        output?:
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              reason?: string;
                              type: "execution-denied";
                            }
                          | {
                              type: "content";
                              value: Array<
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    text: string;
                                    type: "text";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    type: "media";
                                  }
                                | {
                                    data: string;
                                    filename?: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-id";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-file-id";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "custom";
                                  }
                              >;
                            };
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        result?: any;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-result";
                      }
                    | {
                        approvalId: string;
                        approved: boolean;
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        reason?: string;
                        type: "tool-approval-response";
                      }
                  >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
        }
      >;
      cloneThread: FunctionReference<
        "action",
        "internal",
        {
          batchSize?: number;
          copyUserIdForVectorSearch?: boolean;
          excludeToolMessages?: boolean;
          insertAtOrder?: number;
          limit?: number;
          sourceThreadId: string;
          statuses?: Array<"pending" | "success" | "failed">;
          targetThreadId: string;
          upToAndIncludingMessageId?: string;
        },
        number
      >;
      deleteByIds: FunctionReference<
        "mutation",
        "internal",
        { messageIds: Array<string> },
        Array<string>
      >;
      deleteByOrder: FunctionReference<
        "mutation",
        "internal",
        {
          endOrder: number;
          endStepOrder?: number;
          startOrder: number;
          startStepOrder?: number;
          threadId: string;
        },
        { isDone: boolean; lastOrder?: number; lastStepOrder?: number }
      >;
      finalizeMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          result: { status: "success" } | { error: string; status: "failed" };
        },
        null
      >;
      getMessagesByIds: FunctionReference<
        "query",
        "internal",
        { messageIds: Array<string> },
        Array<null | {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mediaType?: string;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args?: any;
                          input: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args: any;
                          input?: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                reason?: string;
                                type: "execution-denied";
                              }
                            | {
                                type: "content";
                                value: Array<
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      text: string;
                                      type: "text";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                  | {
                                      data: string;
                                      filename?: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-id";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-file-id";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "custom";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                      | {
                          approvalId: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          type: "tool-approval-request";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<
                  | {
                      args?: any;
                      experimental_content?: Array<
                        | { text: string; type: "text" }
                        | { data: string; mimeType?: string; type: "image" }
                      >;
                      isError?: boolean;
                      output?:
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            reason?: string;
                            type: "execution-denied";
                          }
                        | {
                            type: "content";
                            value: Array<
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  text: string;
                                  type: "text";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  type: "media";
                                }
                              | {
                                  data: string;
                                  filename?: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-id";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-file-id";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "custom";
                                }
                            >;
                          };
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      result?: any;
                      toolCallId: string;
                      toolName: string;
                      type: "tool-result";
                    }
                  | {
                      approvalId: string;
                      approved: boolean;
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      reason?: string;
                      type: "tool-approval-response";
                    }
                >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      getMessageSearchFields: FunctionReference<
        "query",
        "internal",
        { messageId: string },
        { embedding?: Array<number>; embeddingModel?: string; text?: string }
      >;
      listMessagesByThreadId: FunctionReference<
        "query",
        "internal",
        {
          excludeToolMessages?: boolean;
          order: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          statuses?: Array<"pending" | "success" | "failed">;
          threadId: string;
          upToAndIncludingMessageId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mediaType?: string;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args?: any;
                            input: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args: any;
                            input?: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  reason?: string;
                                  type: "execution-denied";
                                }
                              | {
                                  type: "content";
                                  value: Array<
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        text: string;
                                        type: "text";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                    | {
                                        data: string;
                                        filename?: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-id";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-file-id";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "custom";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                        | {
                            approvalId: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            type: "tool-approval-request";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<
                    | {
                        args?: any;
                        experimental_content?: Array<
                          | { text: string; type: "text" }
                          | { data: string; mimeType?: string; type: "image" }
                        >;
                        isError?: boolean;
                        output?:
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              reason?: string;
                              type: "execution-denied";
                            }
                          | {
                              type: "content";
                              value: Array<
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    text: string;
                                    type: "text";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    type: "media";
                                  }
                                | {
                                    data: string;
                                    filename?: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-id";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-file-id";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "custom";
                                  }
                              >;
                            };
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        result?: any;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-result";
                      }
                    | {
                        approvalId: string;
                        approved: boolean;
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        reason?: string;
                        type: "tool-approval-response";
                      }
                  >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchMessages: FunctionReference<
        "action",
        "internal",
        {
          embedding?: Array<number>;
          embeddingModel?: string;
          limit: number;
          messageRange?: { after: number; before: number };
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          textSearch?: boolean;
          threadId?: string;
          vectorScoreThreshold?: number;
          vectorSearch?: boolean;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mediaType?: string;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args?: any;
                          input: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args: any;
                          input?: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                reason?: string;
                                type: "execution-denied";
                              }
                            | {
                                type: "content";
                                value: Array<
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      text: string;
                                      type: "text";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                  | {
                                      data: string;
                                      filename?: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-id";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-file-id";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "custom";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                      | {
                          approvalId: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          type: "tool-approval-request";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<
                  | {
                      args?: any;
                      experimental_content?: Array<
                        | { text: string; type: "text" }
                        | { data: string; mimeType?: string; type: "image" }
                      >;
                      isError?: boolean;
                      output?:
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            reason?: string;
                            type: "execution-denied";
                          }
                        | {
                            type: "content";
                            value: Array<
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  text: string;
                                  type: "text";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  type: "media";
                                }
                              | {
                                  data: string;
                                  filename?: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-id";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-file-id";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "custom";
                                }
                            >;
                          };
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      result?: any;
                      toolCallId: string;
                      toolName: string;
                      type: "tool-result";
                    }
                  | {
                      approvalId: string;
                      approved: boolean;
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      reason?: string;
                      type: "tool-approval-response";
                    }
                >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      textSearch: FunctionReference<
        "query",
        "internal",
        {
          limit: number;
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          threadId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mediaType?: string;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args?: any;
                          input: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args: any;
                          input?: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                reason?: string;
                                type: "execution-denied";
                              }
                            | {
                                type: "content";
                                value: Array<
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      text: string;
                                      type: "text";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                  | {
                                      data: string;
                                      filename?: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-id";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-file-id";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "custom";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                      | {
                          approvalId: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          type: "tool-approval-request";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<
                  | {
                      args?: any;
                      experimental_content?: Array<
                        | { text: string; type: "text" }
                        | { data: string; mimeType?: string; type: "image" }
                      >;
                      isError?: boolean;
                      output?:
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            reason?: string;
                            type: "execution-denied";
                          }
                        | {
                            type: "content";
                            value: Array<
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  text: string;
                                  type: "text";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  type: "media";
                                }
                              | {
                                  data: string;
                                  filename?: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-id";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-file-id";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "custom";
                                }
                            >;
                          };
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      result?: any;
                      toolCallId: string;
                      toolName: string;
                      type: "tool-result";
                    }
                  | {
                      approvalId: string;
                      approved: boolean;
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      reason?: string;
                      type: "tool-approval-response";
                    }
                >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      updateMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          patch: {
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mediaType?: string;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mediaType?: string;
                            mimeType?: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args?: any;
                            input: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args: any;
                            input?: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-text";
                                  value: string;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "error-json";
                                  value: any;
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  reason?: string;
                                  type: "execution-denied";
                                }
                              | {
                                  type: "content";
                                  value: Array<
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        text: string;
                                        type: "text";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                    | {
                                        data: string;
                                        filename?: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "file-id";
                                      }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-data";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-url";
                                        url: string;
                                      }
                                    | {
                                        fileId: string | Record<string, string>;
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "image-file-id";
                                      }
                                    | {
                                        providerOptions?: Record<
                                          string,
                                          Record<string, any>
                                        >;
                                        type: "custom";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                        | {
                            approvalId: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            type: "tool-approval-request";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<
                    | {
                        args?: any;
                        experimental_content?: Array<
                          | { text: string; type: "text" }
                          | { data: string; mimeType?: string; type: "image" }
                        >;
                        isError?: boolean;
                        output?:
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-text";
                              value: string;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              type: "error-json";
                              value: any;
                            }
                          | {
                              providerOptions?: Record<
                                string,
                                Record<string, any>
                              >;
                              reason?: string;
                              type: "execution-denied";
                            }
                          | {
                              type: "content";
                              value: Array<
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    text: string;
                                    type: "text";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    type: "media";
                                  }
                                | {
                                    data: string;
                                    filename?: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "file-id";
                                  }
                                | {
                                    data: string;
                                    mediaType: string;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-data";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-url";
                                    url: string;
                                  }
                                | {
                                    fileId: string | Record<string, string>;
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "image-file-id";
                                  }
                                | {
                                    providerOptions?: Record<
                                      string,
                                      Record<string, any>
                                    >;
                                    type: "custom";
                                  }
                              >;
                            };
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        result?: any;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-result";
                      }
                    | {
                        approvalId: string;
                        approved: boolean;
                        providerExecuted?: boolean;
                        providerMetadata?: Record<string, Record<string, any>>;
                        providerOptions?: Record<string, Record<string, any>>;
                        reason?: string;
                        type: "tool-approval-response";
                      }
                  >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerOptions?: Record<string, Record<string, any>>;
            status?: "pending" | "success" | "failed";
          };
        },
        {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mediaType?: string;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mediaType?: string;
                          mimeType?: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args?: any;
                          input: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args: any;
                          input?: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-text";
                                value: string;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "error-json";
                                value: any;
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                reason?: string;
                                type: "execution-denied";
                              }
                            | {
                                type: "content";
                                value: Array<
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      text: string;
                                      type: "text";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                  | {
                                      data: string;
                                      filename?: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "file-id";
                                    }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-data";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-url";
                                      url: string;
                                    }
                                  | {
                                      fileId: string | Record<string, string>;
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "image-file-id";
                                    }
                                  | {
                                      providerOptions?: Record<
                                        string,
                                        Record<string, any>
                                      >;
                                      type: "custom";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                      | {
                          approvalId: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          type: "tool-approval-request";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<
                  | {
                      args?: any;
                      experimental_content?: Array<
                        | { text: string; type: "text" }
                        | { data: string; mimeType?: string; type: "image" }
                      >;
                      isError?: boolean;
                      output?:
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-text";
                            value: string;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "error-json";
                            value: any;
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            reason?: string;
                            type: "execution-denied";
                          }
                        | {
                            type: "content";
                            value: Array<
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  text: string;
                                  type: "text";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  type: "media";
                                }
                              | {
                                  data: string;
                                  filename?: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "file-id";
                                }
                              | {
                                  data: string;
                                  mediaType: string;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-data";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-url";
                                  url: string;
                                }
                              | {
                                  fileId: string | Record<string, string>;
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "image-file-id";
                                }
                              | {
                                  providerOptions?: Record<
                                    string,
                                    Record<string, any>
                                  >;
                                  type: "custom";
                                }
                            >;
                          };
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      result?: any;
                      toolCallId: string;
                      toolName: string;
                      type: "tool-result";
                    }
                  | {
                      approvalId: string;
                      approved: boolean;
                      providerExecuted?: boolean;
                      providerMetadata?: Record<string, Record<string, any>>;
                      providerOptions?: Record<string, Record<string, any>>;
                      reason?: string;
                      type: "tool-approval-response";
                    }
                >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }
      >;
    };
    streams: {
      abort: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          reason: string;
          streamId: string;
        },
        boolean
      >;
      abortByOrder: FunctionReference<
        "mutation",
        "internal",
        { order: number; reason: string; threadId: string },
        boolean
      >;
      addDelta: FunctionReference<
        "mutation",
        "internal",
        { end: number; parts: Array<any>; start: number; streamId: string },
        boolean
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          stepOrder: number;
          threadId: string;
          userId?: string;
        },
        string
      >;
      deleteAllStreamsForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        { deltaCursor?: string; streamOrder?: number; threadId: string },
        { deltaCursor?: string; isDone: boolean; streamOrder?: number }
      >;
      deleteAllStreamsForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { threadId: string },
        null
      >;
      deleteStreamAsync: FunctionReference<
        "mutation",
        "internal",
        { cursor?: string; streamId: string },
        null
      >;
      deleteStreamSync: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      finish: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          streamId: string;
        },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          startOrder?: number;
          statuses?: Array<"streaming" | "finished" | "aborted">;
          threadId: string;
        },
        Array<{
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          status: "streaming" | "finished" | "aborted";
          stepOrder: number;
          streamId: string;
          userId?: string;
        }>
      >;
      listDeltas: FunctionReference<
        "query",
        "internal",
        {
          cursors: Array<{ cursor: number; streamId: string }>;
          threadId: string;
        },
        Array<{
          end: number;
          parts: Array<any>;
          start: number;
          streamId: string;
        }>
      >;
    };
    threads: {
      createThread: FunctionReference<
        "mutation",
        "internal",
        {
          defaultSystemPrompt?: string;
          parentThreadIds?: Array<string>;
          summary?: string;
          title?: string;
          userId?: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
      deleteAllForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        {
          cursor?: string;
          deltaCursor?: string;
          limit?: number;
          messagesDone?: boolean;
          streamOrder?: number;
          streamsDone?: boolean;
          threadId: string;
        },
        { isDone: boolean }
      >;
      deleteAllForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { limit?: number; threadId: string },
        null
      >;
      getThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        } | null
      >;
      listThreadsByUserId: FunctionReference<
        "query",
        "internal",
        {
          order?: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            status: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchThreadTitles: FunctionReference<
        "query",
        "internal",
        { limit: number; query: string; userId?: string | null },
        Array<{
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }>
      >;
      updateThread: FunctionReference<
        "mutation",
        "internal",
        {
          patch: {
            status?: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          };
          threadId: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
    };
    users: {
      deleteAllForUserId: FunctionReference<
        "action",
        "internal",
        { userId: string },
        null
      >;
      deleteAllForUserIdAsync: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        boolean
      >;
      listUsersWithThreads: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<string>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
    vector: {
      index: {
        deleteBatch: FunctionReference<
          "mutation",
          "internal",
          {
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
          },
          null
        >;
        deleteBatchForThread: FunctionReference<
          "mutation",
          "internal",
          {
            cursor?: string;
            limit: number;
            model: string;
            threadId: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          { continueCursor: string; isDone: boolean }
        >;
        insertBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            vectors: Array<{
              messageId?: string;
              model: string;
              table: string;
              threadId?: string;
              userId?: string;
              vector: Array<number>;
            }>;
          },
          Array<
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
          >
        >;
        paginate: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            limit: number;
            table?: string;
            targetModel: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          {
            continueCursor: string;
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
            isDone: boolean;
          }
        >;
        updateBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectors: Array<{
              id:
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string;
              model: string;
              vector: Array<number>;
            }>;
          },
          null
        >;
      };
    };
  };
  polar: {
    lib: {
      createProduct: FunctionReference<
        "mutation",
        "internal",
        {
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              maximumAmount?: number | null;
              minimumAmount?: number | null;
              modifiedAt: string | null;
              presetAmount?: number | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "day" | "week" | "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
          };
        },
        any
      >;
      createSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          subscription: {
            amount: number | null;
            cancelAtPeriodEnd: boolean;
            checkoutId: string | null;
            createdAt: string;
            currency: string | null;
            currentPeriodEnd: string | null;
            currentPeriodStart: string;
            customerCancellationComment?: string | null;
            customerCancellationReason?: string | null;
            customerId: string;
            endedAt: string | null;
            id: string;
            metadata: Record<string, any>;
            modifiedAt: string | null;
            priceId?: string;
            productId: string;
            recurringInterval: "day" | "week" | "month" | "year" | null;
            startedAt: string | null;
            status: string;
          };
        },
        any
      >;
      getCurrentSubscription: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              maximumAmount?: number | null;
              minimumAmount?: number | null;
              modifiedAt: string | null;
              presetAmount?: number | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "day" | "week" | "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
          };
          productId: string;
          recurringInterval: "day" | "week" | "month" | "year" | null;
          startedAt: string | null;
          status: string;
        } | null
      >;
      getCustomerByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { id: string; metadata?: Record<string, any>; userId: string } | null
      >;
      getProduct: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          createdAt: string;
          description: string | null;
          id: string;
          isArchived: boolean;
          isRecurring: boolean;
          medias: Array<{
            checksumEtag: string | null;
            checksumSha256Base64: string | null;
            checksumSha256Hex: string | null;
            createdAt: string;
            id: string;
            isUploaded: boolean;
            lastModifiedAt: string | null;
            mimeType: string;
            name: string;
            organizationId: string;
            path: string;
            publicUrl: string;
            service?: string;
            size: number;
            sizeReadable: string;
            storageVersion: string | null;
            version: string | null;
          }>;
          metadata?: Record<string, any>;
          modifiedAt: string | null;
          name: string;
          organizationId: string;
          prices: Array<{
            amountType?: string;
            createdAt: string;
            id: string;
            isArchived: boolean;
            maximumAmount?: number | null;
            minimumAmount?: number | null;
            modifiedAt: string | null;
            presetAmount?: number | null;
            priceAmount?: number;
            priceCurrency?: string;
            productId: string;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
            type?: string;
          }>;
          recurringInterval?: "day" | "week" | "month" | "year" | null;
        } | null
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          productId: string;
          recurringInterval: "day" | "week" | "month" | "year" | null;
          startedAt: string | null;
          status: string;
        } | null
      >;
      insertCustomer: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: Record<string, any>; userId: string },
        string
      >;
      listCustomerSubscriptions: FunctionReference<
        "query",
        "internal",
        { customerId: string },
        Array<{
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          productId: string;
          recurringInterval: "day" | "week" | "month" | "year" | null;
          startedAt: string | null;
          status: string;
        }>
      >;
      listProducts: FunctionReference<
        "query",
        "internal",
        { includeArchived?: boolean },
        Array<{
          createdAt: string;
          description: string | null;
          id: string;
          isArchived: boolean;
          isRecurring: boolean;
          medias: Array<{
            checksumEtag: string | null;
            checksumSha256Base64: string | null;
            checksumSha256Hex: string | null;
            createdAt: string;
            id: string;
            isUploaded: boolean;
            lastModifiedAt: string | null;
            mimeType: string;
            name: string;
            organizationId: string;
            path: string;
            publicUrl: string;
            service?: string;
            size: number;
            sizeReadable: string;
            storageVersion: string | null;
            version: string | null;
          }>;
          metadata?: Record<string, any>;
          modifiedAt: string | null;
          name: string;
          organizationId: string;
          priceAmount?: number;
          prices: Array<{
            amountType?: string;
            createdAt: string;
            id: string;
            isArchived: boolean;
            maximumAmount?: number | null;
            minimumAmount?: number | null;
            modifiedAt: string | null;
            presetAmount?: number | null;
            priceAmount?: number;
            priceCurrency?: string;
            productId: string;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
            type?: string;
          }>;
          recurringInterval?: "day" | "week" | "month" | "year" | null;
        }>
      >;
      listUserSubscriptions: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              maximumAmount?: number | null;
              minimumAmount?: number | null;
              modifiedAt: string | null;
              presetAmount?: number | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "day" | "week" | "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
          } | null;
          productId: string;
          recurringInterval: "day" | "week" | "month" | "year" | null;
          startedAt: string | null;
          status: string;
        }>
      >;
      syncProducts: FunctionReference<
        "action",
        "internal",
        { polarAccessToken: string; server: "sandbox" | "production" },
        any
      >;
      updateProduct: FunctionReference<
        "mutation",
        "internal",
        {
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              maximumAmount?: number | null;
              minimumAmount?: number | null;
              modifiedAt: string | null;
              presetAmount?: number | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "day" | "week" | "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
          };
        },
        any
      >;
      updateProducts: FunctionReference<
        "mutation",
        "internal",
        {
          polarAccessToken: string;
          products: Array<{
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              maximumAmount?: number | null;
              minimumAmount?: number | null;
              modifiedAt: string | null;
              presetAmount?: number | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "day" | "week" | "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "day" | "week" | "month" | "year" | null;
          }>;
        },
        any
      >;
      updateSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          subscription: {
            amount: number | null;
            cancelAtPeriodEnd: boolean;
            checkoutId: string | null;
            createdAt: string;
            currency: string | null;
            currentPeriodEnd: string | null;
            currentPeriodStart: string;
            customerCancellationComment?: string | null;
            customerCancellationReason?: string | null;
            customerId: string;
            endedAt: string | null;
            id: string;
            metadata: Record<string, any>;
            modifiedAt: string | null;
            priceId?: string;
            productId: string;
            recurringInterval: "day" | "week" | "month" | "year" | null;
            startedAt: string | null;
            status: string;
          };
        },
        any
      >;
      upsertCustomer: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: Record<string, any>; userId: string },
        string
      >;
    };
  };
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
  rag: {
    chunks: {
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          chunks: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entryId: string;
          startOrder: number;
        },
        { status: "pending" | "ready" | "replaced" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          order: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            metadata?: Record<string, any>;
            order: number;
            state: "pending" | "ready" | "replaced";
            text: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      replaceChunksPage: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        { nextStartOrder: number; status: "pending" | "ready" | "replaced" }
      >;
    };
    entries: {
      add: FunctionReference<
        "mutation",
        "internal",
        {
          allChunks?: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        {
          created: boolean;
          entryId: string;
          status: "pending" | "ready" | "replaced";
        }
      >;
      addAsync: FunctionReference<
        "mutation",
        "internal",
        {
          chunker: string;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        { created: boolean; entryId: string; status: "pending" | "ready" }
      >;
      deleteAsync: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        null
      >;
      deleteByKeyAsync: FunctionReference<
        "mutation",
        "internal",
        { beforeVersion?: number; key: string; namespaceId: string },
        null
      >;
      deleteByKeySync: FunctionReference<
        "action",
        "internal",
        { key: string; namespaceId: string },
        null
      >;
      deleteSync: FunctionReference<
        "action",
        "internal",
        { entryId: string },
        null
      >;
      findByContentHash: FunctionReference<
        "query",
        "internal",
        {
          contentHash: string;
          dimension: number;
          filterNames: Array<string>;
          key: string;
          modelId: string;
          namespace: string;
        },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          namespaceId?: string;
          order?: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        {
          replacedEntry: {
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          } | null;
        }
      >;
    };
    namespaces: {
      deleteNamespace: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          deletedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
      deleteNamespaceSync: FunctionReference<
        "action",
        "internal",
        { namespaceId: string },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | {
          createdAt: number;
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          namespaceId: string;
          status: "pending" | "ready" | "replaced";
          version: number;
        }
      >;
      getOrCreate: FunctionReference<
        "mutation",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          onComplete?: string;
          status: "pending" | "ready";
        },
        { namespaceId: string; status: "pending" | "ready" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listNamespaceVersions: FunctionReference<
        "query",
        "internal",
        {
          namespace: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      lookup: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | string
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          replacedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
    };
    search: {
      search: FunctionReference<
        "action",
        "internal",
        {
          chunkContext?: { after: number; before: number };
          dimension?: number;
          embedding?: Array<number>;
          filters: Array<{ name: string; value: any }>;
          limit: number;
          modelId: string;
          namespace: string;
          searchType?: "vector" | "text" | "hybrid";
          textQuery?: string;
          textWeight?: number;
          vectorScoreThreshold?: number;
          vectorWeight?: number;
        },
        {
          entries: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          results: Array<{
            content: Array<{ metadata?: Record<string, any>; text: string }>;
            entryId: string;
            order: number;
            score: number;
            startOrder: number;
          }>;
        }
      >;
    };
  };
  r2: {
    lib: {
      deleteMetadata: FunctionReference<
        "mutation",
        "internal",
        { bucket: string; key: string },
        null
      >;
      deleteObject: FunctionReference<
        "mutation",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          secretAccessKey: string;
        },
        null
      >;
      deleteR2Object: FunctionReference<
        "action",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          secretAccessKey: string;
        },
        null
      >;
      getMetadata: FunctionReference<
        "query",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          secretAccessKey: string;
        },
        {
          bucket: string;
          bucketLink: string;
          contentType?: string;
          key: string;
          lastModified: string;
          link: string;
          sha256?: string;
          size?: number;
          url: string;
        } | null
      >;
      listMetadata: FunctionReference<
        "query",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          cursor?: string;
          endpoint: string;
          limit?: number;
          secretAccessKey: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            bucket: string;
            bucketLink: string;
            contentType?: string;
            key: string;
            lastModified: string;
            link: string;
            sha256?: string;
            size?: number;
            url: string;
          }>;
          pageStatus?: null | "SplitRecommended" | "SplitRequired";
          splitCursor?: null | string;
        }
      >;
      store: FunctionReference<
        "action",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          secretAccessKey: string;
          url: string;
        },
        any
      >;
      syncMetadata: FunctionReference<
        "action",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          onComplete?: string;
          secretAccessKey: string;
        },
        null
      >;
      upsertMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          bucket: string;
          contentType?: string;
          key: string;
          lastModified: string;
          link: string;
          sha256?: string;
          size?: number;
        },
        { isNew: boolean }
      >;
    };
  };
};
