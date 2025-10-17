import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Get the current authenticated user's email
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});

// Example functions commented out - the "numbers" table no longer exists in the schema
// The project now uses countries, states, cities, processTypes, and legalFrameworks tables

// You can read data from the database via a query:
// export const listNumbers = query({
//   args: {
//     count: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const numbers = await ctx.db
//       .query("numbers")
//       .order("desc")
//       .take(args.count);
//     const userId = await getAuthUserId(ctx);
//     const user = userId === null ? null : await ctx.db.get(userId);
//     return {
//       viewer: user?.email ?? null,
//       numbers: numbers.reverse().map((number) => number.value),
//     };
//   },
// });

// You can write data to the database via a mutation:
// export const addNumber = mutation({
//   args: {
//     value: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const id = await ctx.db.insert("numbers", { value: args.value });
//     console.log("Added new document with id:", id);
//   },
// });

// You can fetch data from and send data to third-party APIs via an action:
// export const myAction = action({
//   args: {
//     first: v.number(),
//     second: v.string(),
//   },
//   handler: async (ctx, args) => {
//     //// Use the browser-like `fetch` API to send HTTP requests.
//     // const response = await ctx.fetch("https://api.thirdpartyservice.com");
//     // const data = await response.json();
//
//     //// Query data by running Convex queries.
//     const data = await ctx.runQuery(api.myFunctions.listNumbers, {
//       count: 10,
//     });
//     console.log(data);
//
//     //// Write data by running Convex mutations.
//     await ctx.runMutation(api.myFunctions.addNumber, {
//       value: args.first,
//     });
//   },
// });
