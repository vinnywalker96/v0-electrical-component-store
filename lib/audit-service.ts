import { createServerClient } from "./supabase/server";

interface AuditLogOptions {
  user_id: string;
  user_email?: string; // Optional, can be fetched if not provided
  action: string;
  table_name?: string;
  record_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string; // Can be obtained from NextRequest
}

export async function logAuditAction(options: AuditLogOptions) {
  try {
    const supabase = await createServerClient(); // Ensure this creates a server-side client

    // Attempt to fetch user_email if not provided
    let finalUserEmail = options.user_email;
    if (!finalUserEmail && options.user_id) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('email').eq('id', options.user_id).single();
        if (profileError) {
            console.error("Audit Service: Error fetching user email for audit log:", profileError);
        } else {
            finalUserEmail = profile?.email;
        }
    }

    const { error } = await supabase.from("audit_logs").insert({
      user_id: options.user_id,
      user_email: finalUserEmail,
      action: options.action,
      table_name: options.table_name,
      record_id: options.record_id,
      old_value: options.old_value,
      new_value: options.new_value,
      ip_address: options.ip_address,
    });

    if (error) {
      console.error("Failed to log audit action:", error);
    }
  } catch (err) {
    console.error("Error in audit logging service:", err);
  }
}
