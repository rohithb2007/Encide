/**
 * MED-NET AI: Real-Time WebSocket Hook
 * Extended with Multi-Agency Events for Reports, Ambulances, Hospitals, Alerts, and Advisories
 */

import { useEffect, useRef, useState } from 'react';

interface WebSocketHandlers {
  onSurgeTriggered?: (data: any) => void;
  onAssignmentCompleted?: (data: any) => void;
  onSimulationReset?: (data: any) => void;
  onInitialState?: (data: any) => void;
  onReportAdded?: (data: any) => void;
  onHospitalUpdated?: (data: any) => void;
  onAmbulanceUpdated?: (data: any) => void;
  onAlertUpdated?: (data: any) => void;
  onAdvisoryPublished?: (data: any) => void;
  onGeneralUpdate?: (data: any) => void;
}

export function useWebSocket(handlers: WebSocketHandlers, role: string, actor: string) {
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let isUnmounted = false;

    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? `${window.location.origin}/api` : 'http://127.0.0.1:8001');
    const query = new URLSearchParams({ role, actor });
    const wsEndpoint = new URL(`${apiBase.replace(/\/$/, '')}/ws`, window.location.origin);
    wsEndpoint.protocol = wsEndpoint.protocol === 'https:' ? 'wss:' : 'ws:';
    wsEndpoint.search = query.toString();
    const wsUrl = wsEndpoint.toString();

    const connect = () => {
      if (isUnmounted) return;

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
              case 'ASSIGNMENT_APPROVED':
              case 'REPLAN_APPROVED':
                handlersRef.current.onAssignmentCompleted?.(data);
                break;
              case 'REPORT_ADDED':
              case 'REPORT_REVIEWED':
                handlersRef.current.onReportAdded?.(data);
                break;
              case 'HOSPITAL_UPDATED':
              case 'HOSPITAL_ALERT_ACKNOWLEDGED':
                handlersRef.current.onHospitalUpdated?.(data);
                break;
              case 'HOSPITAL_REFERRAL_RESPONDED':
                handlersRef.current.onHospitalUpdated?.(data);
                handlersRef.current.onAmbulanceUpdated?.(data);
                break;
              case 'AMBULANCE_UPDATED':
              case 'CASUALTY_IN_TRANSIT':
              case 'HANDOVER_COMPLETED':
              case 'DRIVER_REPORTED_ARRIVAL':
              case 'HOSPITAL_RECEIPT_CONFIRMED':
                handlersRef.current.onAmbulanceUpdated?.(data);
                break;
              case 'ALERT_UPDATED':
                handlersRef.current.onAlertUpdated?.(data);
                break;
              case 'ADVISORY_PUBLISHED':
              case 'ADVISORY_WITHDRAWN':
                handlersRef.current.onAdvisoryPublished?.(data);
                break;
              case 'SIMULATION_RESET':
                handlersRef.current.onSimulationReset?.(data);
                break;
              default:
                handlersRef.current.onGeneralUpdate?.(data);
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
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        if (!isUnmounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    };

    if (role.trim() && actor.trim()) connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [role, actor]);

  return { isConnected };
}
