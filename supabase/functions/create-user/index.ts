import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, role, branchId } = await req.json();

    // Validate required fields
    if (!email || !password || !fullName || !branchId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase admin client
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

    // Get the requesting user to verify they're an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if requesting user is admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError || !userRoles?.some(r => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        owner_id: user.id, // Set the owner_id to the current user (admin)
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Handle specific error types
      let errorMessage = 'Erro ao criar usuário';
      
      if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
        errorMessage = 'Este e-mail já está cadastrado no sistema';
      } else if (createError.message?.includes('password')) {
        errorMessage = 'A senha não atende aos requisitos mínimos';
      } else if (createError.message) {
        errorMessage = createError.message;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Profile will be created automatically by the trigger
    
    // Validate that branch belongs to the admin (owner)
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('owner_id', user.id)
      .single();

    if (branchError || !branch) {
      return new Response(
        JSON.stringify({ error: 'Filial inválida ou não pertence a este usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update profile with branch_id
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ branch_id: branchId })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile with branch_id:', profileUpdateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao vincular usuário à filial' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Assign role to the new user (only operator, manager or stock_clerk allowed)
    const assignedRole = role || 'operator';
    
    // Security: prevent creating admin users through this endpoint
    if (assignedRole === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Não é permitido criar usuários com permissão de administrador' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([{ user_id: newUser.user.id, role: assignedRole }]);

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Check if role already exists (unique constraint violation)
      if (roleError.code !== '23505') { 
        return new Response(
          JSON.stringify({ error: 'Failed to assign user role' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email,
          full_name: fullName 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
