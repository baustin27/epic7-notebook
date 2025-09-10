'use client'

const SkipLinks = () => {
  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-2 focus:rounded focus:shadow-lg focus:text-black"
      >
        Skip to main content
      </a>
      <a 
        href="#chat-area" 
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-12 focus:z-50 focus:bg-white focus:p-2 focus:rounded focus:shadow-lg focus:text-black"
      >
        Skip to chat area
      </a>
      <a 
        href="#sidebar" 
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:bg-white focus:p-2 focus:rounded focus:shadow-lg focus:text-black"
      >
        Skip to sidebar
      </a>
    </>
  )
}

export { SkipLinks }