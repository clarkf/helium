import type {
  Connection,
  RoomId,
  SyncResponse,
  ClientEvent,
  UserId,
} from "./matrix";

import { create } from "zustand";

export interface AppState {
  connection: null | Connection;
  rooms: null | Record<RoomId, RoomState>;
}

export interface RoomState {
  name?: string;
  canonical_alias?: string;

  /** Will likely be an mxc:// url */
  avatar?: string;

  members: UserId[];
}

export function reduceSync(
  state: Readonly<AppState>,
  sync: SyncResponse,
): AppState {
  const join = Object.entries(sync.rooms?.join ?? {});
  for (const [roomId, def] of join) {
    const events: ClientEvent[] = (def.state?.events ?? []).map(
      (e) => ({ ...e, room_id: roomId }) as ClientEvent,
    );
    state = events.reduce((s, e) => reduceEvent(s, e), state);
  }
  return state;
}

function reduceEvent(state: Readonly<AppState>, event: ClientEvent): AppState {
  const roomId = event.room_id;
  const room: RoomState = state.rooms?.[roomId] ?? { members: [] };

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

    case "m.room.canonical_alias": {
      return {
        ...state,
        canonical_alias: event.content.alias ?? undefined,
      };
    }

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

    case "m.room.avatar": {
      return {
        ...state,
        avatar: event.content.url,
      };
    }

    // Events that can be ignored
    case "m.room.create":
    case "m.room.join_rules":
    case "m.room.power_levels":
    case "m.room.server_acl":
    case "m.room.guest_access":
    case "m.room.history_visibility":
      return state;

    default:
      console.error(`unhandled event`, event);
      return state;
  }
}

export interface AppStore extends AppState {
  setConnection: (connection: Connection) => void;
  handleSync: (sync: SyncResponse) => void;
}

export const useApp = create<AppStore>()((set) => ({
  connection: null,
  rooms: null,
  setConnection: (connection) => set({ connection, rooms: null }),
  handleSync: (sync) => set((state) => reduceSync(state, sync)),
}));
