# Convex API Documentation

This document provides an overview of the Convex API files, including their purpose, access control recommendations, and suggestions for improvement.

## `src/convex/auth.config.ts`

### Purpose

This file configures the authentication providers for the Convex application. It specifies the Clerk domain and application ID.

### Access Control

- **Recommendation:** This file should be read-only for all users except for system administrators who are responsible for managing authentication settings.

### Recommendations

- No recommendations for this file. It is a simple configuration file.

## `src/convex/authQueries.ts`

### Purpose

This file contains a query to list all users in the database.

### Functions

- `listUsers`: Retrieves all users from the `users` table.

### Access Control

- **Recommendation:** Access to this query should be restricted to administrators only. Exposing a list of all users can be a security risk.

### Recommendations

- **Useless?** The `console.log("hello there", user);` line should be removed as it is not necessary for the function's purpose.
- It is also unclear what the purpose of this query is. If it is for debugging, it should be removed in production. If it is for an admin panel, it should be properly secured.

## `src/convex/chunkContent.ts`

### Purpose

This file manages the content chunks associated with documents in the content library. It includes functions for creating, reading, updating, and deleting chunks.

### Functions

- `getChunkByDocumentId`: Retrieves all chunks for a given document.
- `insertChunkContent`: Inserts a new content chunk.
- `deleteChunkContent`: Deletes a content chunk.
- `updateChunkContent`: Updates a content chunk.
- `processDocumentAndCreateChunks`: Processes a document, splits it into chunks, and creates the corresponding chunk records.
- `bulkCreateChunks`: Creates multiple chunks at once.
- `processMultipleChunks`: Processes multiple materials and creates chunks.
- `processPdfUrlAndCreateChunks`: Processes a PDF from a URL and creates chunks.

### Access Control

- **Recommendation:**
    - `getChunkByDocumentId`: Can be accessed by any authenticated user who has access to the document.
    - `insertChunkContent`, `deleteChunkContent`, `updateChunkContent`, `processDocumentAndCreateChunks`, `bulkCreateChunks`, `processMultipleChunks`, `processPdfUrlAndCreateChunks`: Should be restricted to users with "editor" or "admin" roles for the cohort.

### Recommendations

- The validation logic in `validateAndTrimChunkFields` is good.
- The functions that interact with external APIs (`processDocumentAndCreateChunks`, `processMultipleChunks`, `processPdfUrlAndCreateChunks`) should have more robust error handling and logging.
- Consider adding a "status" field to the `chunkContent` table to track the processing status of each chunk (e.g., "pending", "processing", "completed", "failed").

## `src/convex/class.ts`

### Purpose

This file manages classes within a cohort. It includes functions for creating, reading, updating, and deleting classes.

### Functions

- `getUserClasses`: Retrieves all classes for a given cohort.
- `getClassById`: Retrieves a single class by its ID.
- `getClassContentCounts`: Retrieves the number of modules and questions in a class.
- `updateClassOrder`: Updates the order of classes within a semester.
- `insertClass`: Inserts a new class.
- `deleteClass`: Deletes a class and all its associated modules and questions.
- `updateClass`: Updates a class.

### Access Control

- **Recommendation:**
    - `getUserClasses`, `getClassById`, `getClassContentCounts`: Can be accessed by any authenticated user in the cohort.
    - `updateClassOrder`, `insertClass`, `deleteClass`, `updateClass`: Should be restricted to users with "editor" or "admin" roles for the cohort.

### Recommendations

- The validation in `insertClass` and `updateClass` is well-implemented.
- The `deleteClass` function performs a cascading delete, which is good. However, for large classes, this could be a long-running operation. Consider using a background job to delete the class and its content.

## `src/convex/cohort.ts`

### Purpose

This file manages cohorts, which are groups of users (e.g., a class of students).

### Functions

