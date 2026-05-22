import { z } from 'zod';

export const ResponseTypeSchema = z.enum(['pass_fail', 'scale_1_5', 'text']);
export type ResponseType = z.infer<typeof ResponseTypeSchema>;

export const SeveritySchema = z.enum(['critica', 'alta', 'media', 'baja']);
export type Severity = z.infer<typeof SeveritySchema>;

export const AuditStatusSchema = z.enum(['borrador', 'completada', 'archivada']);
export type AuditStatus = z.infer<typeof AuditStatusSchema>;

export const AuditorResponsibleSchema = z.enum(['leonardo_cuevas', 'ray_vazquez', 'karina_gomez', 'otro']);
export type AuditorResponsible = z.infer<typeof AuditorResponsibleSchema>;

export const QuestionSchema = z.object({
  id: z.number().int(),
  section_id: z.number().int(),
  question_text: z.string(),
  response_type: ResponseTypeSchema,
  severity: SeveritySchema,
  weight: z.number(),
  requires_photo_on_fail: z.boolean(),
  display_order: z.number().int(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const SectionSchema = z.object({
  id: z.number().int(),
  template_id: z.number().int(),
  name: z.string(),
  display_order: z.number().int(),
  questions: z.array(QuestionSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const TemplateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  sections: z.array(SectionSchema),
});
export type Template = z.infer<typeof TemplateSchema>;

export const HotelSchema = z.object({
  hotel_id: z.number().int(),
  hotel_code: z.string().nullable(),
  aag_name: z.string().nullable(),
});
export type Hotel = z.infer<typeof HotelSchema>;

export const AuditListItemSchema = z.object({
  id: z.number().int(),
  hotel_id: z.number().int(),
  hotel_name: z.string().nullable(),
  auditor_responsible: AuditorResponsibleSchema,
  status: AuditStatusSchema,
  audit_date: z.string(),
  total_score: z.number().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type AuditListItem = z.infer<typeof AuditListItemSchema>;

export const CreateAuditInputSchema = z.object({
  hotel_id: z.number().int().positive(),
  auditor_responsible: AuditorResponsibleSchema,
  audit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CreateAuditInput = z.infer<typeof CreateAuditInputSchema>;

export const ListAuditsQuerySchema = z.object({
  hotel_id: z.coerce.number().int().optional(),
  status: AuditStatusSchema.optional(),
  auditor_responsible: AuditorResponsibleSchema.optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListAuditsQuery = z.infer<typeof ListAuditsQuerySchema>;

export type AuditResponse = { id: number; question_id: number; response_value: string | null; comment: string | null; is_na: boolean };
export type AuditRoom = { id: number; room_number: string; cleanliness_score: number | null; bathroom_score: number | null; functionality_pass: boolean | null; notes: string | null };
export type Finding = { id: number; description: string; section: string | null; severity: Severity; created_at: string };
export type Photo = { id: number; response_id: number | null; finding_id: number | null; room_id: number | null; blob_url: string; caption: string | null; taken_at: string };

// ─── Input schemas for CRUD endpoints ────────────────────────────

export const UpdateAuditHeaderInputSchema = z.object({
  summary: z.string().nullable().optional(),
  geo_lat: z.number().nullable().optional(),
  geo_lng: z.number().nullable().optional(),
});
export type UpdateAuditHeaderInput = z.infer<typeof UpdateAuditHeaderInputSchema>;

export const UpsertResponseItemSchema = z.object({
  question_id: z.number().int().positive(),
  response_value: z.string().nullable(),
  comment: z.string().nullable(),
  is_na: z.boolean(),
});

export const UpsertResponsesInputSchema = z.object({
  responses: z.array(UpsertResponseItemSchema).min(1),
});
export type UpsertResponsesInput = z.infer<typeof UpsertResponsesInputSchema>;

export const CreateRoomInputSchema = z.object({
  room_number: z.string().min(1),
  cleanliness_score: z.number().min(1).max(5).optional(),
  bathroom_score: z.number().min(1).max(5).optional(),
  functionality_pass: z.boolean().optional(),
  notes: z.string().optional(),
});
export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;

export const UpdateRoomInputSchema = z.object({
  room_number: z.string().min(1).optional(),
  cleanliness_score: z.number().min(1).max(5).nullable().optional(),
  bathroom_score: z.number().min(1).max(5).nullable().optional(),
  functionality_pass: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type UpdateRoomInput = z.infer<typeof UpdateRoomInputSchema>;

export const CreateFindingInputSchema = z.object({
  description: z.string().min(1),
  section: z.string().optional(),
  severity: SeveritySchema,
});
export type CreateFindingInput = z.infer<typeof CreateFindingInputSchema>;

export const UpdateFindingInputSchema = z.object({
  description: z.string().min(1).optional(),
  section: z.string().nullable().optional(),
  severity: SeveritySchema.optional(),
});
export type UpdateFindingInput = z.infer<typeof UpdateFindingInputSchema>;

export const CreateSignatureInputSchema = z.object({
  signature_base64: z.string().min(1),
});
