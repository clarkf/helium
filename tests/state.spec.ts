import { describe, it, expect } from "vitest";

import { reduceSync, type AppState } from "../src/state";
import { ClientEvent, SyncResponse } from "../src/matrix";

describe("reduceSync", () => {
  const connection = {
    token: {
      access_token: "",
    },
    discovery: {
      "m.homeserver": { base_url: "" },
    },
  };

  function mkSync(events: ClientEvent[]): SyncResponse {
    return events.reduce<SyncResponse>(
      (s: SyncResponse, e: ClientEvent): SyncResponse => ({
        ...s,
        rooms: {
          join: {
            ...s.rooms?.join,
            [e.room_id]: {
              state: {
                events: [
                  ...(s.rooms?.join?.[e.room_id]?.state?.events ?? []),
                  e,
                ],
              },
            },
          },
        },
      }),
      {
        next_batch: "test",
        rooms: { join: {} },
      },
    );
  }

  it("should reduce", () => {
    const initial: AppState = {
      connection,
      rooms: {},
    };

    const after = reduceSync(
      initial,
      mkSync([
        {
          event_id: "1",
          room_id: "!room",
          origin_server_ts: 1,
          type: "m.room.create",
          state_key: "",
          content: {},
        },
        {
          event_id: "2",
          room_id: "!room",
          origin_server_ts: 2,
          state_key: "",
          type: "m.room.name",
          content: {
            name: "Serious Discussions",
          },
        },
      ]),
    );

    expect(Object.keys(after.rooms ?? {})).toContain("!room");
  });

  it("should handle membership changes", () => {
    const initial: AppState = {
      connection,
      rooms: {},
    };

    const rid = "!room";

    const after = reduceSync(
      initial,
      mkSync([
        {
          event_id: "1",
          room_id: rid,
          origin_server_ts: 1,
          type: "m.room.member",
          state_key: "@alice:example.org",
          content: {
            membership: "join",
          },
        },
        {
          event_id: "2",
          room_id: rid,
          origin_server_ts: 1,
          type: "m.room.member",
          state_key: "@bob:example.org",
          content: {
            membership: "join",
          },
        },
        {
          event_id: "3",
          room_id: rid,
          origin_server_ts: 1,
          type: "m.room.member",
          state_key: "@alice:example.org",
          content: {
            membership: "ban",
          },
        },
      ]),
    );

    const room = after.rooms?.[rid];
    if (!room) throw new Error("room missing!!!");
    expect(room.members).toContain("@bob:example.org");
    expect(room.members).not.toContain("@alice:example.org");
  });

  it("should handle canonical aliases", () => {
    const initial: AppState = {
      connection,
      rooms: {},
    };

    const rid = "!room";
    const alias = "#room:example.org";

    const after = reduceSync(
      initial,
      mkSync([
        {
          event_id: "1",
          room_id: rid,
          origin_server_ts: 1,
          type: "m.room.canonical_alias",
          state_key: "@alice:example.org",
          content: {
            alias,
          },
        },
      ]),
    );

    const room = after.rooms?.[rid];
    expect(room?.canonical_alias).toBe(alias);
  });
});
