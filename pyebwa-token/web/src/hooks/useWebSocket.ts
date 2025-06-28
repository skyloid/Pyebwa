import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export const useWebSocket = (
  endpoint: string,
  options: UseWebSocketOptions = {}
) => {
  const {
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const getWebSocketUrl = useCallback(() => {
    const protocol = 'wss:';
    const host = process.env.REACT_APP_WS_HOST || 'rasin.pyebwa.com';
    return `${protocol}//${host}/ws${endpoint}`;
  }, [endpoint]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    try {
      const wsUrl = getWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectCountRef.current = 0;
        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle heartbeat response
          if (message.type === 'pong') {
            return;
          }

          setMessages(prev => [...prev, message]);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        stopHeartbeat();
        onDisconnect?.();

        // Attempt to reconnect if not manually closed
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionError('Failed to reconnect after maximum attempts');
        }
      };

      wsRef.current.onerror = (error) => {
        setConnectionError('WebSocket connection error');
        onError?.(error);
      };
    } catch (error) {
      setConnectionError('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', error);
    }
  }, [
    getWebSocketUrl,
    reconnectAttempts,
    reconnectInterval,
    startHeartbeat,
    stopHeartbeat,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectCountRef.current = reconnectAttempts; // Prevent auto-reconnect
  }, [reconnectAttempts, stopHeartbeat]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    isConnected,
    messages,
    lastMessage,
    connectionError,
    sendMessage,
    clearMessages,
    connect,
    disconnect,
    reconnectCount: reconnectCountRef.current,
  };
};