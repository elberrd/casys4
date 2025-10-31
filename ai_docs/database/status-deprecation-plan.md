# Status Field Deprecation Plan

## Overview

This document outlines the plan for deprecating the legacy `status` field in the `individualProcesses` table after successful migration to the new `individualProcessStatuses` table system.

## Current State

### Legacy System (To Be Deprecated)
- **Field**: `individualProcesses.status: string`
- **Purpose**: Single field storing current status
- **Limitations**:
  - No history tracking
  - No audit trail
  - No user attribution
  - No timestamps for status changes
  - No optional notes

### New System (Active)
- **Table**: `individualProcessStatuses`
- **Purpose**: Complete status history with many-to-many relationship
- **Features**:
  - Full history tracking
  - Complete audit trail
  - User attribution for each change
  - Timestamps for all changes
  - Optional notes for context
  - Single active status constraint

## Deprecation Rationale

### Why Deprecate?

1. **Data Redundancy**: Both systems store the same information
2. **Maintenance Burden**: Keeping both systems synchronized requires extra code
3. **Risk of Inconsistency**: Two sources of truth can diverge over time
4. **Performance**: Unnecessary field taking up storage and index space
5. **Developer Confusion**: New developers may use wrong field

### Why Keep During Transition?

1. **Zero-Downtime Migration**: Allows gradual rollout
2. **Rollback Safety**: Easy to revert if issues arise
3. **Backward Compatibility**: External systems may depend on field
4. **Testing Period**: Need time to validate new system
5. **Client Confidence**: Proven stability before removal

## Deprecation Timeline

### Phase 0: Pre-Migration (Completed)
**Duration**: N/A
**Status**: ✅ Complete

- [x] New `individualProcessStatuses` table deployed
- [x] Migration functions created
- [x] Verification functions created
- [x] Documentation written

### Phase 1: Parallel Operation (Current Phase)
**Duration**: 4-8 weeks
**Status**: 🔄 In Progress
**Start Date**: [TBD - Date of migration completion]

**Activities**:
- Both systems operate simultaneously
- Legacy field updated when status changes (for backward compatibility)
- New table is source of truth for UI
- Monitor for issues and edge cases
- Collect metrics on system stability

**Validation Criteria**:
- Zero data inconsistencies between systems
- No errors in status-related queries
- All status updates work correctly
- Performance metrics within SLA
- User feedback is positive

**Code State**:
```typescript
// Both fields maintained
await ctx.db.patch(processId, {
  status: newStatus, // Legacy field (kept in sync)
});

await ctx.db.insert("individualProcessStatuses", {
  individualProcessId: processId,
  statusName: newStatus, // New system (source of truth)
  isActive: true,
  // ... other fields
});
```

### Phase 2: Soft Deprecation
**Duration**: 4-6 weeks
**Target Start**: [8 weeks after Phase 1 start]
**Status**: ⏳ Pending

**Activities**:
1. **Mark Field as Deprecated**
   - Add `@deprecated` JSDoc comments
   - Update schema with deprecation notice
   - Add TypeScript warnings for direct access

   ```typescript
   // In convex/schema.ts
   individualProcesses: defineTable({
     /**
      * @deprecated Use individualProcessStatuses table instead.
      * This field is maintained for backward compatibility only.
      * Will be removed in v2.0.0 (estimated: [DATE])
      */
     status: v.string(),
     // ... other fields
   })
   ```

2. **Update Documentation**
   - Add deprecation warnings to API docs
   - Update PRD with deprecation timeline
   - Create migration guide for external consumers
   - Add banner to relevant pages

3. **Add Runtime Warnings** (Optional)
   ```typescript
   // In queries that access status field directly
   export const get = query({
     handler: async (ctx, { id }) => {
       const process = await ctx.db.get(id);

       if (process && process.status) {
         console.warn(
           `[DEPRECATED] Accessing individualProcesses.status field directly. ` +
           `Use individualProcessStatuses table instead. ` +
           `This field will be removed in v2.0.0`
         );
       }

       return process;
     }
   });
   ```

4. **Identify External Dependencies**
   - Check for external systems reading `status` field
   - Contact external system owners
   - Provide migration guidance
   - Set up monitoring for external access

**Validation Criteria**:
- All internal code updated to use new system
- External dependencies identified and contacted
- Deprecation warnings visible in logs
- No new code uses legacy field

### Phase 3: Stop Writing Legacy Field
**Duration**: 2-4 weeks
**Target Start**: [14 weeks after Phase 1 start]
**Status**: ⏳ Pending

**Activities**:
1. **Stop Updating Legacy Field**
   ```typescript
   // Remove status field updates
   export const addStatus = mutation({
     handler: async (ctx, args) => {
       // Deactivate old statuses
       await deactivateExistingStatuses(ctx, args.processId);

       // Insert new active status
       await ctx.db.insert("individualProcessStatuses", {
         individualProcessId: args.processId,
         statusName: args.statusName,
         isActive: true,
         // ... other fields
       });

       // ❌ REMOVED: No longer sync to legacy field
       // await ctx.db.patch(args.processId, {
       //   status: args.statusName
       // });
     }
   });
   ```

