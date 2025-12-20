import { z } from "zod";

/**
 * Common validation patterns
 */
export const phoneRegex = /^[\d\s\-\(\)\+]+$/;
export const postalCodeRegex = /^\d{5}(-\d{4})?$/;

/**
 * Auth schemas
 */
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Full name is required").max(100, "Name is too long"),
});

/**
 * Property schemas
 */
export const propertySchema = z.object({
  nickname: z.string().max(100, "Nickname is too long").optional().or(z.literal("")),
  address_line1: z.string().min(1, "Address is required").max(200, "Address is too long"),
  address_line2: z.string().max(200, "Address line 2 is too long").optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100, "City name is too long"),
  state: z.string().min(2, "State is required").max(50, "State name is too long"),
  postal_code: z.string().regex(postalCodeRegex, "Please enter a valid postal code (e.g., 12345 or 12345-6789)"),
  country: z.string().default("USA"),
  year_built: z.number().min(1800, "Year must be after 1800").max(new Date().getFullYear() + 1, "Year cannot be in the future").optional().nullable(),
  square_feet: z.number().min(1, "Square feet must be positive").max(100000, "Value seems too large").optional().nullable(),
  bedrooms: z.number().min(0, "Bedrooms cannot be negative").max(50, "Value seems too large").optional().nullable(),
  bathrooms: z.number().min(0, "Bathrooms cannot be negative").max(50, "Value seems too large").optional().nullable(),
});

/**
 * Service request schemas
 */
export const serviceRequestSchema = z.object({
  property_id: z.string().uuid("Invalid property selected"),
  category: z.enum(["plumbing", "electrical", "hvac", "appliance", "roofing", "landscaping", "general", "other"], {
    message: "Please select a category",
  }),
  priority: z.enum(["low", "normal", "high", "urgent"], {
    message: "Please select a priority",
  }),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(10, "Please provide more details (at least 10 characters)").max(2000, "Description is too long"),
  scheduled_date: z.string().optional(),
});

/**
 * Task schemas
 */
export const taskSchema = z.object({
  property_id: z.string().uuid("Invalid property selected"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional().or(z.literal("")),
  category: z.string().optional(),
  priority: z.enum(["low", "normal", "high"], { message: "Please select a priority" }).default("normal"),
  due_date: z.string().optional(),
  recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
});

/**
 * Profile schemas
 */
export const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Name is too long"),
  phone: z.string().regex(phoneRegex, "Please enter a valid phone number").optional().or(z.literal("")),
});

/**
 * Provider signup schema
 */
export const providerSignupSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(200, "Business name is too long"),
  contact_name: z.string().min(1, "Contact name is required").max(100, "Contact name is too long"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number is required").regex(phoneRegex, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  service_area: z.string().min(1, "Service area is required"),
  service_types: z.array(z.string()).min(1, "Select at least one service type"),
});

/**
 * Join property schema (for invite links)
 */
export const joinPropertySchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Contact form schema
 */
export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message is too long"),
});

/**
 * Type exports for use with forms
 */
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ProviderSignupInput = z.infer<typeof providerSignupSchema>;
export type JoinPropertyInput = z.infer<typeof joinPropertySchema>;
export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Validation helper that returns { success, data, errors }
 */
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  const issues = result.error.issues || [];
  issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return { success: false, errors };
}
