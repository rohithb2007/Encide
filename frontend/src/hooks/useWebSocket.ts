/**
 * MED-NET AI: Real-Time WebSocket Hook
 *
 * The WebSocket connection is kept stable across React renders.
 * Handlers are stored in a ref so changing parent state does not
 * recreate the connection.
 */

import { useEffect, useRef, useState } from 'react';

interface WebSocketHandlers {
  onSurgeTriggered?: (data: any) => void;
  onAssignmentCompleted?: (data: any) => void;
  onSimulationReset?: (data: any) => void;
  onInitialState?: (data: any) => void;
}

export function useWebSocket(handlers: WebSocketHandlers) {
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always keep the latest handlers without making the WebSocket
  // reconnect whenever App.tsx re-renders.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let isUnmounted = false;

    const apiBase =
      import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

    const wsUrl = apiBase.replace(/^http/, 'ws') + '/ws';

    const connect = () => {
      if (isUnmounted) return;

      // Don't create another connection if one already exists.
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isUnmounted) {
            setIsConnected(true);
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.event) {
              case 'INIT_STATE':
                handlersRef.current.onInitialState?.(data);
                break;

              case 'SURGE_TRIGGERED':
                handlersRef.current.onSurgeTriggered?.(data);
                break;

              case 'ASSIGNMENT_COMPLETED':
                handlersRef.current.onAssignmentCompleted?.(data);
                break;

              case 'SIMULATION_RESET':
                handlersRef.current.onSimulationReset?.(data);
                break;

              default:
                break;
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        socket.onerror = () => {
          if (!isUnmounted) {
            setIsConnected(false);
          }
        };

        socket.onclose = () => {
          if (wsRef.current === socket) {
            wsRef.current = null;
          }

          if (!isUnmounted) {
            setIsConnected(false);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3000);
          }
        };
      } catch (err) {
        console.error('WebSocket connection failed:', err);

        if (!isUnmounted) {
          setIsConnected(false);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      }
    };

    connect();

    // Keep connection alive.
    const pingInterval = setInterval(() => {
      const socket = wsRef.current;

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'PING' }));
      }
    }, 15000);

    return () => {
      isUnmounted = true;

      clearInterval(pingInterval);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const socket = wsRef.current;

      if (socket) {
        socket.onclose = null;
        socket.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { isConnected };
}
