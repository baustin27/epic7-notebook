const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ujqdkiewshswocpgtbne.supabase.co';
const supabaseKey = 'sb_publishable_AhgStI4ioOFXeXiS3M4S8w_F5Z0q_6n';

async function debugAuth() {
  console.log('🔧 Testing Supabase authentication...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase.from('conversations').select('count').limit(1);
    if (error) {
      console.log('❌ Basic connection failed:', error.message);
    } else {
      console.log('✅ Basic connection successful');
    }
    
    // Test sign up
    console.log('2. Testing sign up...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'baustin2786@gmail.com',
      password: '2A59cq!CC'
    });
    
    if (signUpError) {
      console.log('❌ Sign up failed:', signUpError.message);
      if (signUpError.message.includes('already registered')) {
        console.log('ℹ️  User already exists, this is expected');
      }
    } else {
      console.log('✅ Sign up successful:', signUpData?.user?.email);
    }
    
    // Test sign in
    console.log('3. Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'baustin2786@gmail.com',
      password: '2A59cq!CC'
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
    } else {
      console.log('✅ Sign in successful:', signInData?.user?.email);
      console.log('   Session exists:', !!signInData?.session);
      
      // Test authenticated request
      console.log('4. Testing authenticated request...');
      const { data: userConversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .limit(5);
        
      if (convError) {
        console.log('❌ Authenticated request failed:', convError.message);
      } else {
        console.log('✅ Authenticated request successful, found', userConversations?.length, 'conversations');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugAuth();