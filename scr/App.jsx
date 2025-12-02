import React from 'react'
import FlowSim from './components/FlowSim'

export default function App(){
  return (
    <div className="app-root">
      <header className="topbar">
        <h1>Flow Simulator — Demo</h1>
      </header>
      <main className="main">
        <FlowSim />
      </main>
      <footer className="foot">Built as a lightweight demo. You can upload to GitHub and run locally.</footer>
    </div>
  )
}
