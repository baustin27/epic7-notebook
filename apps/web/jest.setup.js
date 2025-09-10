import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers for axe-core accessibility testing
expect.extend(toHaveNoViolations)