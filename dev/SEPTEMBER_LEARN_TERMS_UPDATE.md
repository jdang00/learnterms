# LearnTerms Update 18 September

This update aims to provide better ergonomics for quality of life, a bevy of bug fixes, and a few final major feature implementations before the the service exits beta in the start of October.

## Immediate Bug fixes
The following are immediate bug fixes that need to be pushed for users who are using the platform almost every day. They are listed by priority. These fixes should be simple and should not require advanced changes to implement.

- When users select "show incomplete" or "show flagged", there are no longer correct options in the filtered questions. It also gets messy when users flag in "show incomplete" mode. Define how to handle this while keeping reactivity.
- When changes to answers are made on the backend, it doesn't reconcile right when answers on the front end. Make sure to especially check for new correct options and make sure the client accepts the right changes. Treat the database as a source of truth.
- Use local storage to know if the users prefer auto next or shuffle options tucked away in the settings menu. It should not change if they switch to a different module.
- Add keyboard shortcuts that let the user pick options A-J using keyboard shortcuts 1-0 in that order. Update the keyboard shortcuts hint accordingly.
- Confirm that getProgressForClass query isn't being used anywhere. If so, it needs to not refresh as it's taking up data bandwidth not to display data.



## Ergonomic Updates
These updates take a bit more time but are going to be high yield to improve user experience.

- Edit modals on the admin page should be connected to the URL in some ?edit parameter. This way, if the user is an admin, they can have a quick link to edit it on the quizzing page that will bring them to the admin page to edit the question via modal.
- Admin pages should have a view module button that takes them to the respective class module quizzing view as well.
- Find out how the auth queries work across the codebase. We are getting errors for long standing queries. We're getting errors like
```
Uncaught Error: Unauthorized
    at input (../../src/convex/authQueries.ts:11:16)
    at async handler (../../node_modules/convex-helpers/server/customFunctions.js:265:30)
```
This is actually an error for when the WebSocket times out I think.
- Optomize indices across the codebase for more efficent queries.
- Add start and clear buttons on the non focus mode page.


## Big Feature Updates
- Add Class Progress module. For now, just simply gather documents for class progress. It should provide them with a list of their classmates. They can click into a classmate view and see their progress on each module for each class. Eventually we'll add more overarching stats and other things.
- Add a table as an attatchment. It can be added on the admin page and simply render as an HTML table as an attatchment along with pictures and documents on the sidebar.
