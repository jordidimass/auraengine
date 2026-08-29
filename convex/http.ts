import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { oauthCallback } from "./social";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/oauth/callback",
  method: "GET",
  handler: oauthCallback,
});

export default http;
