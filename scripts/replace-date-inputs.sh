#!/bin/bash

# Script to add DatePicker import and replace Input type="date" with DatePicker component

# List of files to process
files=(
  "components/individual-processes/dou-section-form.tsx"
  "components/individual-processes/individual-process-form-page.tsx"
  "components/individual-processes/individual-process-form-dialog.tsx"
  "components/individual-processes/individual-process-statuses-subtable.tsx"
  "components/individual-processes/add-status-dialog.tsx"
  "components/individual-processes/initial-status-form.tsx"
  "components/individual-processes/quick-person-form-dialog.tsx"
  "components/people/person-form-page.tsx"
  "components/people/person-form-dialog.tsx"
  "components/main-processes/main-process-form-page.tsx"
  "components/main-processes/main-process-form-dialog.tsx"
  "components/process-requests/process-request-form-page.tsx"
  "components/documents/document-form-page.tsx"
  "components/documents/document-form-dialog.tsx"
  "components/individual-processes/government-protocol-edit-dialog.tsx"
  "components/activity-logs/activity-log-filters.tsx"
  "components/tasks/extend-deadline-dialog.tsx"
  "components/tasks/task-form-page.tsx"
  "components/individual-processes/document-upload-dialog.tsx"
  "components/people-companies/person-company-form-page.tsx"
)

for file in "${files[@]}"; do
  filepath="/Users/elberrd/Documents/Development/clientes/casys4/$file"

  if [ ! -f "$filepath" ]; then
    echo "Skipping $file (not found)"
    continue
  fi

  echo "Processing $file..."

  # Check if DatePicker import already exists
  if ! grep -q 'import { DatePicker }' "$filepath"; then
    # Add DatePicker import after the last UI component import
    sed -i.bak '/from "@\/components\/ui\//a\
import { DatePicker } from "@/components/ui/date-picker"
' "$filepath"
    # Clean up: remove duplicate imports if any
    awk '!seen[$0]++' "$filepath" > "${filepath}.tmp" && mv "${filepath}.tmp" "$filepath"
  fi

  echo "  ✓ Added DatePicker import"
done

echo "Done!"
