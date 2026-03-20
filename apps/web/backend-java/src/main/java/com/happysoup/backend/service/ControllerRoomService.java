package com.happysoup.backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// [EN] In-memory room state store for controller pairing.
// [JA] コントローラ接続ペアリング用のインメモリ部屋状態ストアです。
@Service
public class ControllerRoomService {

    private final Map<String, RoomState> roomStates = new ConcurrentHashMap<>();
    private static final int MAX_COMMAND_HISTORY = 256;

    public record CommandEvent(long sequence, String command) {
    }

    public record RoomState(boolean connected, long commandSequence, String latestCommand, List<CommandEvent> recentCommands) {
    }

    // [EN] Creates/reset a room as disconnected.
    // [JA] 部屋を未接続状態で作成/初期化します。
    public void registerRoom(String roomId) {
        // Keep existing state to avoid race: iOS join may arrive before web register.
        roomStates.putIfAbsent(roomId, new RoomState(false, 0L, null, List.of()));
    }

    // [EN] Marks room as connected from controller side.
    // [JA] コントローラ側から部屋を接続済みにします。
    public void joinRoom(String roomId) {
        RoomState current = roomStates.getOrDefault(roomId, new RoomState(false, 0L, null, List.of()));
        roomStates.put(roomId, new RoomState(true, current.commandSequence(), current.latestCommand(), current.recentCommands()));
    }

    // [EN] Returns current room connection state.
    // [JA] 現在の部屋接続状態を返します。
    public boolean isRoomConnected(String roomId) {
        return roomStates.getOrDefault(roomId, new RoomState(false, 0L, null, List.of())).connected();
    }

    // [EN] Stores the latest controller command and increments command sequence.
    // [JA] コントローラ入力コマンドを保存し、コマンド連番をインクリメントします。
    public RoomState postCommand(String roomId, String command) {
        RoomState current = roomStates.getOrDefault(roomId, new RoomState(false, 0L, null, List.of()));
        long nextSequence = current.commandSequence() + 1;

        List<CommandEvent> history = new ArrayList<>(current.recentCommands());
        history.add(new CommandEvent(nextSequence, command));
        if (history.size() > MAX_COMMAND_HISTORY) {
            history = new ArrayList<>(history.subList(history.size() - MAX_COMMAND_HISTORY, history.size()));
        }

        RoomState updated = new RoomState(true, nextSequence, command, List.copyOf(history));
        roomStates.put(roomId, updated);
        return updated;
    }

    // [EN] Returns full room state including latest command information.
    // [JA] 最新コマンド情報を含む部屋状態を返します。
    public RoomState getRoomState(String roomId) {
        return roomStates.getOrDefault(roomId, new RoomState(false, 0L, null, List.of()));
    }

    // [EN] Returns commands newer than given sequence (exclusive).
    // [JA] 指定シーケンスより新しいコマンドを返します（排他）。
    public List<CommandEvent> getCommandsSince(String roomId, long sinceSequence) {
        RoomState state = getRoomState(roomId);
        if (state.recentCommands().isEmpty()) {
            return List.of();
        }

        return state.recentCommands().stream()
                .filter(event -> event.sequence() > sinceSequence)
                .toList();
    }
}