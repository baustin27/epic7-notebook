# Analytics Dashboard Setup and Testing

This document explains how to set up and test the advanced analytics dashboard for the AI chat interface.

## Overview

The analytics system provides comprehensive tracking of user interactions, model performance, and system usage patterns. It includes:

- **Usage Tracking**: Messages sent, conversations created, user engagement
- **Model Performance**: Response times, success rates, token usage
- **User Analytics**: Login/logout events, feature usage, session tracking
- **Admin Dashboard**: Real-time analytics with charts and user management

## Database Setup

### 1. Run Analytics Schema Migration

Execute the analytics schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of docs/analytics-schema.sql
```

This will create the following tables:
- `analytics_events` - Tracks all user interactions
- `analytics_metrics` - Aggregated daily metrics
- `model_performance` - AI model usage and performance
- `user_engagement` - User activity patterns

### 2. Update User Roles

To grant admin access to a user, run this SQL in Supabase:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

## Testing the Analytics System

### 1. Unit Tests

Run the analytics service tests:

```bash
npm test -- src/lib/__tests__/analytics.test.ts
```

### 2. Manual Testing Steps

#### A. Test Event Tracking
1. Open the application and sign in
2. Send a message in a conversation
3. Check the database for new entries in `analytics_events`:
   ```sql
   SELECT * FROM analytics_events
   WHERE event_type = 'message_sent'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

#### B. Test Model Performance Tracking
1. Send several messages using different models
2. Check `model_performance` table:
   ```sql
   SELECT model, COUNT(*), AVG(response_time_ms), AVG(success::int) * 100 as success_rate
   FROM model_performance
   GROUP BY model;
   ```

#### C. Test User Engagement
1. Use the app for several days
2. Check `user_engagement` table:
   ```sql
   SELECT date, messages_sent, conversations_created, last_activity
   FROM user_engagement
   WHERE user_id = 'your-user-id'
   ORDER BY date DESC;
   ```

#### D. Test Admin Dashboard
1. Ensure your user has admin role
2. Navigate to `/admin` in the application
3. Verify you can see:
   - Summary statistics
   - Model performance metrics
   - Recent events
   - User management interface

### 3. API Testing

Test the analytics APIs:

#### Get Summary Data
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/analytics/summary?days=7
```

#### Get Chart Data
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/analytics/charts?days=30
```

#### User Management (Admin Only)
```bash
# Get all users
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/admin/users

# Update user role
curl -X PATCH \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"userId": "user-id", "action": "grant_admin"}' \
     http://localhost:3000/api/admin/users
```

## Analytics Data Flow

### Event Collection
1. User interacts with the app (sends message, creates conversation, etc.)
2. Analytics service captures the event with metadata
3. Data is stored in appropriate tables
4. Real-time updates are sent to admin dashboard

### Data Processing
1. Raw events are collected in `analytics_events`
2. Model performance data is stored in `model_performance`
3. User engagement is tracked in `user_engagement`
4. Daily metrics are aggregated in `analytics_metrics`

### Dashboard Display
1. Admin accesses `/admin` route
2. Dashboard fetches data from analytics APIs
3. Data is visualized in charts and tables
4. Real-time updates show current activity

## Troubleshooting

### Common Issues

#### 1. No Analytics Data Appearing
- Check that the database schema has been applied
- Verify user authentication is working
- Check browser console for JavaScript errors
- Ensure API endpoints are accessible

#### 2. Admin Access Denied
- Verify user has `role = 'admin'` in the database
- Check that JWT token is valid
- Ensure admin APIs are properly secured

#### 3. Charts Not Loading
- Verify chart data API endpoints are working
- Check for CORS issues
- Ensure date ranges are valid

### Debug Queries

Check recent analytics events:
```sql
SELECT event_type, COUNT(*) as count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY count DESC;
```

Check model performance:
```sql
SELECT model, COUNT(*) as requests,
       AVG(response_time_ms) as avg_response_time,
       SUM(success::int) * 100.0 / COUNT(*) as success_rate
FROM model_performance
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY model;
```

## Performance Considerations

### Database Optimization
- Analytics tables include proper indexes for performance
- Consider partitioning large tables by date if needed
- Monitor query performance and add composite indexes as needed

### API Rate Limiting
- Analytics APIs include admin-only access controls
- Consider implementing rate limiting for high-traffic scenarios
- Use database connection pooling for better performance

### Data Retention
- Consider implementing data retention policies
- Archive old analytics data to separate tables
- Implement data cleanup jobs for old records

## Security Notes

- All analytics APIs require authentication
- Admin-only endpoints check user roles
- Sensitive data is properly sanitized
- Row Level Security (RLS) policies are in place
- Audit logging captures admin actions

## Future Enhancements

- Real-time dashboard updates using WebSockets
- Advanced analytics with user segmentation
- Export functionality for analytics data
- Custom dashboard widgets
- Alert system for unusual activity patterns