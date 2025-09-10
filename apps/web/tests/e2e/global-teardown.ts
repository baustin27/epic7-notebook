import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  // Cleanup code that runs after all tests
  console.log('Cleaning up E2E test environment...')

  // You can add global cleanup logic here, such as:
  // - Cleaning up test data
  // - Resetting external services
  // - Generating test reports

  console.log('E2E test environment cleanup complete.')
}

export default globalTeardown