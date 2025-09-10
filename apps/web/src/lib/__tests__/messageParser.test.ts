import { parseMessageContent } from '../messageParser'

describe('parseMessageContent', () => {
  it('returns text content when no code blocks are present', () => {
    const content = 'This is a simple text message'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'This is a simple text message'
      }
    ])
  })

  it('parses a single code block with language', () => {
    const content = 'Here is some code:\n```javascript\nconsole.log("Hello World")\n```'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'Here is some code:\n'
      },
      {
        type: 'code',
        content: 'console.log("Hello World")',
        language: 'javascript'
      }
    ])
  })

  it('parses a single code block without language', () => {
    const content = '```\nconst x = 1\n```'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'code',
        content: 'const x = 1',
        language: 'text'
      }
    ])
  })

  it('parses multiple code blocks', () => {
    const content = `
Before first code block
\`\`\`python
def hello():
    print("Hello")
\`\`\`
Between code blocks
\`\`\`sql
SELECT * FROM users
\`\`\`
After last code block
    `.trim()

    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: '\nBefore first code block\n'
      },
      {
        type: 'code',
        content: 'def hello():\n    print("Hello")',
        language: 'python'
      },
      {
        type: 'text',
        content: '\nBetween code blocks\n'
      },
      {
        type: 'code',
        content: 'SELECT * FROM users',
        language: 'sql'
      },
      {
        type: 'text',
        content: '\nAfter last code block'
      }
    ])
  })

  it('handles code blocks at the beginning', () => {
    const content = '```bash\necho "start"\n```\nThen some text'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'code',
        content: 'echo "start"',
        language: 'bash'
      },
      {
        type: 'text',
        content: '\nThen some text'
      }
    ])
  })

  it('handles code blocks at the end', () => {
    const content = 'Some text before\n```typescript\ninterface User {}\n```'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'Some text before\n'
      },
      {
        type: 'code',
        content: 'interface User {}',
        language: 'typescript'
      }
    ])
  })

  it('handles empty code blocks', () => {
    const content = 'Text before\n```\n```\nText after'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'Text before\n'
      },
      {
        type: 'text',
        content: '\nText after'
      }
    ])
  })

  it('handles code blocks with only whitespace', () => {
    const content = 'Text\n```javascript\n   \n```\nMore text'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'Text\n'
      },
      {
        type: 'text',
        content: '\nMore text'
      }
    ])
  })

  it('handles multiple consecutive code blocks', () => {
    const content = '```js\nconsole.log(1)\n```\n```python\nprint(2)\n```'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'code',
        content: 'console.log(1)',
        language: 'js'
      },
      {
        type: 'text',
        content: '\n'
      },
      {
        type: 'code',
        content: 'print(2)',
        language: 'python'
      }
    ])
  })

  it('handles code blocks with special characters', () => {
    const content = '```regex\n^[a-zA-Z0-9]+$\\n```\nEnd'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'code',
        content: '^[a-zA-Z0-9]+$\\n',
        language: 'regex'
      },
      {
        type: 'text',
        content: '\nEnd'
      }
    ])
  })

  it('handles multiline code with various whitespace', () => {
    const content = `
\`\`\`json
{
  "name": "test",
  "value": 123
}
\`\`\`
    `.trim()

    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'code',
        content: '{\n  "name": "test",\n  "value": 123\n}',
        language: 'json'
      }
    ])
  })

  it('ignores incomplete code blocks', () => {
    const content = 'Text with ``` incomplete code block'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'Text with ``` incomplete code block'
      }
    ])
  })

  it('handles empty string', () => {
    const result = parseMessageContent('')
    expect(result).toEqual([
      {
        type: 'text',
        content: ''
      }
    ])
  })

  it('handles string with only whitespace', () => {
    const result = parseMessageContent('   \n\t  ')
    expect(result).toEqual([
      {
        type: 'text',
        content: '   \n\t  '
      }
    ])
  })

  it('preserves original formatting in text parts', () => {
    const content = 'Line 1\n\nLine 3\n```code\ncontent\n```\nFinal line'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'text',
        content: 'Line 1\n\nLine 3\n'
      },
      {
        type: 'code',
        content: 'content',
        language: 'code'
      },
      {
        type: 'text',
        content: '\nFinal line'
      }
    ])
  })
})