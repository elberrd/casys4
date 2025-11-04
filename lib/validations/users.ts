import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

// User creation/edit validation schema
export const userSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(3, "Full name must be at least 3 characters"),
  role: z.enum(["admin", "client"], {
    message: "Role is required",
  }),
  companyId: z
    .custom<Id<"companies">>((val) => typeof val === "string" || val === "", {
      message: "Company ID must be valid",
    })
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => {
    // Client role must have companyId
    if (data.role === "client") {
      return data.companyId !== "" && data.companyId !== undefined;
    }
    // Admin role must NOT have companyId
    if (data.role === "admin") {
      return data.companyId === "" || data.companyId === undefined;
    }
    return true;
  },
  {
    message: "Client users must have a company; Admin users cannot have a company",
    path: ["companyId"],
  }
);

export type UserFormData = z.infer<typeof userSchema>;

// Password reset validation schema
export const passwordResetSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
