# Database Setup and Testing Guide

## 🚀 **Complete Database Layer Setup**

This guide will walk you through executing the database schema and testing all functionality.

### **Step 1: Execute Database Schema**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `ujqdkiewshswocpgtbne`

2. **Navigate to SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

3. **Execute Schema**
   - Copy the entire contents of `docs/database-schema.sql`
   - Paste into the SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

4. **Verify Tables Created**
   - Go to **"Table Editor"** in the left sidebar
   - You should see 4 tables:
     - ✅ `users`
     - ✅ `conversations`
     - ✅ `messages`
     - ✅ `user_settings`

### **Step 2: Verify Row Level Security**

1. **Check RLS Policies**
   - In Table Editor, click on each table
   - Go to **"RLS Policies"** tab
   - Verify policies are active for each table

2. **Test RLS**
   - Go to **"SQL Editor"**
   - Run this test query:
   ```sql
   -- Test RLS by trying to access data without auth
   SELECT * FROM users LIMIT 1;
   -- Should return no results (empty)
   ```

### **Step 3: Test Application**

1. **Start Development Server**
   ```bash
   pnpm dev
   ```

2. **Test Authentication Flow**
   - Open http://localhost:3000
   - Click "Test Supabase Connection" → Should show ✅
   - Sign up with a new email
   - Check email for confirmation link
   - Sign in with confirmed credentials

3. **Test Database Operations**
   - After signing in, the app should create user profile automatically
   - Check browser console for any database errors

### **Step 4: Run Database Tests**

1. **Test Database Connection**
   ```bash
   # The app will automatically test connection on load
   # Check browser console for results
   ```

2. **Manual Database Testing**
   - Open browser console (F12)
   - Test creating a conversation:
   ```javascript
   // This will test the database service
   import { conversationService } from './lib/database'
   conversationService.create('Test Chat', 'gpt-3.5-turbo')
   ```

### **Step 5: Verify Real-time Features**

1. **Test Real-time Subscriptions**
   - Open two browser tabs to http://localhost:3000
   - Sign in on both tabs
   - Create a conversation on one tab
   - Verify it appears on the second tab automatically

2. **Test Message Real-time**
   - Send a message in one tab
   - Verify it appears instantly in the other tab

### **Step 6: Performance Testing**

1. **Query Performance**
   ```sql
   -- Test query performance in Supabase SQL Editor
   EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 'test-id' ORDER BY created_at DESC;
   ```

2. **Real-time Performance**
   - Monitor browser network tab for real-time message latency
   - Should be <200ms for local development

## 🔧 **Troubleshooting**

### **Schema Execution Issues**
- **Error: "relation already exists"**
  - Tables already exist, skip or drop them first
  - Use: `DROP TABLE IF EXISTS table_name CASCADE;`

- **Error: "permission denied"**
  - Check Supabase project permissions
  - Ensure you're using the correct project

### **RLS Issues**
- **Can't access own data**
  - Check authentication is working
  - Verify user is signed in
  - Test with: `SELECT auth.uid();`

### **Real-time Issues**
- **No live updates**
  - Check browser console for WebSocket errors
  - Verify Supabase real-time is enabled
  - Test with: `supabase.channel('test').subscribe()`

### **TypeScript Issues**
- **"never" types in database**
  - Regenerate types after schema creation
  - Run: `npx supabase gen types typescript --project-id ujqd... > src/types/database.ts`

## 📊 **Expected Results**

### **After Schema Execution**
- ✅ 4 tables created
- ✅ RLS policies active
- ✅ Indexes created
- ✅ Triggers configured

### **After Application Testing**
- ✅ Authentication working
- ✅ Database operations successful
- ✅ Real-time updates working
- ✅ No TypeScript errors

### **Performance Benchmarks**
- Database queries: <50ms
- Real-time updates: <200ms
- Page load: <2s
- Authentication: <1s

## 🎯 **Final Verification**

Run this comprehensive test:

```bash
# 1. Start the app
pnpm dev

# 2. Test connection (in browser console)
✅ Connection successful!

# 3. Test authentication
✅ Sign up → Email → Sign in

# 4. Test database operations
✅ Create conversation
✅ Send message
✅ Real-time updates

# 5. Check Supabase dashboard
✅ Tables populated
✅ RLS working
✅ Real-time active
```

## 🚀 **Next Steps**

Once database is fully set up:

1. **Story 2.1**: Implement chat UI components
2. **Story 2.2**: Add message input and display
3. **Story 2.3**: Integrate OpenRouter API
4. **Story 2.4**: Add conversation management

**The database layer is now complete and ready for the chat functionality!** 🎉