- `validateCohortCode`: Validates a cohort's class code.
- `joinCohort`: Allows a user to join a cohort.
- `cohortCheck`: An internal query to check for a matching cohort.
- `createCohort`: Creates a new cohort.
- `deleteCohort`: Deletes a cohort.

### Access Control

- **Recommendation:**
    - `validateCohortCode`, `joinCohort`: Can be accessed by any authenticated user.
    - `createCohort`, `deleteCohort`: Should be restricted to system administrators.

### Recommendations

- The `deleteCohort` function should probably perform a cascading delete of all associated data (classes, modules, questions, etc.). As it is now, it will leave orphaned data in the database.

## `src/convex/contentLib.ts`

### Purpose

This file manages the content library for a cohort. The content library is a collection of documents that can be used to generate questions.

### Functions

- `getContentLibByCohort`: Retrieves all documents in the content library for a given cohort.
- `insertDocument`: Inserts a new document into the content library.
- `updateDocument`: Updates a document in the content library.
- `deleteDocument`: Marks a document as deleted.

### Access Control

- **Recommendation:**
    - `getContentLibByCohort`: Can be accessed by any authenticated user in the cohort.
    - `insertDocument`, `updateDocument`, `deleteDocument`: Should be restricted to users with "editor" or "admin" roles for the cohort.

### Recommendations

- The `deleteDocument` function performs a soft delete by setting the `deletedAt` field. This is a good practice.
- The validation in `updateDocument` is good.

## `src/convex/module.ts`

### Purpose

This file manages modules within a class. A module is a collection of questions.

### Functions

- `getClassModules`: Retrieves all published modules for a given class.
- `getAdminModule`: Retrieves all modules for a given class (for admin purposes).
- `getModuleById`: Retrieves a single module by its ID.
- `getModuleQuestionCount`: Retrieves the number of questions in a module.
- `getAdminModulesWithQuestionCounts`: Retrieves all modules with their question counts (for admin purposes).
- `updateModuleOrder`: Updates the order of modules within a class.
- `insertModule`: Inserts a new module.
- `deleteModule`: Deletes a module and all its associated questions.
- `updateModule`: Updates a module.
- `getAllModules`: Retrieves all modules in the database.

### Access Control

- **Recommendation:**
    - `getClassModules`, `getModuleById`, `getModuleQuestionCount`: Can be accessed by any authenticated user in the cohort.
    - `getAdminModule`, `getAdminModulesWithQuestionCounts`, `updateModuleOrder`, `insertModule`, `deleteModule`, `updateModule`: Should be restricted to users with "editor" or "admin" roles for the cohort.
    - `getAllModules`: Should be restricted to system administrators.

### Recommendations

- The validation in `insertModule` and `updateModule` is well-implemented.
- The `deleteModule` function performs a cascading delete, which is good.
- The `getAllModules` query could be a performance issue if there are a large number of modules. It should be used with caution.

## `src/convex/question.ts`

### Purpose

This file manages questions within a module.

### Functions

- `getQuestionsByModule`: Retrieves all published questions for a given module.
- `getQuestionsByModuleAdmin`: Retrieves all questions for a given module (for admin purposes).
- `getFirstQuestionInModule`: Retrieves the first question in a module.
- `insertQuestion`: Inserts a new question.
- `deleteQuestion`: Deletes a question.
- `bulkDeleteQuestions`: Deletes multiple questions at once.
- `updateQuestion`: Updates a question.
- `createQuestion`: Creates a new question.
- `bulkInsertQuestions`: Inserts multiple questions at once.
- `updateQuestionOrder`: Updates the order of questions within a module.
- `getAllQuestions`: Retrieves all questions in the database.
- `searchQuestionsByModuleAdmin`: Searches for questions within a module.
- `backfillQuestionSearchTextForModule`: A utility function to backfill the `searchText` field for a module.
- `backfillSearchTextForAllModules`: A utility function to backfill the `searchText` field for all modules.
- `generateQuestions`: Generates questions using a generative AI model.

### Access Control

