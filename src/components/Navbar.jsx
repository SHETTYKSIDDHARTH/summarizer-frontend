import React from 'react'

function Navbar() {
  return (
    <nav className="h-16 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-md flex items-center px-4 md:px-6">
      <h1 className="text-xl md:text-2xl font-semibold text-green-400 tracking-wide">
        Easy<span className="text-white">Summarize</span>
      </h1>
    </nav>
  )
}

export default Navbar
