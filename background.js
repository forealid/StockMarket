// Background service worker - handles ML training and predictions
class MLPredictor {
  constructor() {
    this.trainingData = [];
    this.model = {
      weights: {
        upWagerRatio: 0,
        downWagerRatio: 0,
        upBetsRatio: 0,
        downBetsRatio: 0,
        wagerDifference: 0,
        betsDifference: 0,
        bias: 0
      },
      learningRate: 0.01,
      iterations: 0
    };
    this.loadFromStorage();
  }
  
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(['trainingData', 'model']);
      if (result.trainingData) {
        this.trainingData = result.trainingData;
      }
      if (result.model) {
        this.model = result.model;
      }
      console.log('[ML] Loaded data. Training samples:', this.trainingData.length);
    } catch (e) {
      console.error('[ML] Load error:', e);
    }
  }
  
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        trainingData: this.trainingData,
        model: this.model
      });
    } catch (e) {
      console.error('[ML] Save error:', e);
    }
  }
  
  extractFeatures(betStats) {
    const totalWager = betStats.upWager + betStats.downWager;
    const totalBets = betStats.upBets + betStats.downBets;
    
    // Avoid division by zero
    const upWagerRatio = totalWager > 0 ? betStats.upWager / totalWager : 0.5;
    const downWagerRatio = totalWager > 0 ? betStats.downWager / totalWager : 0.5;
    const upBetsRatio = totalBets > 0 ? betStats.upBets / totalBets : 0.5;
    const downBetsRatio = totalBets > 0 ? betStats.downBets / totalBets : 0.5;
    const wagerDifference = betStats.downWager - betStats.upWager;
    const betsDifference = betStats.downBets - betStats.upBets;
    
    return {
      upWagerRatio,
      downWagerRatio,
      upBetsRatio,
      downBetsRatio,
      wagerDifference,
      betsDifference
    };
  }
  
  predict(betStats) {
    const features = this.extractFeatures(betStats);
    const w = this.model.weights;
    
    // Simple linear combination
    const score = 
      w.upWagerRatio * features.upWagerRatio +
      w.downWagerRatio * features.downWagerRatio +
      w.upBetsRatio * features.upBetsRatio +
      w.downBetsRatio * features.downBetsRatio +
      w.wagerDifference * features.wagerDifference +
      w.betsDifference * features.betsDifference +
      w.bias;
    
    // If we have no training data, use a heuristic
    if (this.trainingData.length < 5) {
      // Simple heuristic: bet against the majority wager
      return features.downWagerRatio > features.upWagerRatio ? 'UP' : 'DOWN';
    }
    
    // Positive score = UP, Negative score = DOWN
    return score > 0 ? 'UP' : 'DOWN';
  }
  
  train(betStats, finalResult) {
    // Store training data
    this.trainingData.push({
      betStats: betStats,
      finalResult: finalResult,
      timestamp: Date.now()
    });
    
    // Limit training data size
    if (this.trainingData.length > 10000) {
      this.trainingData.shift();
    }
    
    // Update model with gradient descent
    const features = this.extractFeatures(betStats);
    const actualDirection = finalResult > 0 ? 1 : -1; // UP=1, DOWN=-1
    
    const w = this.model.weights;
    const score = 
      w.upWagerRatio * features.upWagerRatio +
      w.downWagerRatio * features.downWagerRatio +
      w.upBetsRatio * features.upBetsRatio +
      w.downBetsRatio * features.downBetsRatio +
      w.wagerDifference * features.wagerDifference +
      w.betsDifference * features.betsDifference +
      w.bias;
    
    const predictedDirection = score > 0 ? 1 : -1;
    const error = actualDirection - predictedDirection;
    
    // Update weights using gradient descent
    const lr = this.model.learningRate;
    w.upWagerRatio += lr * error * features.upWagerRatio;
    w.downWagerRatio += lr * error * features.downWagerRatio;
    w.upBetsRatio += lr * error * features.upBetsRatio;
    w.downBetsRatio += lr * error * features.downBetsRatio;
    w.wagerDifference += lr * error * features.wagerDifference;
    w.betsDifference += lr * error * features.betsDifference;
    w.bias += lr * error;
    
    this.model.iterations++;
    
    // Decay learning rate over time
    if (this.model.iterations % 100 === 0) {
      this.model.learningRate *= 0.99;
      this.model.learningRate = Math.max(this.model.learningRate, 0.001);
    }
    
    console.log('[ML] Training iteration:', this.model.iterations, '| Error:', error);
    
    // Save periodically
    if (this.model.iterations % 10 === 0) {
      this.saveToStorage();
    }
  }
  
  reset() {
    this.trainingData = [];
    this.model = {
      weights: {
        upWagerRatio: 0,
        downWagerRatio: 0,
        upBetsRatio: 0,
        downBetsRatio: 0,
        wagerDifference: 0,
        betsDifference: 0,
        bias: 0
      },
      learningRate: 0.01,
      iterations: 0
    };
    this.saveToStorage();
    console.log('[ML] Reset complete');
  }
  
  exportData() {
    return {
      trainingData: this.trainingData,
      model: this.model,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  }
  
  importData(data) {
    try {
      if (data.trainingData) {
        this.trainingData = data.trainingData;
      }
      if (data.model) {
        this.model = data.model;
      }
      this.saveToStorage();
      console.log('[ML] Import successful. Samples:', this.trainingData.length);
      return true;
    } catch (e) {
      console.error('[ML] Import error:', e);
      return false;
    }
  }
}

// Initialize predictor
const predictor = new MLPredictor();

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'predict') {
    const prediction = predictor.predict(request.betStats);
    sendResponse({ prediction: prediction });
  } 
  else if (request.action === 'train') {
    predictor.train(request.data.betStats, request.data.finalResult);
    sendResponse({ success: true });
  }
  else if (request.action === 'reset') {
    predictor.reset();
    sendResponse({ success: true });
  }
  else if (request.action === 'export') {
    const data = predictor.exportData();
    sendResponse({ data: data });
  }
  else if (request.action === 'import') {
    const success = predictor.importData(request.data);
    sendResponse({ success: success });
  }
  else if (request.action === 'setTraining') {
    // Just acknowledge
    sendResponse({ success: true });
  }
  else if (request.action === 'updateStats') {
    // Just acknowledge
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});