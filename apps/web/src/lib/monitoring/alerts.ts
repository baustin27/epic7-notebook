import { supabase } from '../supabase'
import type { MonitoredFeature } from './provider-monitor'

/**
 * Usage Alerts System
 * 
 * Monitors usage thresholds and triggers alerts when limits are exceeded
 */

export interface UsageAlert {
  id: string
  feature_name: string
  alert_type: 'daily_cost' | 'weekly_cost' | 'monthly_cost' | 'daily_tokens' | 'weekly_tokens' | 'monthly_tokens'
  threshold_value: number
  enabled: boolean
  last_triggered?: string
}

export interface AlertConfiguration {
  feature: MonitoredFeature
  dailyCostLimit?: number
  weeklyCostLimit?: number
  monthlyCostLimit?: number
  dailyTokenLimit?: number
  weeklyTokenLimit?: number
  monthlyTokenLimit?: number
}

/**
 * Check if any usage thresholds have been exceeded
 */
export async function checkUsageThresholds(): Promise<{
  alerts: Array<{
    feature: string
    alertType: string
    currentValue: number
    threshold: number
    exceededBy: number
  }>
  summary: {
    totalAlerts: number
    criticalAlerts: number
  }
}> {
  try {
    // Get all enabled alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('usage_alerts')
      .select('*')
      .eq('enabled', true)

    if (alertsError) throw alertsError

    const triggeredAlerts = []
    let criticalCount = 0

    if (alerts) {
      for (const alert of alerts) {
        const currentValue = await getCurrentUsageValue(alert.feature_name, alert.alert_type)
        
        if (currentValue > alert.threshold_value) {
          const exceededBy = currentValue - alert.threshold_value
          const isCritical = exceededBy > (alert.threshold_value * 0.5) // 50% over threshold
          
          if (isCritical) criticalCount++

          triggeredAlerts.push({
            feature: alert.feature_name,
            alertType: alert.alert_type,
            currentValue,
            threshold: alert.threshold_value,
            exceededBy
          })

          // Update last_triggered timestamp
          await supabase
            .from('usage_alerts')
            .update({ last_triggered: new Date().toISOString() })
            .eq('id', alert.id)
        }
      }
    }

    return {
      alerts: triggeredAlerts,
      summary: {
        totalAlerts: triggeredAlerts.length,
        criticalAlerts: criticalCount
      }
    }
  } catch (error) {
    console.error('Failed to check usage thresholds:', error)
    return {
      alerts: [],
      summary: { totalAlerts: 0, criticalAlerts: 0 }
    }
  }
}

/**
 * Get current usage value for a specific alert type
 */
async function getCurrentUsageValue(feature: string, alertType: string): Promise<number> {
  try {
    let timeFilter = new Date()
    
    // Calculate time range based on alert type
    switch (alertType) {
      case 'daily_cost':
      case 'daily_tokens':
        timeFilter.setHours(timeFilter.getHours() - 24)
        break
      case 'weekly_cost':
      case 'weekly_tokens':
        timeFilter.setDate(timeFilter.getDate() - 7)
        break
      case 'monthly_cost':
      case 'monthly_tokens':
        timeFilter.setMonth(timeFilter.getMonth() - 1)
        break
    }

    let query = supabase
      .from('provider_usage_logs')
      .select('cost_usd, tokens_input, tokens_output')
      .eq('feature', feature)
      .gte('created_at', timeFilter.toISOString())

    const { data, error } = await query

    if (error) throw error

    if (!data) return 0

    // Calculate the appropriate metric
    if (alertType.includes('cost')) {
      return data.reduce((sum, row) => sum + parseFloat(row.cost_usd || '0'), 0)
    } else {
      return data.reduce((sum, row) => sum + (row.tokens_input || 0) + (row.tokens_output || 0), 0)
    }
  } catch (error) {
    console.error('Failed to get current usage value:', error)
    return 0
  }
}

/**
 * Configure alerts for a specific feature
 */
