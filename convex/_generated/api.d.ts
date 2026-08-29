/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analysis from "../analysis.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as brandDefaults from "../brandDefaults.js";
import type * as brands from "../brands.js";
import type * as domain from "../domain.js";
import type * as http from "../http.js";
import type * as lib_llm from "../lib/llm.js";
import type * as lib_risk from "../lib/risk.js";
import type * as lib_scrape from "../lib/scrape.js";
import type * as preferences from "../preferences.js";
import type * as publisher from "../publisher.js";
import type * as social from "../social.js";
import type * as stealAccess from "../stealAccess.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analysis: typeof analysis;
  assets: typeof assets;
  auth: typeof auth;
  authz: typeof authz;
  brandDefaults: typeof brandDefaults;
  brands: typeof brands;
  domain: typeof domain;
  http: typeof http;
  "lib/llm": typeof lib_llm;
  "lib/risk": typeof lib_risk;
  "lib/scrape": typeof lib_scrape;
  preferences: typeof preferences;
  publisher: typeof publisher;
  social: typeof social;
  stealAccess: typeof stealAccess;
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
