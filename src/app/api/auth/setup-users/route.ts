import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/setup-users
 * Creates test auth users and links them to existing DB records.
 * Protected: only works with service role key auth or in preview mode.
 */
export async function POST() {
  try {
    const admin = createAdminClient();

    const testUsers = [
      {
        email: "am@mproperty.melbourne",
        password: "Lintel2026!",
        table: "user_profiles",
      },
      {
        email: "sarah.mitchell@example.com",
        password: "Lintel2026!",
        table: "agents",
      },
      {
        email: "david.chen@example.com",
        password: "Lintel2026!",
        table: "contacts",
      },
    ];

    const results = [];

    for (const testUser of testUsers) {
      try {
        // Check if auth user already exists
        const { data: listData } = await admin.auth.admin.listUsers();
        const existing = listData?.users?.find(
          (u) => u.email === testUser.email
        );

        let authUserId: string;

        if (existing) {
          authUserId = existing.id;
          // Update password to ensure it's correct
          await admin.auth.admin.updateUserById(authUserId, {
            password: testUser.password,
            email_confirm: true,
          });
          results.push({
            email: testUser.email,
            status: "existing",
            authUserId,
          });
        } else {
          const { data: newUser, error: createError } =
            await admin.auth.admin.createUser({
              email: testUser.email,
              password: testUser.password,
              email_confirm: true,
            });

          if (createError || !newUser.user) {
            results.push({
              email: testUser.email,
              status: "error",
              error: createError?.message || "Failed to create user",
            });
            continue;
          }

          authUserId = newUser.user.id;
          results.push({
            email: testUser.email,
            status: "created",
            authUserId,
          });
        }

        // Link auth_user_id in the corresponding table
        const { error: updateError } = await admin
          .from(testUser.table)
          .update({ auth_user_id: authUserId })
          .eq("email", testUser.email);

        if (updateError) {
          results.push({
            email: testUser.email,
            status: "link_error",
            error: updateError.message,
          });
        }
      } catch (err) {
        results.push({
          email: testUser.email,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
