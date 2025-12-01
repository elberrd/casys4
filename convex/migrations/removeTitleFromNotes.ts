import { mutation } from "../_generated/server";

/**
 * Migration to remove the deprecated 'title' field from notes
 * Notes will now only use the content field for identification
 */
export default mutation({
  args: {},
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();

    let updated = 0;
    for (const note of notes) {
      // Check if the document has a 'title' field (using type assertion since it's not in schema)
      const doc = note as typeof note & { title?: string };

      if ("title" in doc) {
        // Extract only the fields that are in the current schema (without title)
        const cleanedDoc = {
          content: doc.content,
          date: doc.date,
          individualProcessId: doc.individualProcessId,
          collectiveProcessId: doc.collectiveProcessId,
          createdBy: doc.createdBy,
          isActive: doc.isActive,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };

        // Replace the document with only the valid fields
        await ctx.db.replace(note._id, cleanedDoc);
        updated++;
      }
    }

    return { message: `Migration complete. Updated ${updated} of ${notes.length} notes.` };
  },
});
