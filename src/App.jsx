import './App.css'
import ThreeScene from './ThreeScene.jsx'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Atmosphere</h1>
        <p>A Three.js atmosphere scene in React</p>
      </header>
      <ThreeScene />
    </div>
  )
}

export default App
