// End Session Edge Function for sendBeacon requests
// Handles timesheet session termination from beforeunload events

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

interface EndSessionRequest {
  session_id: string;
  user_id: string;
  timestamp: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract and verify JWT token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify JWT token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth verification failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    let requestData: EndSessionRequest
    try {
      const body = await req.text()
      requestData = JSON.parse(body)
    } catch (error) {
      console.error('Invalid request body:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields
    if (!requestData.session_id || !requestData.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id or user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user owns the session
    if (requestData.user_id !== user.id) {
      console.warn(`User ID mismatch: token=${user.id}, request=${requestData.user_id}`)
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call the end_session RPC function
    const { data, error } = await supabase
      .rpc('end_session', { 
        p_session_id: requestData.session_id 
      })

    if (error) {
      console.error('RPC error ending session:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to end session',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log successful session end for monitoring
    console.log(`Session ended via beacon: ${requestData.session_id} for user ${user.id}`)
    console.log('Session end result:', data)

    return new Response(
      JSON.stringify({ 
        success: true,
        session_id: requestData.session_id,
        user_id: user.id,
        result: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in end-session function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})