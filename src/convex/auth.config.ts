export default {
    providers: [
      {
        domain: process.env.PUBLIC_CLERK_FRONTEND_API_URL,
        applicationID: "convex",
      },
    ],
  };