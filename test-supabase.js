/**
 * Supabase Connection Test Script
 * Run this to verify your Supabase setup is working correctly
 * 
 * Usage: node test-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
console.log('');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Supabase credentials not found in .env file');
    console.log('\nMake sure your .env file contains:');
    console.log('EXPO_PUBLIC_SUPABASE_URL=your_url_here');
    console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    try {
        console.log('1️⃣ Testing database connection...');

        // Test 1: Check if users table exists
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (usersError) {
            console.error('❌ Users table error:', usersError.message);
            console.log('\n💡 Solution: Run the database schema SQL in Supabase SQL Editor');
            console.log('   File: database/supabase_schema.sql');
            return false;
        }
        console.log('✅ Users table exists');

        // Test 2: Check if reports table exists
        console.log('\n2️⃣ Testing reports table...');
        const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('count')
            .limit(1);

        if (reportsError) {
            console.error('❌ Reports table error:', reportsError.message);
            return false;
        }
        console.log('✅ Reports table exists');

        // Test 3: Check storage bucket
        console.log('\n3️⃣ Testing storage bucket...');
        const { data: buckets, error: bucketsError } = await supabase
            .storage
            .listBuckets();

        if (bucketsError) {
            console.error('❌ Storage error:', bucketsError.message);
            return false;
        }

        const reportImagesBucket = buckets.find(b => b.name === 'report-images');
        if (!reportImagesBucket) {
            console.error('❌ Storage bucket "report-images" not found');
            console.log('\n💡 Solution: Create the bucket in Supabase Dashboard > Storage');
            return false;
        }
        console.log('✅ Storage bucket "report-images" exists');
        console.log('   Public:', reportImagesBucket.public ? '✅ Yes' : '❌ No (should be public!)');

        // Test 4: Check demo users
        console.log('\n4️⃣ Checking demo users...');
        const { data: demoUsers, error: demoError } = await supabase
            .from('users')
            .select('username, role, zone')
            .limit(10);

        if (demoError) {
            console.error('❌ Error fetching users:', demoError.message);
            return false;
        }

        if (demoUsers && demoUsers.length > 0) {
            console.log(`✅ Found ${demoUsers.length} users:`);
            demoUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.role}${user.zone ? `, ${user.zone}` : ''})`);
            });
        } else {
            console.log('⚠️  No users found. Demo users should be created by the schema.');
        }

        // Test 5: Try to insert a test report (and delete it)
        console.log('\n5️⃣ Testing report insertion...');
        const testReport = {
            id: 'test_' + Date.now(),
            citizen_id: 'cit_arav', // Using demo user
            reporting_mode: 'on-site',
            location: {
                latitude: 18.5204,
                longitude: 73.8567,
                zone: 'zone1',
                address: 'Test Address'
            },
            photo_uri: 'https://example.com/test.jpg',
            ai_detection: {
                damageType: 'pothole',
                confidence: 0.95,
                severity: 'high'
            },
            status: 'pending',
            sync_status: 'synced',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
            .from('reports')
            .insert(testReport)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError.message);
            console.log('\n💡 This might be a RLS (Row Level Security) issue.');
            console.log('   Check if the policies in the schema were created correctly.');
            return false;
        }
        console.log('✅ Test report inserted successfully');

        // Clean up test report
        const { error: deleteError } = await supabase
            .from('reports')
            .delete()
            .eq('id', testReport.id);

        if (!deleteError) {
            console.log('✅ Test report deleted successfully');
        }

        console.log('\n🎉 All tests passed! Your Supabase setup is working correctly.');
        console.log('\n📱 You can now submit reports in the app!');
        return true;

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});
