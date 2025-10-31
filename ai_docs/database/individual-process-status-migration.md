# Individual Process Status Migration Guide

## Overview

This guide documents the migration from the legacy single-field status system to the new `individualProcessStatuses` table with complete status history tracking.

## Background

### Legacy System
- Status stored as a single string field in `individualProcesses.status`
- No status history tracking
- No audit trail for status changes
- Limited metadata about status transitions

### New System
- Many-to-many relationship via `individualProcessStatuses` table
- Complete status history with timestamps and user tracking
- Single active status constraint (enforced at application level)
- Optional notes for each status change
- Full audit trail for compliance

## Migration Architecture

### Parallel Systems Approach
During the transition period, both systems operate simultaneously:
1. **Legacy field**: `individualProcesses.status` (kept for backward compatibility)
2. **New table**: `individualProcessStatuses` (provides history and audit trail)

This ensures zero downtime and allows for gradual rollout.

## Migration Steps

### Prerequisites

1. **Backup Database**
   ```bash
   # Export current data before migration
   npm run convex:export
   ```

2. **Verify Schema Deployed**
   ```bash
   npm run dev
   # Ensure convex/schema.ts includes individualProcessStatuses table
   ```

3. **Review Existing Processes**
   ```typescript
   // Check how many processes need migration
   const stats = await ctx.runQuery(internal.individualProcesses.getMigrationStats)
   console.log(`Processes to migrate: ${stats.total}`)
   console.log(`Already migrated: ${stats.migrated}`)
   console.log(`Needs migration: ${stats.pending}`)
   ```

### Step 1: Deploy Migration Function

The migration function is located at `/convex/migrations/migrateIndividualProcessStatuses.ts`

**Key Migration Logic**:
```typescript
export const migrateIndividualProcessStatus = internalMutation({
  args: { processId: v.id("individualProcesses") },
  handler: async (ctx, { processId }) => {
    // 1. Get the process
    const process = await ctx.db.get(processId);

    // 2. Check if already migrated
    const existingStatus = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", processId))
      .first();

    if (existingStatus) {
      return { success: true, alreadyMigrated: true };
    }

    // 3. Create initial status record from legacy field
    await ctx.db.insert("individualProcessStatuses", {
      individualProcessId: processId,
      statusName: process.status,
      isActive: true,
      notes: "Migrated from legacy status field",
      changedBy: process.createdBy,
      changedAt: process._creationTime,
      createdAt: Date.now(),
    });

    return { success: true, alreadyMigrated: false };
  },
});
```

### Step 2: Run Migration

**Option A: Migrate All Processes (Batch)**
```typescript
// Run in Convex dashboard or via script
import { internal } from "./_generated/api";

export const migrateAllProcesses = internalMutation({
  handler: async (ctx) => {
    const processes = await ctx.db.query("individualProcesses").collect();

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const process of processes) {
      try {
        const result = await ctx.runMutation(
          internal.migrations.migrateIndividualProcessStatus,
          { processId: process._id }
        );

        if (result.alreadyMigrated) {
          skipped++;
        } else {
          migrated++;
        }
      } catch (error) {
        console.error(`Error migrating ${process._id}:`, error);
        errors++;
      }
    }

    return { migrated, skipped, errors, total: processes.length };
  },
});
```

**Option B: Migrate Single Process (Testing)**
```typescript
// Test with a single process first
await ctx.runMutation(internal.migrations.migrateIndividualProcessStatus, {
  processId: "jh7abc123..." as Id<"individualProcesses">
});
```

### Step 3: Verify Migration

Use the verification function to check migration success:

```typescript
export const verifyMigration = internalQuery({
  args: { processId: v.id("individualProcesses") },
  handler: async (ctx, { processId }) => {
    // Get process
    const process = await ctx.db.get(processId);

    // Get all status records
    const allStatuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", processId)
      )
      .collect();

    // Get active status
    const activeStatus = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess_active", (q) =>
        q.eq("individualProcessId", processId).eq("isActive", true)
      )
      .first();

    // Verify constraints
    const activeCount = allStatuses.filter(s => s.isActive).length;
    const migrationComplete = allStatuses.length > 0;
    const singleActiveStatus = activeCount === 1;
    const statusMatches = activeStatus?.statusName === process.status;

    return {
      processId,
      migrationComplete,
      singleActiveStatus,
      statusMatches,
      totalStatusRecords: allStatuses.length,
      activeStatusCount: activeCount,
      legacyStatus: process.status,
      currentActiveStatus: activeStatus?.statusName,
      issues: [
        !migrationComplete && "No status records found",
        !singleActiveStatus && `Multiple active statuses: ${activeCount}`,
        !statusMatches && "Legacy and current status don't match",
      ].filter(Boolean),
    };
  },
});
```

