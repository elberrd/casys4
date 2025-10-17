How to make the dropdown area from combobox component the same width from the select:

Changes Made

1. Popover Component (components/ui/popover.tsx)
   Removed the hardcoded w-72 (288px) width from the default PopoverContent styles
2. Combobox Component (components/ui/combobox.tsx)
   Changed from using Tailwind's arbitrary class w-[--radix-popover-trigger-width] to using inline styles:
   Applied this to both the single selection combobox (line 151) and multiple selection combobox (line 328)
   Why This Works
   The issue was that Tailwind's arbitrary value syntax with CSS variables (w-[--radix-popover-trigger-width]) can have specificity conflicts or processing issues. By using inline styles with the CSS variable, we ensure:
   ✅ The width style has maximum specificity
   ✅ The CSS variable --radix-popover-trigger-width (which Radix UI automatically sets to match the trigger button's width) is properly applied
   ✅ No conflicts with other CSS classes
   Result
   Now the dropdown will exactly match the width of the select button across all forms in your application, including:
   Individual Process Form
   Document Form
   Consulate Form (States)
   Person-Company Form
   All other forms using the Combobox component
   The fix is universal since all forms use the same reusable Combobox component.
