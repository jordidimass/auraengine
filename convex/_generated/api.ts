/* eslint-disable */
/**
 * Generated API utilities.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import { anyApi } from "convex/server";
import type * as auth from "../auth.js";
import type * as brands from "../brands.js";
import type * as preferences from "../preferences.js";

const fullApi: ApiFromModules<{
  auth: typeof auth;
  brands: typeof brands;
  preferences: typeof preferences;
}> = anyApi as never;

export const api: FilterApi<
  typeof fullApi,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FunctionReference<any, "public">
> = anyApi as never;

export const internal: FilterApi<
  typeof fullApi,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FunctionReference<any, "internal">
> = anyApi as never;
