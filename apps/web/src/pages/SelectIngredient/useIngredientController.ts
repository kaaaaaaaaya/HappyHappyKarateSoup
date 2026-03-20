import { useEffect, useRef, useState } from 'react';
import { fetchControllerRoomStatus } from '../../api/controllerRoomApi';

export function useIngredientController(
  connectedRoomId: string | null,
  maxIndex: number,
  onConfirm: (index: number) => void,
  onTabChange?: (direction: 'left' | 'right') => void
) {
  const [cursorIndex, setCursorIndex] = useState(0);
  const cursorIndexRef = useRef(0);
  const lastSequenceRef = useRef<number>(0);
  const onConfirmRef = useRef(onConfirm);
  const onTabChangeRef = useRef(onTabChange);

  // keep refs synced
  useEffect(() => {
    cursorIndexRef.current = cursorIndex;
  }, [cursorIndex]);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    onTabChangeRef.current = onTabChange;
  }, [onTabChange]);

  useEffect(() => {
    if (!connectedRoomId) return;

    let cancelled = false;
    // 500ms -> 300ms for more responsive d-pad navigation
    const intervalId = window.setInterval(async () => {
      try {
        const status = await fetchControllerRoomStatus(connectedRoomId, {
          since: lastSequenceRef.current,
        });
        if (cancelled) return;

        const currentSequence = status.commandSequence ?? 0;
        const incrementalCommands = status.commands ?? [];

        if (currentSequence > lastSequenceRef.current) {
          lastSequenceRef.current = currentSequence;

          for (const cmdObj of incrementalCommands) {
            const cmd = cmdObj.command.toLowerCase().trim();
            const cols = 5; // Assumed grid columns lengths

            if (cmd === 'left') {
              setCursorIndex((prev) => {
                if (prev === -1 && onTabChangeRef.current) {
                  onTabChangeRef.current('left');
                  return -1;
                }
                return Math.max(0, prev - 1);
              });
            } else if (cmd === 'right') {
              setCursorIndex((prev) => {
                if (prev === -1 && onTabChangeRef.current) {
                  onTabChangeRef.current('right');
                  return -1;
                }
                return Math.min(maxIndex + 1, prev + 1); // allow entering the buttons area
              });
            } else if (cmd === 'up') {
              setCursorIndex((prev) => {
                if (prev === -1) return -1;
                if (prev < cols) {
                  return -1; // Go up to tabs area
                }
                return Math.max(0, prev - cols);
              });
            } else if (cmd === 'down') {
              setCursorIndex((prev) => {
                if (prev === -1) return 0; // Go down to grid
                return Math.min(maxIndex, prev + cols);
              });
            } else if (cmd === 'confirm' || cmd === 'punch' || cmd === 'chop' || cmd.startsWith('aim@')) {
              // Note: aim@ might trigger on Confirm depending on controller setup, but we only use 'confirm'/'punch'/'chop'.
              if (cmd === 'confirm' || cmd === 'punch' || cmd === 'chop') {
                onConfirmRef.current(cursorIndexRef.current);
              }
            }
          }
        }
      } catch (e) {
        console.error('Controller poll error:', e);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [connectedRoomId, maxIndex]);

  return { cursorIndex, setCursorIndex };
}