export async function configureAlerts(config: AlertConfiguration): Promise<boolean> {
  try {
    const alerts = []

    // Build alert configurations
    if (config.dailyCostLimit) {
      alerts.push({
        feature_name: config.feature,
        alert_type: 'daily_cost' as const,
        threshold_value: config.dailyCostLimit,
        enabled: true
      })
    }

    if (config.weeklyCostLimit) {
      alerts.push({
        feature_name: config.feature,
        alert_type: 'weekly_cost' as const,
        threshold_value: config.weeklyCostLimit,
        enabled: true
      })
    }

    if (config.monthlyCostLimit) {
      alerts.push({
        feature_name: config.feature,
        alert_type: 'monthly_cost' as const,
        threshold_value: config.monthlyCostLimit,
        enabled: true
      })
    }

    if (config.dailyTokenLimit) {
      alerts.push({
        feature_name: config.feature,
        alert_type: 'daily_tokens' as const,
        threshold_value: config.dailyTokenLimit,
        enabled: true
      })
    }

    if (config.weeklyTokenLimit) {
      alerts.push({
        feature_name: config.feature,
        alert_type: 'weekly_tokens' as const,
        threshold_value: config.weeklyTokenLimit,
        enabled: true
      })
    }

    if (config.monthlyTokenLimit) {
      alerts.push({
        feature_name: config.feature,
        alert_type: 'monthly_tokens' as const,
        threshold_value: config.monthlyTokenLimit,
        enabled: true
      })
    }

    // Upsert alerts
    for (const alert of alerts) {
      const { error } = await supabase
        .from('usage_alerts')
        .upsert(alert, {
          onConflict: 'feature_name,alert_type',
          ignoreDuplicates: false
        })

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('Failed to configure alerts:', error)
    return false
  }
}

/**
 * Get all configured alerts for a feature
 */
export async function getFeatureAlerts(feature: MonitoredFeature): Promise<UsageAlert[]> {
  try {
    const { data, error } = await supabase
      .from('usage_alerts')
      .select('*')
      .eq('feature_name', feature)
      .order('alert_type')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to get feature alerts:', error)
    return []
  }
}

/**
 * Disable/enable an alert
 */
export async function toggleAlert(alertId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('usage_alerts')
      .update({ enabled })
      .eq('id', alertId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to toggle alert:', error)
    return false
  }
}

/**
 * Delete an alert configuration
 */
export async function deleteAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('usage_alerts')
      .delete()
      .eq('id', alertId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to delete alert:', error)
    return false
  }
}

/**
 * Get usage summary with alert status
 */
export async function getUsageSummaryWithAlerts() {
  try {
    const [thresholdCheck, usageStats] = await Promise.all([
      checkUsageThresholds(),
      supabase.rpc('get_feature_usage_summary', {
        p_feature_name: null,
        p_time_period: '24 hours'
      })
    ])

    return {
      alerts: thresholdCheck.alerts,
      alertSummary: thresholdCheck.summary,
      usageStats: usageStats.data || [],
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to get usage summary with alerts:', error)
    return {
      alerts: [],
      alertSummary: { totalAlerts: 0, criticalAlerts: 0 },
      usageStats: [],
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Send alert notifications (placeholder for email/webhook integration)
 */
export async function sendAlertNotification(alert: {
  feature: string
  alertType: string
  currentValue: number
  threshold: number
  exceededBy: number
}): Promise<void> {
  // This is a placeholder for actual notification logic
  // In a real implementation, you would:
  // 1. Send email notifications
  // 2. Call webhook endpoints
  // 3. Send Slack/Discord messages
  // 4. Log to external monitoring systems

  console.log('USAGE ALERT:', {
    message: `Feature "${alert.feature}" has exceeded ${alert.alertType} threshold`,
    current: alert.currentValue,
    threshold: alert.threshold,
    exceededBy: alert.exceededBy,
    timestamp: new Date().toISOString()
  })

  // TODO: Implement actual notification mechanisms:
  // - Email via SendGrid/SES
  // - Webhook notifications
  // - Slack/Discord integration
  // - SMS alerts for critical thresholds
}