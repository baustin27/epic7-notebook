import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Setup code that runs before all tests
  console.log('Setting up E2E test environment...')

  // You can add global setup logic here, such as:
  // - Setting up test data
  // - Configuring test users
  // - Initializing external services

  console.log('E2E test environment setup complete.')
}

export default globalSetup