import React from 'react';
import ChaosScroll from './components/ChaosScroll';
import './styles/ChaosScroll.css';

function App() {
  console.log('App is rendering');
  return (
    <div className="App">
      <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
        Infinite Chaos Scroll
      </h1>
      <ChaosScroll />
    </div>
  );
}

export default App;
