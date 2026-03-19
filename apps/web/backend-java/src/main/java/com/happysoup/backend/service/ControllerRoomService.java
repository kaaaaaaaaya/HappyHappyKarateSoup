package com.happysoup.backend.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// [EN] In-memory room state store for controller pairing.
// [JA] コントローラ接続ペアリング用のインメモリ部屋状態ストアです。
@Service
public class ControllerRoomService {

    private final Map<String, RoomState> roomStates = new ConcurrentHashMap<>();

    public record RoomState(boolean connected, long commandSequence, String latestCommand) {
    }

    // [EN] Creates/reset a room as disconnected.
    // [JA] 部屋を未接続状態で作成/初期化します。
    public void registerRoom(String roomId) {
        // Keep existing state to avoid race: iOS join may arrive before web register.
        roomStates.putIfAbsent(roomId, new RoomState(false, 0L, null));
    }

    // [EN] Marks room as connected from controller side.
    // [JA] コントローラ側から部屋を接続済みにします。
    public void joinRoom(String roomId) {
        RoomState current = roomStates.getOrDefault(roomId, new RoomState(false, 0L, null));
        roomStates.put(roomId, new RoomState(true, current.commandSequence(), current.latestCommand()));
    }

    // [EN] Returns current room connection state.
    // [JA] 現在の部屋接続状態を返します。
    public boolean isRoomConnected(String roomId) {
        return roomStates.getOrDefault(roomId, new RoomState(false, 0L, null)).connected();
    }

    // [EN] Stores the latest controller command and increments command sequence.
    // [JA] コントローラ入力コマンドを保存し、コマンド連番をインクリメントします。
    public RoomState postCommand(String roomId, String command) {
        RoomState current = roomStates.getOrDefault(roomId, new RoomState(false, 0L, null));
        RoomState updated = new RoomState(true, current.commandSequence() + 1, command);
        roomStates.put(roomId, updated);
        return updated;
    }

    // [EN] Returns full room state including latest command information.
    // [JA] 最新コマンド情報を含む部屋状態を返します。
    public RoomState getRoomState(String roomId) {
        return roomStates.getOrDefault(roomId, new RoomState(false, 0L, null));
    }
}