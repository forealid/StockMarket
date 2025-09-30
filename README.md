# StockMarket ML Predictor - Chrome Extension

A Chrome extension that intercepts WebSocket messages, trains a machine learning model, and predicts stock market betting outcomes.

## 📋 Files Structure

```
stockmarket-predictor/
├── manifest.json          # Extension configuration
├── background.js          # ML training & prediction logic
├── content.js            # Content script & UI management
├── injected.js           # WebSocket interceptor
├── popup.html            # Extension popup interface
├── icon16.png            # 16x16 icon
├── icon48.png            # 48x48 icon
└── icon128.png           # 128x128 icon
```

## 🚀 Installation

1. **Download all files** to a folder called `stockmarket-predictor`

2. **Create extension icons** (or use placeholder images):
   - `icon16.png` - 16x16 pixels
   - `icon48.png` - 48x48 pixels
   - `icon128.png` - 128x128 pixels

3. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `stockmarket-predictor` folder

4. **Verify installation**:
   - You should see the extension icon in your toolbar
   - Click it to see the popup with status info

## 📖 How to Use

### Basic Operation

1. **Navigate to the target website** that uses WebSocket with `socket?messageFormat=json`

2. **Look for the floating UI** in the top-right corner of the page

3. **Start Training**:
   - Click the "Start Training" button
   - The extension will now intercept WebSocket messages
   - ML model begins learning from betting patterns

4. **View Predictions**:
   - After a few rounds, the ML will show predictions (UP or DOWN)
   - Win rate statistics update automatically
   - Green = UP prediction, Red = DOWN prediction

### Features

**Draggable Window**: Click and drag the header to reposition the floating UI

**Control Buttons**:
- **Start/Stop Training**: Toggle ML training on/off
- **Reset**: Clear all training data and statistics
- **Export**: Download training data and model to JSON file
- **Import**: Load previously exported training data

### Statistics Tracking

The extension tracks:
- **Wins**: Correct predictions
- **Losses**: Incorrect predictions  
- **Win Rate**: Percentage of correct predictions

A prediction is marked as:
- ✅ **WIN** if prediction matches actual result direction
- ❌ **LOSS** if prediction doesn't match actual result

## 🔍 What It Does

### WebSocket Interception

The extension monitors WebSocket connections for:

**1. `stockmarket.betStats` messages**:
```json
{
  "type": "stockmarket.betStats",
  "args": {
    "upBets": 4,
    "upWager": 88.79,
    "downBets": 4,
    "downWager": 1133.30
  }
}
```

**2. `stockmarket.lastResults` messages**:
```json
{
  "type": "stockmarket.lastResults",
  "args": {
    "history": [
      [0, 2, 3, ..., -68]
    ]
  }
}
```

### Machine Learning

**Features Extracted**:
- Up wager ratio vs total wager
- Down wager ratio vs total wager
- Up bets ratio vs total bets
- Down bets ratio vs total bets
- Wager difference (down - up)
- Bets difference (down - up)

**Training Algorithm**:
- Linear regression with gradient descent
- Adaptive learning rate (starts at 0.01, decays over time)
- Continuous learning from each round
- Self-improvement based on prediction accuracy

**Prediction Logic**:
- Calculates weighted score from features
- Positive score → UP prediction
- Negative score → DOWN prediction
- Falls back to heuristic if insufficient training data

## 💾 Data Export/Import

### Export Format

Exported JSON contains:
```json
{
  "trainingData": [...],
  "model": {
    "weights": {...},
    "learningRate": 0.01,
    "iterations": 150
  },
  "exportDate": "2025-09-30T...",
  "version": "1.0.0"
}
```

### Best Practices

- Export data regularly to save training progress
- Import data to continue training across sessions
- Keep backups of well-trained models

## 🛠️ Technical Details

**Technologies Used**:
- WebSocket interception via proxy
- Chrome Extension Manifest V3
- Gradient descent machine learning
- Chrome Storage API for persistence

**Storage**:
- Training data stored locally in Chrome storage
- Maximum 10,000 training samples
- Model weights persist between sessions

**Performance**:
- Minimal impact on page performance
- Asynchronous message processing
- Incremental model updates

## ⚠️ Important Notes

1. **Privacy**: All data stays local - nothing is sent to external servers

2. **Accuracy**: ML predictions improve over time with more training data

3. **Heuristic Fallback**: With <5 training samples, uses simple heuristic (bet against majority wager)

4. **Learning Rate**: Automatically decays to prevent overfitting

5. **Data Limits**: Stores up to 10,000 training samples to prevent excessive memory use

## 🐛 Troubleshooting

**Floating UI not appearing?**
- Check browser console for errors
- Refresh the page
- Verify extension is enabled

**No predictions showing?**
- Click "Start Training" button
- Wait for WebSocket messages to arrive
- Check that you're on the correct page

**Predictions seem random?**
- Model needs more training data
- Try exporting/importing previously trained model
- Reset and retrain if model seems corrupted

## 📊 Understanding Predictions

**UP Prediction**: Model expects positive final result (price increase)

**DOWN Prediction**: Model expects negative final result (price decrease)

**Confidence**: Not currently displayed, but influenced by:
- Training data quantity
- Feature correlation strength
- Historical accuracy

## 🔄 Updates & Improvements

Future enhancements could include:
- Confidence scores for predictions
- Advanced ML algorithms (neural networks)
- Historical chart visualization
- Multiple model comparison
- Auto-tuning parameters

## 📄 License

This extension is provided as-is for educational purposes.

---

**Version**: 1.0.0  
**Last Updated**: September 30, 2025