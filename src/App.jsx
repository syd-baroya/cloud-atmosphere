import './App.css'
import ThreeScene from './ThreeScene.jsx'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Colored Cloud</h1>
        <p>A minimal Three.js scene in React</p>
      </header>
      <ThreeScene />
    </div>
  )
}

export default App
