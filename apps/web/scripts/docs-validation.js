#!/usr/bin/env node

/**
 * Documentation Validation Script
 *
 * This script validates documentation for:
 * - Broken internal links
 * - Missing API documentation
 * - Outdated code examples
 * - Documentation coverage
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

class DocsValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.docsPath = path.join(__dirname, '..', 'pages', 'docs')
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
    console.log(`[${timestamp}] ${prefix} ${message}`)
  }

  async validateInternalLinks() {
    this.log('Validating internal links...')

    const docFiles = await glob('**/*.mdx', { cwd: this.docsPath })

    for (const file of docFiles) {
      const content = fs.readFileSync(path.join(this.docsPath, file), 'utf8')
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match

      while ((match = linkRegex.exec(content)) !== null) {
        const [fullMatch, text, link] = match

        // Skip external links and anchors
        if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) {
          continue
        }

        // Check if link points to existing file
        const linkPath = path.resolve(this.docsPath, link.replace('.mdx', '') + '.mdx')
        const linkExists = fs.existsSync(linkPath)

        if (!linkExists) {
          this.errors.push({
            file,
            type: 'broken_link',
            message: `Broken internal link: ${link}`,
            line: this.getLineNumber(content, fullMatch)
          })
        }
      }
    }
  }

  async validateApiDocumentation() {
    this.log('Validating API documentation coverage...')

    // Get all API route files
    const apiFiles = await glob('src/app/api/**/*.ts', {
      cwd: path.join(__dirname, '..')
    })

    // Get documented endpoints
    const apiDocContent = fs.readFileSync(
      path.join(this.docsPath, 'api.mdx'),
      'utf8'
    )

    for (const apiFile of apiFiles) {
      const routePath = this.apiFileToRoute(apiFile)

      if (!apiDocContent.includes(routePath)) {
        this.warnings.push({
          file: 'api.mdx',
          type: 'missing_api_doc',
          message: `Undocumented API endpoint: ${routePath}`,
          details: `File: ${apiFile}`
        })
      }
    }
  }

  async validateCodeExamples() {
    this.log('Validating code examples...')

    const docFiles = await glob('**/*.mdx', { cwd: this.docsPath })

    for (const file of docFiles) {
      const content = fs.readFileSync(path.join(this.docsPath, file), 'utf8')
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      let match

      while ((match = codeBlockRegex.exec(content)) !== null) {
        const [fullMatch, language, code] = match

        // Basic syntax validation for TypeScript/JavaScript
        if (language === 'typescript' || language === 'javascript') {
          const syntaxErrors = this.validateJavaScriptSyntax(code)
          if (syntaxErrors.length > 0) {
            this.warnings.push({
              file,
              type: 'syntax_error',
              message: `Potential syntax error in code example`,
              details: syntaxErrors.join(', '),
              line: this.getLineNumber(content, fullMatch)
            })
          }
        }
      }
    }
  }

  validateJavaScriptSyntax(code) {
    const errors = []

    // Check for common syntax issues
    if (code.includes('console.log(') && !code.includes('import')) {
      errors.push('Missing import for console')
    }

    // Check for undefined variables (basic check)
    const lines = code.split('\n')
    const declaredVars = new Set()

    for (const line of lines) {
      // Simple variable declaration detection
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)/)
      if (varMatch) {
        declaredVars.add(varMatch[1])
      }

      // Check for usage of undeclared variables
      const usageMatch = line.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g)
      if (usageMatch) {
        for (const variable of usageMatch) {
          if (!declaredVars.has(variable) &&
              !['console', 'process', 'require', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'if', 'else', 'for', 'while', 'function', 'return', 'true', 'false', 'null', 'undefined'].includes(variable)) {
            errors.push(`Potentially undefined variable: ${variable}`)
          }
        }
      }
    }

    return errors
  }

  apiFileToRoute(filePath) {
    // Convert src/app/api/conversations/route.ts to /conversations
    return filePath
      .replace('src/app/api', '')
      .replace('/route.ts', '')
      .replace('.ts', '')
  }

  getLineNumber(content, searchString) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchString)) {
        return i + 1
      }
    }
    return -1
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        total: this.errors.length + this.warnings.length
      },
      errors: this.errors,
      warnings: this.warnings
    }

    // Write report to file
    const reportPath = path.join(__dirname, '..', 'docs-validation-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    return report
  }

  async run() {
    this.log('Starting documentation validation...')

    try {
      await this.validateInternalLinks()
      await this.validateApiDocumentation()
      await this.validateCodeExamples()

      const report = this.generateReport()

      this.log(`Validation complete. Found ${report.summary.errors} errors and ${report.summary.warnings} warnings.`)

      if (report.summary.errors > 0) {
        this.log('❌ Validation failed due to errors', 'error')
        process.exit(1)
      } else if (report.summary.warnings > 0) {
        this.log('⚠️ Validation passed with warnings', 'warning')
        process.exit(0)
      } else {
        this.log('✅ Validation passed successfully')
        process.exit(0)
      }

    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }
}

// CLI runner
if (require.main === module) {
  const validator = new DocsValidator()
  validator.run()
}

module.exports = DocsValidator