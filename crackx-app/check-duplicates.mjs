
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkContractorDuplicates() {
    console.log('--- CHECKING CONTRACTOR DUPLICATES ---');

    const { data: contractors } = await supabase.from('contractors').select('*');
    const { data: users } = await supabase.from('users').select('username, contractor_id').eq('role', 'contractor');

    // Map contractor_id to username
    const idToUser = {};

    users.forEach(u => idToUser[u.contractor_id] = u.username);

    // Group by Name
    const grouped = {};
    contractors.forEach(c => {
        if (!grouped[c.name]) grouped[c.name] = [];
        grouped[c.name].push({
            id: c.id,
            agency: c.agency_name,
            zone: c.zone,
            linkedUser: idToUser[c.id] || '❌ NO LOGIN'
        });
    });

    // Print duplicates
    const duplicates = {};
    Object.keys(grouped).forEach(name => {
        if (grouped[name].length > 1) {
            duplicates[name] = grouped[name];
        }
    });

    console.log('\n--- DUPLICATES FOUND ---');
    console.log(JSON.stringify(duplicates, null, 2));

    console.log('\n--- SINGLE ENTRIES ---');
    Object.keys(grouped).forEach(name => {
        if (grouped[name].length === 1) {
            const c = grouped[name][0];
            console.log(`- ${name}: [User: ${c.linkedUser || 'NONE'}] (${c.agency})`);
        }
    });
}

checkContractorDuplicates();
