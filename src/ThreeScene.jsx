import { useEffect, useRef } from 'react';
import * as SceneManager from './SceneManager.js';

function ThreeScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) { return; }

    SceneManager.init(container);
    SceneManager.setAnimationLoop();

    const handleResize = () =>{SceneManager.resize(container)};
    window.addEventListener('resize', handleResize);

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      SceneManager.dispose(container);
    };
  }, []);

  return (
    <div className="three-wrapper">
      <div id="lil-gui-container" />
      <div ref={containerRef} className="three-container" />
    </div>
  );
}

export default ThreeScene

