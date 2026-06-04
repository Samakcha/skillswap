import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sender_id, receiver_id, post_id } = body

    if (!sender_id || !receiver_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // 2. Initialize a user Supabase client to verify the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabasePubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const userClient = createClient(supabaseUrl, supabasePubKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
    }

    // 3. Security check: the logged in user must be the receiver of the messages
    if (user.id !== receiver_id) {
      return NextResponse.json({ error: 'Forbidden: Cannot mark other users\' messages as read' }, { status: 403 })
    }

    // 4. Initialize the admin Supabase client using secret key to bypass RLS
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // 5. Update messages using the admin client
    let query = adminClient
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', receiver_id)
      .eq('sender_id', sender_id)
      .eq('is_read', false)

    if (post_id) {
      query = query.eq('post_id', post_id)
    } else {
      query = query.is('post_id', null)
    }

    const { data, error: updateError } = await query.select()
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
