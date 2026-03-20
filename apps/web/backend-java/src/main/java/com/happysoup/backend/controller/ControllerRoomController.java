package com.happysoup.backend.controller;

import com.happysoup.backend.service.ControllerRoomService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// [EN] Endpoints for web-controller pairing state.
// [JA] Web とコントローラのペアリング状態を扱うエンドポイントです。
@RestController
@RequestMapping("/api/controller/rooms")
public class ControllerRoomController {

    private final ControllerRoomService controllerRoomService;

    public ControllerRoomController(ControllerRoomService controllerRoomService) {
        this.controllerRoomService = controllerRoomService;
    }

    // [EN] Web side registers room before showing QR.
    // [JA] Web 側が QR 表示前に部屋を登録します。
    @PostMapping("/{roomId}/register")
    public Map<String, Object> registerRoom(@PathVariable String roomId) {
        controllerRoomService.registerRoom(roomId);
        var roomState = controllerRoomService.getRoomState(roomId);
        return Map.of(
                "roomId", roomId,
                "connected", roomState.connected(),
                "commandSequence", roomState.commandSequence(),
                "latestCommand", roomState.latestCommand() == null ? "" : roomState.latestCommand()
        );
    }

    // [EN] iOS side notifies that controller joined this room.
    // [JA] iOS 側がこの部屋に接続したことを通知します。
    @PostMapping("/{roomId}/join")
    public Map<String, Object> joinRoom(@PathVariable String roomId) {
        controllerRoomService.joinRoom(roomId);
        var roomState = controllerRoomService.getRoomState(roomId);
        return Map.of(
                "roomId", roomId,
                "connected", roomState.connected(),
                "commandSequence", roomState.commandSequence(),
                "latestCommand", roomState.latestCommand() == null ? "" : roomState.latestCommand()
        );
    }

    // [EN] iOS controller posts directional/confirm commands.
    // [JA] iOS コントローラから方向キー/決定コマンドを送信します。
    @PostMapping("/{roomId}/commands/{command}")
    public Map<String, Object> postCommand(@PathVariable String roomId, @PathVariable String command) {
        var roomState = controllerRoomService.postCommand(roomId, command);
        return Map.of(
                "roomId", roomId,
                "connected", roomState.connected(),
                "commandSequence", roomState.commandSequence(),
                "latestCommand", roomState.latestCommand() == null ? "" : roomState.latestCommand()
        );
    }

    // [EN] Web side polls room connection state.
    // [JA] Web 側が部屋の接続状態をポーリング取得します。
    @GetMapping("/{roomId}/status")
        public Map<String, Object> getRoomStatus(
            @PathVariable String roomId,
            @RequestParam(name = "since", required = false) Long since
        ) {
        var roomState = controllerRoomService.getRoomState(roomId);
        var commands = since == null
            ? java.util.List.<Map<String, Object>>of()
            : controllerRoomService.getCommandsSince(roomId, since).stream()
            .map(event -> Map.<String, Object>of(
                "sequence", event.sequence(),
                "command", event.command()
            ))
            .toList();

        return Map.of(
                "roomId", roomId,
                "connected", roomState.connected(),
                "commandSequence", roomState.commandSequence(),
            "latestCommand", roomState.latestCommand() == null ? "" : roomState.latestCommand(),
            "commands", commands
        );
    }
}