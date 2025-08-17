import React from 'react'
import Navbar from './components/Navbar.jsx'
import Maincontent from './components/Maincontent.jsx'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden flex flex-col">
      <main className="flex-grow">
        <Maincontent />
      </main>
    </div>
  )
}

export default App