2. **Add Feature Flag** (for safety)
   ```typescript
   // Add ability to re-enable if needed
   const shouldSyncLegacyField = await ctx.runQuery(
     internal.features.getFlag,
     { flag: "syncLegacyStatusField" }
   );

   if (shouldSyncLegacyField) {
     await ctx.db.patch(args.processId, { status: args.statusName });
   }
   ```

3. **Monitor for Issues**
   - Watch error logs for status-related errors
   - Check external system logs
   - Monitor support tickets
   - Collect user feedback

**Validation Criteria**:
- No errors from stopping writes
- External systems adapted or given read-only access
- Legacy field still readable but frozen
- Performance improved (fewer writes)

**Rollback Plan**: If issues arise, re-enable writes via feature flag

### Phase 4: Read-Only Legacy Field
**Duration**: 4-8 weeks
**Target Start**: [18 weeks after Phase 1 start]
**Status**: ⏳ Pending

**Activities**:
1. **Freeze Legacy Field**
   - Field contains last-known status before freeze
   - No updates, only reads allowed
   - Acts as backup/reference

2. **Update Schema Validation**
   ```typescript
   // Make field optional in schema
   individualProcesses: defineTable({
     /**
      * @deprecated Frozen field. Use individualProcessStatuses table.
      * Contains last status before [DATE]. No longer updated.
      */
     status: v.optional(v.string()),
     // ... other fields
   })
   ```

3. **Add Comparison Tool**
   ```typescript
   // Tool to verify new system matches frozen legacy values
   export const verifyStatusConsistency = internalQuery({
     handler: async (ctx) => {
       const processes = await ctx.db.query("individualProcesses").collect();
       const issues = [];

       for (const process of processes) {
         const activeStatus = await getActiveStatus(ctx, process._id);

         if (process.status && activeStatus?.statusName !== process.status) {
           issues.push({
             processId: process._id,
             frozenLegacyStatus: process.status,
             currentActiveStatus: activeStatus?.statusName,
           });
         }
       }

       return { total: processes.length, issues };
     }
   });
   ```

4. **External System Cutover**
   - All external systems migrated to new table
   - Legacy field access logged and monitored
   - Support tickets for migration issues addressed

**Validation Criteria**:
- Zero writes to legacy field
- External systems fully migrated
- No functionality degradation
- Comparison tool shows no inconsistencies

### Phase 5: Field Removal
**Duration**: 1 week
**Target Start**: [26 weeks / ~6 months after Phase 1 start]
**Status**: ⏳ Pending

**Activities**:
1. **Remove from Schema**
   ```typescript
   // In convex/schema.ts
   individualProcesses: defineTable({
     // ❌ REMOVED: status: v.string(),
     // ... other fields remain
   })
   ```

2. **Remove from Types**
   ```typescript
   // Update TypeScript interfaces
   export interface IndividualProcess {
     // ❌ REMOVED: status: string;
     // ... other fields
   }
   ```

3. **Database Cleanup**
   - Deploy schema change (Convex handles column removal)
   - Verify no errors in deployment
   - Storage space reclaimed automatically

4. **Update Documentation**
   - Remove all references to legacy field
   - Update PRD to remove deprecated field
   - Archive migration and deprecation docs
   - Update API documentation

5. **Celebrate** 🎉
   - Migration complete
   - Cleaner codebase
   - Better audit trail
   - Improved data model

**Validation Criteria**:
- Schema deployed successfully
- No TypeScript errors
- No runtime errors
- All tests passing
- Documentation updated

## Risk Management

### High Risk Scenarios

#### Risk 1: External System Breaks
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Identify all external consumers early (Phase 2)
- Provide migration guide and support
- Keep legacy field readable for extended period
- Add monitoring for external access
- Have rollback plan ready

**Rollback**: Re-enable writes to legacy field via feature flag

#### Risk 2: Data Inconsistency
**Probability**: Low
**Impact**: Critical
**Mitigation**:
- Run verification queries regularly
- Monitor for inconsistencies
- Have automated alerts
- Keep comparison tool running

**Rollback**: Use verification tool to identify issues, fix manually or restore from backup

#### Risk 3: Performance Degradation
**Probability**: Low
**Impact**: Medium
**Mitigation**:
- Monitor query performance metrics
- Ensure proper indexes on new table
- Test with production-scale data
- Have performance baseline

**Rollback**: Optimize queries, add indexes, or revert to legacy field temporarily

### Medium Risk Scenarios

#### Risk 4: User Confusion
**Probability**: Medium
**Impact**: Low
**Mitigation**:
- Clear deprecation notices
- Updated documentation
- Training for support team
- Communication plan

#### Risk 5: Developer Mistakes
**Probability**: Medium
**Impact**: Low
**Mitigation**:
- TypeScript warnings on deprecated field
- Code review process
- Linting rules to catch usage
- Clear documentation in code

### Rollback Strategy

Each phase has a rollback plan:

