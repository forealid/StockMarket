// Content script - bridges injected script and extension
(function() {
  // Inject the WebSocket interceptor
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  
  // State management
  let lastBetStats = null;
  let currentPrediction = null;
  let isTraining = false;
  let sessionStats = { wins: 0, losses: 0 };
  
  // Listen for messages from injected script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data.source !== 'stockmarket-ws-interceptor') return;
    
    const payload = event.data.payload;
    
    if (payload.type === 'stockmarket.betStats') {
      handleBetStats(payload);
    } else if (payload.type === 'stockmarket.lastResults') {
      handleLastResults(payload);
    }
  });
  
  function handleBetStats(data) {
    lastBetStats = {
      upBets: data.args.upBets,
      upWager: data.args.upWager,
      downBets: data.args.downBets,
      downWager: data.args.downWager,
      timestamp: data.time
    };
    
    console.log('[Predictor] Bet stats received:', lastBetStats);
    
    // Request prediction if training is active
    if (isTraining && lastBetStats) {
      requestPrediction();
    }
  }
  
  function handleLastResults(data) {
    if (!data.args.history || data.args.history.length === 0) return;
    
    const firstHistory = data.args.history[0];
    if (!firstHistory || firstHistory.length === 0) return;
    
    const finalResult = firstHistory[firstHistory.length - 1];
    
    console.log('[Predictor] Round completed. Final result:', finalResult);
    
    // If we had bet stats and a prediction, evaluate and train
    if (lastBetStats && isTraining) {
      evaluatePrediction(finalResult);
      trainModel(lastBetStats, finalResult);
    }
    
    // Reset for next round
    lastBetStats = null;
  }
  
  function requestPrediction() {
    chrome.runtime.sendMessage({
      action: 'predict',
      betStats: lastBetStats
    }, response => {
      if (response && response.prediction) {
        currentPrediction = response.prediction;
        updateUI();
      }
    });
  }
  
  function evaluatePrediction(finalResult) {
    if (!currentPrediction) return;
    
    const actualDirection = finalResult > 0 ? 'UP' : 'DOWN';
    const isCorrect = currentPrediction === actualDirection;
    
    if (isCorrect) {
      sessionStats.wins++;
    } else {
      sessionStats.losses++;
    }
    
    console.log('[Predictor] Prediction:', currentPrediction, '| Actual:', actualDirection, '| Result:', isCorrect ? 'WIN' : 'LOSS');
    
    // Send stats to background
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stats: sessionStats
    });
    
    updateUI();
  }
  
  function trainModel(betStats, finalResult) {
    chrome.runtime.sendMessage({
      action: 'train',
      data: {
        betStats: betStats,
        finalResult: finalResult
      }
    });
  }
  
  function updateUI() {
    const floatingWindow = document.getElementById('stockmarket-predictor-ui');
    if (floatingWindow) {
      floatingWindow.contentWindow.postMessage({
        action: 'update',
        prediction: currentPrediction,
        stats: sessionStats,
        isTraining: isTraining
      }, '*');
    }
  }
  
  // Listen for UI commands
  window.addEventListener('message', function(event) {
    if (event.data.source !== 'stockmarket-predictor-ui') return;
    
    const action = event.data.action;
    
    if (action === 'toggleTraining') {
      isTraining = !isTraining;
      chrome.runtime.sendMessage({
        action: 'setTraining',
        isTraining: isTraining
      });
      updateUI();
    } else if (action === 'reset') {
      sessionStats = { wins: 0, losses: 0 };
      currentPrediction = null;
      chrome.runtime.sendMessage({ action: 'reset' });
      updateUI();
    } else if (action === 'export') {
      chrome.runtime.sendMessage({ action: 'export' }, response => {
        if (response && response.data) {
          downloadData(response.data);
        }
      });
    } else if (action === 'import') {
      showFileImport();
    }
  });
  
  function downloadData(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockmarket-predictor-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function showFileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          try {
            const data = JSON.parse(event.target.result);
            chrome.runtime.sendMessage({
              action: 'import',
              data: data
            }, response => {
              if (response && response.success) {
                alert('Data imported successfully!');
              }
            });
          } catch (e) {
            alert('Invalid file format');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
  
  // Create floating UI
  function createFloatingUI() {
    const iframe = document.createElement('iframe');
    iframe.id = 'stockmarket-predictor-ui';
    iframe.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      height: 280px;
      border: none;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border-radius: 12px;
    `;
    
    document.body.appendChild(iframe);
    
    iframe.contentDocument.open();
    iframe.contentDocument.write(getUIHTML());
    iframe.contentDocument.close();
    
    makeDraggable(iframe);
  }
  
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.contentDocument.getElementById('predictor-header').onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + 'px';
      element.style.left = (element.offsetLeft - pos1) + 'px';
      element.style.right = 'auto';
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  function getUIHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
}
#predictor-header {
  background: rgba(0,0,0,0.2);
  padding: 12px;
  cursor: move;
  font-weight: 600;
  text-align: center;
  border-radius: 12px 12px 0 0;
}
.content {
  padding: 20px;
}
.prediction-box {
  background: rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  text-align: center;
}
.prediction-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 5px;
}
.prediction-value {
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.stats {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.stat-box {
  flex: 1;
  background: rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}
.stat-label {
  font-size: 11px;
  opacity: 0.8;
}
.stat-value {
  font-size: 20px;
  font-weight: bold;
  margin-top: 5px;
}
.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
button {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}
button:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-1px);
}
button:active {
  transform: translateY(0);
}
.btn-primary {
  grid-column: 1 / -1;
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
}
.btn-primary.active {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
}
</style>
</head>
<body>
<div id="predictor-header">📊 StockMarket ML Predictor</div>
<div class="content">
  <div class="prediction-box">
    <div class="prediction-label">ML Prediction</div>
    <div class="prediction-value" id="prediction">-</div>
  </div>
  
  <div class="stats">
    <div class="stat-box">
      <div class="stat-label">Wins</div>
      <div class="stat-value" id="wins">0</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Losses</div>
      <div class="stat-value" id="losses">0</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value" id="winrate">0%</div>
    </div>
  </div>
  
  <div class="buttons">
    <button class="btn-primary" id="toggleBtn">Start Training</button>
    <button id="resetBtn">Reset</button>
    <button id="exportBtn">Export</button>
    <button id="importBtn">Import</button>
  </div>
</div>

<script>
window.addEventListener('message', function(event) {
  if (event.data.action === 'update') {
    updateUI(event.data);
  }
});

function updateUI(data) {
  if (data.prediction) {
    document.getElementById('prediction').textContent = data.prediction;
    document.getElementById('prediction').style.color = data.prediction === 'UP' ? '#4CAF50' : '#F44336';
  }
  
  if (data.stats) {
    document.getElementById('wins').textContent = data.stats.wins;
    document.getElementById('losses').textContent = data.stats.losses;
    const total = data.stats.wins + data.stats.losses;
    const winrate = total > 0 ? Math.round((data.stats.wins / total) * 100) : 0;
    document.getElementById('winrate').textContent = winrate + '%';
  }
  
  const toggleBtn = document.getElementById('toggleBtn');
  if (data.isTraining) {
    toggleBtn.textContent = 'Stop Training';
    toggleBtn.classList.add('active');
  } else {
    toggleBtn.textContent = 'Start Training';
    toggleBtn.classList.remove('active');
  }
}

document.getElementById('toggleBtn').onclick = function() {
  parent.postMessage({ source: 'stockmarket-predictor-ui', action: 'toggleTraining' }, '*');
};

document.getElementById('resetBtn').onclick = function() {
  if (confirm('Reset all training data and statistics?')) {
    parent.postMessage({ source: 'stockmarket-predictor-ui', action: 'reset' }, '*');
  }
};

document.getElementById('exportBtn').onclick = function() {
  parent.postMessage({ source: 'stockmarket-predictor-ui', action: 'export' }, '*');
};

document.getElementById('importBtn').onclick = function() {
  parent.postMessage({ source: 'stockmarket-predictor-ui', action: 'import' }, '*');
};
</script>
</body>
</html>
    `;
  }
  
  // Initialize UI when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingUI);
  } else {
    createFloatingUI();
  }
})();