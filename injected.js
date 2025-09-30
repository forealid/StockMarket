// This script intercepts WebSocket connections at the page level
(function() {
  const OriginalWebSocket = window.WebSocket;
  
  window.WebSocket = function(...args) {
    const ws = new OriginalWebSocket(...args);
    const url = args[0];
    
    // Check if this is the target WebSocket
    if (url.includes('socket?messageFormat=json')) {
      console.log('[StockMarket Predictor] Target WebSocket detected:', url);
      
      // Intercept incoming messages
      const originalAddEventListener = ws.addEventListener;
      ws.addEventListener = function(type, listener, ...rest) {
        if (type === 'message') {
          const wrappedListener = function(event) {
            try {
              const data = JSON.parse(event.data);
              
              // Forward relevant messages to content script
              if (data.type === 'stockmarket.betStats' || data.type === 'stockmarket.lastResults') {
                window.postMessage({
                  source: 'stockmarket-ws-interceptor',
                  payload: data
                }, '*');
              }
            } catch (e) {
              // Not JSON or parsing error
            }
            
            // Call original listener
            return listener.apply(this, arguments);
          };
          
          return originalAddEventListener.call(this, type, wrappedListener, ...rest);
        }
        
        return originalAddEventListener.apply(this, arguments);
      };
      
      // Also intercept onmessage property
      Object.defineProperty(ws, 'onmessage', {
        set: function(handler) {
          this._customOnMessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'stockmarket.betStats' || data.type === 'stockmarket.lastResults') {
                window.postMessage({
                  source: 'stockmarket-ws-interceptor',
                  payload: data
                }, '*');
              }
            } catch (e) {
              // Not JSON or parsing error
            }
            
            if (handler) {
              handler.call(this, event);
            }
          };
        },
        get: function() {
          return this._customOnMessage;
        }
      });
    }
    
    return ws;
  };
  
  // Copy static properties
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();