**Phase 2-3 Rollback**: Remove deprecation warnings, continue parallel operation
**Phase 4 Rollback**: Re-enable writes via feature flag
**Phase 5 Rollback**: Restore field to schema, restore data from backup

## Communication Plan

### Internal Communication

**Developers**:
- Phase 1: Migration complete announcement
- Phase 2: Deprecation notice with timeline
- Phase 3: Write stop announcement
- Phase 5: Field removal announcement

**Stakeholders**:
- Monthly status updates on deprecation progress
- Risk assessment reports
- Final removal notification

### External Communication

**External System Owners**:
- Phase 2: Initial notice with 6-month timeline
- Phase 2: Migration guide and support offer
- Phase 3: 3-month warning before write stop
- Phase 4: 2-month warning before field removal
- Phase 5: Final removal notification

**Template Email**:
```
Subject: [Action Required] Status Field Deprecation - individualProcesses Table

Dear Partner,

We are modernizing our status tracking system to provide better audit trails
and history tracking. As part of this improvement, we will be deprecating the
legacy `status` field in the `individualProcesses` table.

Timeline:
- [DATE]: Deprecation notice (current)
- [DATE + 3 months]: Stop writing to legacy field
- [DATE + 6 months]: Field removal

Action Required:
Please migrate your systems to use the new `individualProcessStatuses` table
instead of the legacy `status` field. We have prepared a migration guide:
[LINK]

If you need assistance or have concerns about this timeline, please contact
us at [EMAIL] by [DATE].

Thank you for your cooperation.
```

## Success Metrics

Track these metrics throughout deprecation:

1. **System Stability**
   - Uptime: > 99.9%
   - Error rate: < 0.1%
   - Query performance: < 200ms P95

2. **Migration Progress**
   - External systems migrated: 100%
   - Code references removed: 100%
   - Documentation updated: 100%

3. **Data Integrity**
   - Consistency checks: 100% pass rate
   - Verification queries: 0 issues
   - User-reported data issues: 0

4. **Performance**
   - Query latency: Maintained or improved
   - Write throughput: Maintained or improved
   - Storage usage: Reduced (after removal)

## Checkpoints and Go/No-Go Decisions

Each phase requires explicit approval before proceeding:

### Checkpoint 1: Enter Phase 2 (Soft Deprecation)
**Required**:
- ✅ 4+ weeks of stable parallel operation
- ✅ Zero data inconsistencies
- ✅ All verification tests passing
- ✅ No critical bugs related to status

**Decision Maker**: Technical Lead
**Fallback**: Extend Phase 1 by 2-4 weeks

### Checkpoint 2: Enter Phase 3 (Stop Writes)
**Required**:
- ✅ All internal code using new system
- ✅ External dependencies identified
- ✅ External partners notified with timeline
- ✅ Deprecation warnings in place

**Decision Maker**: Technical Lead + Product Manager
**Fallback**: Extend Phase 2 until external partners ready

### Checkpoint 3: Enter Phase 4 (Read-Only)
**Required**:
- ✅ 2+ weeks of no writes without issues
- ✅ External systems adapted or migration plan in place
- ✅ No support tickets related to status access

**Decision Maker**: Technical Lead + Product Manager
**Fallback**: Extend Phase 3 or re-enable writes temporarily

### Checkpoint 4: Enter Phase 5 (Removal)
**Required**:
- ✅ 4+ weeks of frozen field without issues
- ✅ All external systems migrated
- ✅ 100% of verification tests passing
- ✅ Executive sign-off

**Decision Maker**: CTO or VP Engineering
**Fallback**: Keep field indefinitely as frozen legacy field

## Post-Removal

After successful field removal:

1. **Archive Documentation**
   - Move migration guide to `/docs/archive/`
   - Move deprecation plan to `/docs/archive/`
   - Keep for historical reference

2. **Update Knowledge Base**
   - Remove references to legacy field
   - Update onboarding documentation
   - Update API documentation

3. **Code Cleanup**
   - Remove commented-out legacy code
   - Remove deprecation warnings
   - Remove feature flags related to migration
   - Remove verification tools (or move to archive)

4. **Lessons Learned**
   - Document what went well
   - Document challenges faced
   - Document solutions for future migrations
   - Share with team

5. **Celebrate Success** 🎉
   - Team announcement
   - Recognize contributors
   - Share metrics and improvements

## Appendix

### Related Documents
- **Migration Guide**: `/ai_docs/database/individual-process-status-migration.md`
- **PRD**: `/ai_docs/prd.md` (individualProcessStatuses section)
- **Schema**: `/convex/schema.ts`
- **Status Management**: `/convex/lib/statusManagement.ts`

### Key Contacts
- **Technical Lead**: [NAME]
- **Product Manager**: [NAME]
- **Database Admin**: [NAME]
- **External Partners**: [LIST]

### Version History
- **v1.0** - Initial deprecation plan created
- **Last Updated**: [Current Date]
- **Next Review**: [DATE]

### Notes
- This is a living document and may be updated as we learn more during the deprecation process
- All dates are estimates and may be adjusted based on real-world feedback
- Safety and data integrity are prioritized over timeline adherence
