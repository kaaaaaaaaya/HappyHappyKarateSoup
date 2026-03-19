package com.happysoup.backend.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// [EN] In-memory room state store for controller pairing.
// [JA] コントローラ接続ペアリング用のインメモリ部屋状態ストアです。
@Service
public class ControllerRoomService {

    private final Map<String, Boolean> roomConnectionStates = new ConcurrentHashMap<>();

    // [EN] Creates/reset a room as disconnected.
    // [JA] 部屋を未接続状態で作成/初期化します。
    public void registerRoom(String roomId) {
        roomConnectionStates.put(roomId, false);
    }

    // [EN] Marks room as connected from controller side.
    // [JA] コントローラ側から部屋を接続済みにします。
    public void joinRoom(String roomId) {
        roomConnectionStates.put(roomId, true);
    }

    // [EN] Returns current room connection state.
    // [JA] 現在の部屋接続状態を返します。
    public boolean isRoomConnected(String roomId) {
        return roomConnectionStates.getOrDefault(roomId, false);
    }
}