- **Recommendation:**
    - `getQuestionsByModule`, `getFirstQuestionInModule`: Can be accessed by any authenticated user in the cohort.
    - `getQuestionsByModuleAdmin`, `insertQuestion`, `deleteQuestion`, `bulkDeleteQuestions`, `updateQuestion`, `createQuestion`, `bulkInsertQuestions`, `updateQuestionOrder`, `searchQuestionsByModuleAdmin`: Should be restricted to users with "editor" or "admin" roles for the cohort.
    - `getAllQuestions`, `backfillQuestionSearchTextForModule`, `backfillSearchTextForAllModules`: Should be restricted to system administrators.
    - `generateQuestions`: Should be restricted to users with "editor" or "admin" roles for the cohort.

### Recommendations

- The `computeSearchText` function is a good way to create a searchable text field.
- The `generateQuestions` action is a powerful feature. It should be monitored for usage and cost.
- The `backfill` mutations are useful for data migration, but should be used with care in a production environment.
- The `createQuestion` and `insertQuestion` functions seem to be duplicates. Consider merging them.

## `src/convex/schema.ts`

### Purpose

This file defines the database schema for the Convex application.

### Access Control

- **Recommendation:** This file should be read-only for all users except for system administrators who are responsible for managing the database schema.

### Recommendations

- The schema is well-defined and uses appropriate data types.
- The indexes are well-defined and should help with query performance.

## `src/convex/school.ts`

### Purpose

This file manages schools.

### Functions

- `getSchoolById`: Retrieves a school by its ID.
- `getSchoolByIdInternal`: An internal query to retrieve a school by its ID.
- `createSchool`: Creates a new school.
- `deleteSchool`: Deletes a school.

### Access Control

- **Recommendation:**
    - `getSchoolById`: Can be accessed by any authenticated user.
    - `createSchool`, `deleteSchool`: Should be restricted to system administrators.

### Recommendations

- The `deleteSchool` function should probably perform a cascading delete of all associated data (cohorts, classes, etc.).

## `src/convex/semester.ts`

### Purpose

This file manages semesters.

### Functions

- `getAllSemesters`: Retrieves all semesters.
- `createSemester`: Creates a new semester.
- `deleteSemester`: Deletes a semester.

### Access Control

- **Recommendation:**
    - `getAllSemesters`: Can be accessed by any authenticated user.
    - `createSemester`, `deleteSemester`: Should be restricted to system administrators.

### Recommendations

- The `deleteSemester` function should probably perform a cascading delete of all associated data (classes, etc.).

## `src/convex/userProgress.ts`

### Purpose

This file manages user progress through the learning materials.

### Functions

- `checkExistingRecord`: Checks if a user progress record exists.
- `getProgressForClass`: Retrieves the user's progress for a class.
- `getUserProgressForModule`: Retrieves the user's progress for a module.
- `saveUserProgress`: Saves the user's progress for a question.
- `deleteUserProgress`: Deletes a user's progress for a question.
- `clearUserProgressForModule`: Clears a user's progress for a module.

### Access Control

- **Recommendation:** All functions in this file should be accessible only to the user who owns the progress record.

### Recommendations

- The logic for calculating progress seems correct.
- The `console.log` in `getUserProgressForModule` should be removed.

## `src/convex/users.ts`

### Purpose

This file manages users.

### Functions

- `getUserById`: Retrieves a user by their Clerk User ID.
- `addUser`: Adds a new user.
- `list`: Retrieves all users.
- `store`: Stores a user from the Clerk identity.

### Access Control

- **Recommendation:**
    - `getUserById`: Can be accessed by the user themselves or by administrators.
    - `addUser`: Should be an internal function called by the `store` mutation.
    - `list`: Should be restricted to system administrators.
    - `store`: Can be accessed by any authenticated user.

### Recommendations

- The `list` query is the same as `listUsers` in `authQueries.ts`. They should be consolidated.
- The `store` mutation is a good way to keep the user data in sync with the Clerk identity.
