#!/usr/bin/env node
/**
 * Create admin user in Supabase
 * Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/create-admin-user.js
 */

import https from 'https';

const SUPABASE_URL = 'https://wsueekkqtmykiqltxprc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin credentials
const ADMIN_EMAIL = 'admin@tntechllc.com';
const ADMIN_PASSWORD = 'Admin@Tantech23';
const ADMIN_NAME = 'Admin User';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('Get it from: Supabase Dashboard → Settings → API → Service Role Secret');
  process.exit(1);
}

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    url.pathname = path;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    console.log('🔧 Creating admin user...');    // In browser console (F12):
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
    console.log(`   Email: ${ADMIN_EMAIL}`);

    // 1. Create auth user via Admin API
    const authRes = await makeRequest('POST', '/auth/v1/admin/users', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: ADMIN_NAME,
      },
    });

    if (authRes.status !== 200 && authRes.status !== 201) {
      // Check if user already exists
      if (authRes.data?.msg?.includes('already') || authRes.data?.message?.includes('already')) {
        console.log('⚠️  Auth user may already exist. Attempting profile creation...');
        
        // Try to get user by email
        const listRes = await makeRequest('GET', `/auth/v1/admin/users?email=${encodeURIComponent(ADMIN_EMAIL)}`);
        if (listRes.status === 200 && listRes.data?.users?.length > 0) {
          const userId = listRes.data.users[0].id;
          console.log(`   Found existing user: ${userId}`);
          
          // Update profile to ensure role is admin
          const updateRes = await makeRequest('PATCH', `/rest/v1/profiles?id=eq.${userId}`, {
            role: 'admin',
            full_name: ADMIN_NAME,
          });
          
          if (updateRes.status === 200 || updateRes.status === 204) {
            console.log('✅ Profile updated to admin role');
          }
          return;
        }
      }
      
      console.error('❌ Auth user creation failed:', authRes.data);
      process.exit(1);
    }

    const userId = authRes.data.id;
    console.log('✅ Auth user created:', userId);

    // 2. Create or update profile with admin role
    const profileRes = await makeRequest('POST', '/rest/v1/profiles', {
      id: userId,
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: 'admin',
      join_date: new Date().toISOString().split('T')[0],
    });

    if (profileRes.status !== 201 && profileRes.status !== 200) {
      // Profile might already exist from trigger, try update
      const updateRes = await makeRequest('PATCH', `/rest/v1/profiles?id=eq.${userId}`, {
        role: 'admin',
        full_name: ADMIN_NAME,
      });
      
      if (updateRes.status !== 200 && updateRes.status !== 204) {
        console.error('❌ Profile update failed:', updateRes.data);
      } else {
        console.log('✅ Profile updated to admin role');
      }
    } else {
      console.log('✅ Profile created successfully');
    }

    console.log('\n🎉 Admin user created!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   User ID: ${userId}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
