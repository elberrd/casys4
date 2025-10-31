/**
 * Bulk Operations - Admin-only mutations for processing multiple records
 *
 * This module provides efficient bulk operations for:
 * - Importing people from CSV
 * - Creating multiple individual processes
 * - Updating status for multiple processes
 *
 * All operations require admin role and include activity logging
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { generateDocumentChecklist } from "./lib/documentChecklist";
import { logStatusChange } from "./lib/processHistory";
import { isValidIndividualStatusTransition } from "./lib/statusValidation";
import { internal } from "./_generated/api";

/**
 * Bulk import people from CSV data
 * Returns summary of successful and failed imports
 */
export const bulkImportPeople = mutation({
  args: {
    people: v.array(
      v.object({
        fullName: v.string(),
        email: v.string(),
        cpf: v.string(),
        birthDate: v.string(),
        nationality: v.string(),
        gender: v.optional(v.string()),
        maritalStatus: v.optional(v.string()),
        phone: v.optional(v.string()),
        currentCity: v.optional(v.string()),
        currentState: v.optional(v.string()),
        currentCountry: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const admin = await requireAdmin(ctx);

    const results = {
      successful: [] as Id<"people">[],
      failed: [] as { index: number; name: string; reason: string }[],
      totalProcessed: args.people.length,
    };

    // Process each person
    for (let i = 0; i < args.people.length; i++) {
      const personData = args.people[i];

      try {
        // Check for duplicate email or CPF
        const existingByEmail = await ctx.db
          .query("people")
          .withIndex("by_email", (q) => q.eq("email", personData.email))
          .first();

        if (existingByEmail) {
          results.failed.push({
            index: i + 1,
            name: personData.fullName,
            reason: `Email ${personData.email} already exists`,
          });
          continue;
        }

        if (personData.cpf) {
          const existingByCPF = await ctx.db
            .query("people")
            .withIndex("by_cpf", (q) => q.eq("cpf", personData.cpf))
            .first();

          if (existingByCPF) {
            results.failed.push({
              index: i + 1,
              name: personData.fullName,
              reason: `CPF ${personData.cpf} already exists`,
            });
            continue;
          }
        }

        // Find or create nationality
        const nationalityName = personData.nationality;
        let nationalityId: Id<"countries"> | null = null;

        const allCountries = await ctx.db.query("countries").collect();
        const matchingCountry = allCountries.find(
          (c) => c.name.toLowerCase() === nationalityName.toLowerCase()
        );

        if (matchingCountry) {
          nationalityId = matchingCountry._id;
        } else {
          // Create new country if not found
          nationalityId = await ctx.db.insert("countries", {
            name: nationalityName,
            code: nationalityName.substring(0, 2).toUpperCase(),
            iso3: nationalityName.substring(0, 3).toUpperCase(),
          });
        }

        // Find or create current city/state if provided
        let currentCityId: Id<"cities"> | null = null;

        if (personData.currentCity && personData.currentState && personData.currentCountry) {
          // Find country
          const currentCountry = allCountries.find(
            (c) => c.name.toLowerCase() === personData.currentCountry!.toLowerCase()
          );

          if (currentCountry) {
            // Find state
            const allStates = await ctx.db
              .query("states")
              .withIndex("by_country", (q) => q.eq("countryId", currentCountry._id))
              .collect();

            let stateId: Id<"states"> | null = null;
            const matchingState = allStates.find(
              (s) => s.name.toLowerCase() === personData.currentState!.toLowerCase()
            );

            if (matchingState) {
              stateId = matchingState._id;
            } else {
              // Create new state
              stateId = await ctx.db.insert("states", {
                name: personData.currentState,
                code: personData.currentState.substring(0, 2).toUpperCase(),
                countryId: currentCountry._id,
              });
            }

            // Find or create city
            const allCities = await ctx.db
              .query("cities")
              .withIndex("by_state", (q) => q.eq("stateId", stateId))
              .collect();

            const matchingCity = allCities.find(
              (c) => c.name.toLowerCase() === personData.currentCity!.toLowerCase()
            );

            if (matchingCity) {
              currentCityId = matchingCity._id;
            } else {
              // Create new city
              currentCityId = await ctx.db.insert("cities", {
                name: personData.currentCity,
                stateId: stateId,
                hasFederalPolice: false,
              });
            }
          }
        }

        // Use nationality's default city as birthCity if not provided
        // For bulk import, we'll use the first city we find for that country
        let birthCityId: Id<"cities">;

        if (currentCityId) {
          birthCityId = currentCityId;
        } else {
          // Find any city (create a default one if needed)
          const defaultBrazil = allCountries.find((c) => c.name === "Brazil");
          if (!defaultBrazil) {
            throw new Error("Default Brazil country not found in database");
          }

          const defaultState = await ctx.db
            .query("states")
            .withIndex("by_country", (q) => q.eq("countryId", defaultBrazil._id))
            .first();

          if (!defaultState) {
            throw new Error("No states found for default country");
          }

          const defaultCity = await ctx.db
            .query("cities")
            .withIndex("by_state", (q) => q.eq("stateId", defaultState._id))
            .first();

          if (!defaultCity) {
            throw new Error("No cities found for default state");
          }

          birthCityId = defaultCity._id;
          if (!currentCityId) {
            currentCityId = defaultCity._id;
          }
        }

        // Create person record
        const personId = await ctx.db.insert("people", {
          fullName: personData.fullName,
          email: personData.email.toLowerCase(),
          cpf: personData.cpf || undefined,
          birthDate: personData.birthDate,
          birthCityId: birthCityId,
          nationalityId: nationalityId,
          maritalStatus: personData.maritalStatus || "Single",
          profession: "To be updated", // Required field, set default
          motherName: "To be updated", // Required field, set default
          fatherName: "To be updated", // Required field, set default
          phoneNumber: personData.phone || "To be updated",
          address: "To be updated", // Required field, set default
          currentCityId: currentCityId || birthCityId,
          photoUrl: undefined,
          notes: "Imported via bulk CSV import",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        results.successful.push(personId);

        // Log activity
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: admin.userId,
          action: "bulk_import_person",
          entityType: "people",
          entityId: personId,
          details: {
            fullName: personData.fullName,
            email: personData.email,
            importIndex: i + 1,
          },
        });
      } catch (error) {
        results.failed.push({
          index: i + 1,
          name: personData.fullName,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId: admin.userId,
      action: "bulk_import_people_completed",
      entityType: "people",
      entityId: "bulk",
      details: {
        totalProcessed: results.totalProcessed,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    });

    return results;
  },
});

/**
 * Bulk create individual processes for multiple people
 */
export const bulkCreateIndividualProcesses = mutation({
  args: {
    mainProcessId: v.id("mainProcesses"),
    personIds: v.array(v.id("people")),
    legalFrameworkId: v.id("legalFrameworks"),
    cboId: v.optional(v.id("cboCodes")),
    caseStatusId: v.id("caseStatuses"), // NEW: Use case status ID
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    deadlineDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const admin = await requireAdmin(ctx);

    // Verify main process exists
    const mainProcess = await ctx.db.get(args.mainProcessId);
    if (!mainProcess) {
      throw new Error("Main process not found");
    }

    // Verify legal framework exists
    const legalFramework = await ctx.db.get(args.legalFrameworkId);
    if (!legalFramework) {
      throw new Error("Legal framework not found");
    }

    // Verify case status exists
    const caseStatus = await ctx.db.get(args.caseStatusId);
    if (!caseStatus) {
      throw new Error("Case status not found");
    }

    // For backward compatibility, derive status string from case status if not provided
    const statusString = args.status || caseStatus.code;

    const results = {
      successful: [] as Id<"individualProcesses">[],
      failed: [] as { personId: Id<"people">; reason: string }[],
      totalProcessed: args.personIds.length,
    };

    // Process each person
    for (const personId of args.personIds) {
      try {
        // Verify person exists
        const person = await ctx.db.get(personId);
        if (!person) {
          results.failed.push({
            personId,
            reason: "Person not found",
          });
          continue;
        }

        // Check for duplicate (person already in this main process)
        const existing = await ctx.db
          .query("individualProcesses")
          .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", args.mainProcessId))
          .collect();

        const duplicate = existing.find((ip) => ip.personId === personId);
        if (duplicate) {
          results.failed.push({
            personId,
            reason: `${person.fullName} is already in this main process`,
          });
          continue;
        }

        // Create individual process
        const individualProcessId = await ctx.db.insert("individualProcesses", {
          mainProcessId: args.mainProcessId,
          personId: personId,
          caseStatusId: args.caseStatusId, // NEW: Store case status ID
          status: statusString, // DEPRECATED: Keep for backward compatibility
          legalFrameworkId: args.legalFrameworkId,
          cboId: args.cboId,
          deadlineDate: args.deadlineDate,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Generate document checklist for this individual process
        await generateDocumentChecklist(ctx, individualProcessId);

        // Create initial status record with case status ID
        await ctx.db.insert("individualProcessStatuses", {
          individualProcessId,
          caseStatusId: args.caseStatusId, // NEW: Store case status ID
          statusName: caseStatus.name, // Store case status name
          isActive: true,
          createdAt: Date.now(),
          changedAt: Date.now(),
          changedBy: admin.userId,
          notes: "Initial status on bulk creation",
        });

        results.successful.push(individualProcessId);

        // Log activity
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: admin.userId,
          action: "bulk_create_individual_process",
          entityType: "individualProcesses",
          entityId: individualProcessId,
          details: {
            personId,
            personName: person.fullName,
            mainProcessId: args.mainProcessId,
            caseStatusId: args.caseStatusId,
            caseStatusName: caseStatus.name,
            status: statusString, // DEPRECATED: Keep for backward compatibility
          },
        });
      } catch (error) {
        results.failed.push({
          personId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId: admin.userId,
      action: "bulk_create_individual_processes_completed",
      entityType: "individualProcesses",
      entityId: "bulk",
      details: {
        mainProcessId: args.mainProcessId,
        totalProcessed: results.totalProcessed,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    });

    return results;
  },
});

/**
 * Bulk update status for multiple individual processes
 */
export const bulkUpdateIndividualProcessStatus = mutation({
  args: {
    individualProcessIds: v.array(v.id("individualProcesses")),
    newCaseStatusId: v.optional(v.id("caseStatuses")), // NEW: Use case status ID
    newStatus: v.string(), // DEPRECATED: Kept for backward compatibility but still required for validation
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const admin = await requireAdmin(ctx);

    // Get case status if provided
    let newCaseStatus = null;
    if (args.newCaseStatusId) {
      newCaseStatus = await ctx.db.get(args.newCaseStatusId);
      if (!newCaseStatus) {
        throw new Error("Case status not found");
      }
    }

    const results = {
      successful: [] as Id<"individualProcesses">[],
      failed: [] as { processId: Id<"individualProcesses">; reason: string }[],
      totalProcessed: args.individualProcessIds.length,
    };

    // Process each individual process
    for (const processId of args.individualProcessIds) {
      try {
        // Get current process
        const process = await ctx.db.get(processId);
        if (!process) {
          results.failed.push({
            processId,
            reason: "Individual process not found",
          });
          continue;
        }

        // Validate status transition
        if (process.status) {
          const isValidTransition = isValidIndividualStatusTransition(
            process.status,
            args.newStatus
          );

          if (!isValidTransition) {
            results.failed.push({
              processId,
              reason: `Invalid status transition from ${process.status} to ${args.newStatus}`,
            });
            continue;
          }
        }

        // Determine what to update
        const updateData: any = {
          status: args.newStatus, // DEPRECATED: Keep for backward compatibility
          updatedAt: Date.now(),
        };

        if (args.newCaseStatusId) {
          updateData.caseStatusId = args.newCaseStatusId; // NEW: Update case status ID
        }

        // Update status
        await ctx.db.patch(processId, updateData);

        // Deactivate old status records
        const oldStatuses = await ctx.db
          .query("individualProcessStatuses")
          .withIndex("by_individualProcess_active", (q) =>
            q.eq("individualProcessId", processId).eq("isActive", true)
          )
          .collect();

        for (const oldStatus of oldStatuses) {
          await ctx.db.patch(oldStatus._id, { isActive: false });
        }

        // Create new status record with case status ID
        if (newCaseStatus) {
          await ctx.db.insert("individualProcessStatuses", {
            individualProcessId: processId,
            caseStatusId: args.newCaseStatusId!,
            statusName: newCaseStatus.name,
            isActive: true,
            createdAt: Date.now(),
            changedAt: Date.now(),
            changedBy: admin.userId,
            notes: args.reason || "Bulk status update",
          });
        }

        results.successful.push(processId);

        // Get person for logging
        const person = await ctx.db.get(process.personId);

        // Get old case status for logging
        const oldCaseStatus = process.caseStatusId
          ? await ctx.db.get(process.caseStatusId)
          : null;

        // Log activity
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: admin.userId,
          action: "bulk_update_status",
          entityType: "individualProcesses",
          entityId: processId,
          details: {
            personName: person?.fullName,
            previousCaseStatusId: process.caseStatusId,
            previousCaseStatusName: oldCaseStatus?.name,
            previousStatus: process.status, // DEPRECATED: Keep for backward compatibility
            newCaseStatusId: args.newCaseStatusId,
            newCaseStatusName: newCaseStatus?.name,
            newStatus: args.newStatus, // DEPRECATED: Keep for backward compatibility
            reason: args.reason,
          },
        });
      } catch (error) {
        results.failed.push({
          processId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId: admin.userId,
      action: "bulk_update_status_completed",
      entityType: "individualProcesses",
      entityId: "bulk",
      details: {
        newStatus: args.newStatus,
        totalProcessed: results.totalProcessed,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    });

    return results;
  },
});
