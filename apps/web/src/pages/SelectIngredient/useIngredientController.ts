import { useEffect, useRef, useState } from 'react';
import { fetchControllerRoomStatus } from '../../api/controllerRoomApi';

export function useIngredientController(
  connectedRoomId: string | null,
  maxIndex: number,
  onConfirm: (index: number) => void
) {
  const [cursorIndex, setCursorIndex] = useState(0);
  const cursorIndexRef = useRef(0);
  const lastSequenceRef = useRef<number>(0);
  const onConfirmRef = useRef(onConfirm);

  // keep refs synced
  useEffect(() => {
    cursorIndexRef.current = cursorIndex;
  }, [cursorIndex]);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

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
              setCursorIndex((prev) => Math.max(0, prev - 1));
            } else if (cmd === 'right') {
              setCursorIndex((prev) => Math.min(maxIndex, prev + 1));
            } else if (cmd === 'up') {
              setCursorIndex((prev) => Math.max(0, prev - cols));
            } else if (cmd === 'down') {
              setCursorIndex((prev) => Math.min(maxIndex, prev + cols));
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