**Expected Output**:
```json
{
  "processId": "jh7abc123...",
  "migrationComplete": true,
  "singleActiveStatus": true,
  "statusMatches": true,
  "totalStatusRecords": 1,
  "activeStatusCount": 1,
  "legacyStatus": "pending_documents",
  "currentActiveStatus": "pending_documents",
  "issues": []
}
```

### Step 4: Update Application Code

After migration, ensure all application code uses the new system:

1. **Status Updates** - Use `individualProcesses.addStatus` mutation
2. **Status Queries** - Join with `individualProcessStatuses` table
3. **Status Display** - Show from active status record, not legacy field

Example status update:
```typescript
// ✅ New way (preferred)
await ctx.runMutation(api.individualProcesses.addStatus, {
  processId: "jh7abc123..." as Id<"individualProcesses">,
  statusName: "documents_submitted",
  notes: "All required documents received",
});

// ❌ Old way (deprecated)
await ctx.runMutation(api.individualProcesses.update, {
  id: "jh7abc123..." as Id<"individualProcesses">,
  status: "documents_submitted",
});
```

## Rollback Procedure

If issues arise during migration, follow these steps:

### 1. Stop Using New System

Temporarily disable status updates via new system:

```typescript
// In individualProcesses.ts
export const addStatus = mutation({
  // Add feature flag check
  handler: async (ctx, args) => {
    const featureEnabled = await ctx.runQuery(internal.features.isEnabled, {
      feature: "newStatusSystem"
    });

    if (!featureEnabled) {
      throw new Error("New status system temporarily disabled");
    }

    // ... rest of implementation
  }
});
```

### 2. Revert to Legacy Field

Update queries to use legacy field:

```typescript
// Temporarily revert list queries
export const list = query({
  handler: async (ctx, args) => {
    // ... existing code

    return {
      processes: processes.map(p => ({
        ...p,
        // Use legacy field instead of join
        status: p.status, // Direct from process record
        // statusName: activeStatus?.statusName, // Commented out
      })),
    };
  },
});
```

### 3. Clean Up Status Records (if needed)

**CAUTION**: Only do this if migration caused data issues.

```typescript
export const cleanupStatusRecords = internalMutation({
  args: { processId: v.id("individualProcesses") },
  handler: async (ctx, { processId }) => {
    const statuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", processId)
      )
      .collect();

    for (const status of statuses) {
      await ctx.db.delete(status._id);
    }

    return { deleted: statuses.length };
  },
});
```

### 4. Restore from Backup

If critical issues occur:

```bash
# Stop the application
npm run stop

# Restore from backup
npm run convex:restore -- --backup-id <backup-id>

# Restart application
npm run dev
```

## Testing Checklist

Use this checklist to verify successful migration:

### Pre-Migration Tests

- [ ] Backup created and verified
- [ ] Migration functions deployed to Convex
- [ ] Test migration run on staging environment
- [ ] Single test process migrated successfully

### Migration Execution Tests

- [ ] All processes have at least one status record
- [ ] Each process has exactly one active status (`isActive: true`)
- [ ] Active status matches legacy `status` field
- [ ] Status records have valid `changedBy` user IDs
- [ ] Status records have valid timestamps

### Post-Migration Tests

- [ ] **List View**: Processes display correct status
- [ ] **Detail View**: Status timeline shows history
- [ ] **Status Update**: New status creates record and deactivates old
- [ ] **History Tracking**: All status changes logged with user/timestamp
- [ ] **Access Control**: Only admins can update status
- [ ] **Client View**: Clients see status for their processes only
- [ ] **Performance**: Queries with status joins execute in < 200ms

### Verification Queries

```typescript
// Test 1: Check all processes have status records
const processesWithoutStatus = await ctx.db
  .query("individualProcesses")
  .collect()
  .then(async (processes) => {
    const missing = [];
    for (const p of processes) {
      const hasStatus = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", p._id))
        .first();
      if (!hasStatus) missing.push(p._id);
    }
    return missing;
  });
console.log("Processes without status:", processesWithoutStatus);

// Test 2: Check for multiple active statuses (constraint violation)
const processesWithMultipleActive = await ctx.db
  .query("individualProcessStatuses")
  .collect()
  .then((statuses) => {
    const grouped = statuses.reduce((acc, s) => {
      if (s.isActive) {
        acc[s.individualProcessId] = (acc[s.individualProcessId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ processId: id, activeCount: count }));
  });
console.log("Processes with multiple active statuses:", processesWithMultipleActive);

// Test 3: Check status consistency
const inconsistentStatuses = await ctx.db
  .query("individualProcesses")
  .collect()
  .then(async (processes) => {
    const issues = [];
    for (const p of processes) {
      const active = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", p._id).eq("isActive", true)
        )
        .first();

      if (active && active.statusName !== p.status) {
        issues.push({
          processId: p._id,
          legacyStatus: p.status,
          activeStatus: active.statusName,
        });
      }
    }
    return issues;
  });
console.log("Inconsistent statuses:", inconsistentStatuses);
```

