/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cities from "../cities.js";
import type * as countries from "../countries.js";
import type * as http from "../http.js";
import type * as legalFrameworks from "../legalFrameworks.js";
import type * as myFunctions from "../myFunctions.js";
import type * as processTypes from "../processTypes.js";
import type * as states from "../states.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cities: typeof cities;
  countries: typeof countries;
  http: typeof http;
  legalFrameworks: typeof legalFrameworks;
  myFunctions: typeof myFunctions;
  processTypes: typeof processTypes;
  states: typeof states;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
