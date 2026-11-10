import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const Schema = z.object({
            userId: z.string().uuid(),
            newPassword: z.string().min(12)
              .regex(/[A-Z]/, "Deve conter ao menos 1 letra maiúscula")
              .regex(/[a-z]/, "Deve conter ao menos 1 letra minúscula")
              .regex(/[0-9]/, "Deve conter ao menos 1 dígito")
              .regex(/[^A-Za-z0-9]/, "Deve conter ao menos 1 caractere especial"),
            currentPassword: z.string().min(1).optional(),
        });
        const { userId, newPassword, currentPassword } = Schema.parse(body);

        // campos validados pelo Zod acima

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Verify the caller is an admin
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const { data: callerRoles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

        if (rolesError || !callerRoles?.some(r => r.role === 'admin')) {
            return new Response(
                JSON.stringify({ error: 'Only admins can update passwords' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            );
        }

        // CHECK IF TARGET USER IS ADMIN
        const { data: targetUserRoles, error: targetRolesError } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

        const isTargetAdmin = targetUserRoles?.some(r => r.role === 'admin');

        if (isTargetAdmin) {
            // If target is admin, require current password
            if (!currentPassword) {
                return new Response(
                    JSON.stringify({ error: 'Senha atual é obrigatória para alterar senha de administradores' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }

            // Verify current password by attempting sign-in
            // We need to get the target user's email first
            const { data: { user: targetUser }, error: targetUserFetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

            if (targetUserFetchError || !targetUser || !targetUser.email) {
                return new Response(
                    JSON.stringify({ error: 'Usuário alvo não encontrado ou sem e-mail' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                );
            }

            // Create a temporary client to test credentials
            const tempClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );

            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email: targetUser.email,
                password: currentPassword
            });

            if (signInError) {
                return new Response(
                    JSON.stringify({ error: 'A senha atual informada está incorreta' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }
        }

        // Update the password
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) {
            console.error('Error updating password:', updateError);
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Error in admin-update-password function:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