## Timeline and Phases

### Phase 1: Preparation (Week 1)
- Deploy schema changes
- Deploy migration functions
- Run tests on staging environment
- Create backup of production data

### Phase 2: Migration (Week 2)
- Run migration on production during low-traffic period
- Monitor for errors
- Verify data integrity
- Keep legacy system as fallback

### Phase 3: Validation (Week 2-3)
- Run all verification tests
- Monitor application logs for errors
- Collect user feedback
- Fix any issues discovered

### Phase 4: Full Rollout (Week 4+)
- Update all application code to use new system
- Monitor performance metrics
- Document any issues and resolutions
- Plan deprecation of legacy field (see deprecation plan)

## Common Issues and Solutions

### Issue: Multiple Active Statuses

**Symptom**: Process has more than one status with `isActive: true`

**Solution**:
```typescript
// Fix by keeping most recent and deactivating others
const statuses = await ctx.db
  .query("individualProcessStatuses")
  .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", processId))
  .filter((q) => q.eq(q.field("isActive"), true))
  .collect();

// Sort by changedAt descending
const sorted = statuses.sort((a, b) => b.changedAt - a.changedAt);

// Keep first (most recent), deactivate rest
for (let i = 1; i < sorted.length; i++) {
  await ctx.db.patch(sorted[i]._id, { isActive: false });
}
```

### Issue: Missing Status Records

**Symptom**: Process exists but has no status records

**Solution**: Re-run migration for that specific process:
```typescript
await ctx.runMutation(internal.migrations.migrateIndividualProcessStatus, {
  processId: affectedProcessId
});
```

### Issue: Status Mismatch

**Symptom**: Legacy `status` field doesn't match active status in new table

**Solution**: Determine source of truth and update:
```typescript
// Option A: Use legacy field as source of truth
const process = await ctx.db.get(processId);
const activeStatus = await ctx.db
  .query("individualProcessStatuses")
  .withIndex("by_individualProcess_active", (q) =>
    q.eq("individualProcessId", processId).eq("isActive", true)
  )
  .first();

if (activeStatus) {
  await ctx.db.patch(activeStatus._id, {
    statusName: process.status
  });
}

// Option B: Use new table as source of truth
await ctx.db.patch(processId, {
  status: activeStatus.statusName
});
```

## Performance Considerations

### Index Usage

The migration adds these indexes for optimal query performance:

```typescript
// In convex/schema.ts
individualProcessStatuses: defineTable({
  // ... fields
})
  .index("by_individualProcess", ["individualProcessId"])
  .index("by_individualProcess_active", ["individualProcessId", "isActive"])
  .index("by_changedAt", ["changedAt"])
```

### Query Optimization

When joining with status table:

```typescript
// ✅ Efficient: Use index to get active status
const activeStatus = await ctx.db
  .query("individualProcessStatuses")
  .withIndex("by_individualProcess_active", (q) =>
    q.eq("individualProcessId", processId).eq("isActive", true)
  )
  .first(); // Only gets one record

// ❌ Inefficient: Get all and filter in memory
const allStatuses = await ctx.db
  .query("individualProcessStatuses")
  .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", processId))
  .collect();
const activeStatus = allStatuses.find(s => s.isActive); // Bad performance
```

## Support and Resources

- **Migration Functions**: `/convex/migrations/migrateIndividualProcessStatuses.ts`
- **Schema Definition**: `/convex/schema.ts` (lines 120-130)
- **Status Management Library**: `/convex/lib/statusManagement.ts`
- **PRD Documentation**: `/ai_docs/prd.md` (individualProcessStatuses section)
- **Deprecation Plan**: `/ai_docs/database/status-deprecation-plan.md` (to be created)

## Success Criteria

Migration is considered successful when:

1. ✅ 100% of processes have at least one status record
2. ✅ 100% of processes have exactly one active status
3. ✅ 100% of active statuses match legacy field
4. ✅ All verification tests pass
5. ✅ No error logs related to status queries
6. ✅ Application UI displays statuses correctly
7. ✅ Status updates work without errors
8. ✅ Query performance meets SLA (< 200ms)

## Next Steps

After successful migration:

1. Monitor production for 2-4 weeks
2. Collect feedback from users
3. Document any edge cases discovered
4. Plan deprecation of legacy `status` field (see deprecation plan)
5. Consider archiving old migration code after stable period
