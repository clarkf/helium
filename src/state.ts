import type {
  DiscoveryInformation,
  LoginResponse,
  RoomId,
  SyncResponse,
  ClientEvent,
  UserId,
} from "./matrix";

import { create } from "zustand";

export interface AppState {
  connection: null | { token: LoginResponse; discovery: DiscoveryInformation };
  rooms: Record<RoomId, RoomState>;
}

export interface RoomState {
  name?: string;
  members: UserId[];
}

export function reduceSync(
  state: Readonly<AppState>,
  sync: SyncResponse,
): AppState {
  for (const [roomId, def] of Object.entries(sync.rooms.join)) {
    const events: ClientEvent[] = def.state.events.map(
      (e) => ({ ...e, room_id: roomId }) as ClientEvent,
    );
    state = events.reduce((s, e) => reduceEvent(s, e), state);
  }
  return state;
}

function reduceEvent(state: Readonly<AppState>, event: ClientEvent): AppState {
  const roomId = event.room_id;
  const room: RoomState = state.rooms[roomId] ?? { members: [] };

  const newRoom = reduceRoomEvent(room, event);

  return {
    ...state,
    rooms: {
      ...state.rooms,
      [roomId]: newRoom,
    },
  };
}

function reduceRoomEvent(
  state: Readonly<RoomState>,
  event: ClientEvent,
): RoomState {
  switch (event.type) {
    case "m.room.name":
      return {
        ...state,
        name: event.content.name,
      };

    case "m.room.member": {
      const who: UserId = event.state_key;
      switch (event.content.membership) {
        case "join":
          return {
            ...state,
            members: [...state.members, who],
          };
        case "leave":
        case "ban":
          return {
            ...state,
            members: state.members.filter((m) => m != who),
          };
        default:
          return state;
      }
    }

    // Events that can be ignored
    case "m.room.create":
      return state;

    default:
      console.error(`unhandled event`, event);
      return state;
  }
}

export interface AppStore extends AppState {
  handleSync: (sync: SyncResponse) => void;
}

export const useApp = create<AppStore>()((set) => ({
  connection: null,
  rooms: {},
  handleSync: (sync) => set((state) => reduceSync(state, sync)),
}));
