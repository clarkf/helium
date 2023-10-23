import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { rest } from "msw";
import fc from "fast-check";

import * as matrix from "../src/matrix";
import { resolveLogin } from "./handlers";

describe("discover", () => {
  const discovery = {
    "m.homeserver": {
      base_url: "https://matrix.example.com",
    },
    "m.identity_server": {
      base_url: "https://identity.example.com",
    },
    "org.example.custom.property": {
      app_url: "https://custom.app.example.org",
    },
  };

  const server = setupServer(
    rest.get("https://example.com/.well-known/matrix/client", (_, res, ctx) =>
      res(ctx.status(200), ctx.json(discovery)),
    ),
    rest.get(
      "https://baddoc.example.com/.well-known/matrix/client",
      (_, res, ctx) => res(ctx.status(200), ctx.json({})),
    ),
    rest.get(
      "https://badurl.example.com/.well-known/matrix/client",
      (_, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            "m.homeserver": { base_url: "This isn't valid!!!" },
          }),
        ),
    ),
    rest.get(
      "https://:status.s.example.com/.well-known/matrix/client",
      (req, res, ctx) => {
        const status = parseInt(req.params["status"] as string, 10);
        return res(ctx.status(status), ctx.xml("<b>Not found!</b>"));
      },
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it("should discover", async () => {
    const actual = await matrix.discover("example.com");
    expect(actual).toStrictEqual(discovery);
  });

  it("should error on 404", async () => {
    await expect(
      matrix.discover("404.s.example.com"),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"The specified server had no auto auto-discovery document (404)."',
    );
  });

  it.each([403, 500])("should error on %s", async (status) => {
    await expect(
      matrix.discover(status + ".s.example.com"),
    ).rejects.toBeTruthy();
  });

  it("should error on invalid discovery document", async () => {
    await expect(
      matrix.discover("baddoc.example.com"),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"The discovery server responded with invalid or incomplete information."',
    );
  });

  it("should error on invalid base_url", async () => {
    await expect(
      matrix.discover("badurl.example.com"),
    ).rejects.toThrowErrorMatchingInlineSnapshot('"Invalid URL"');
  });
});

describe("login", () => {
  const discovery: matrix.DiscoveryInformation = {
    "m.homeserver": {
      base_url: "https://matrix.example.com",
    },
  };

  const server = setupServer(
    rest.post(
      "https://matrix.example.com/_matrix/client/v3/login",
      resolveLogin(
        (user, pass) => user === "valid-user" && pass === "good-password",
      ),
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it("should login", async () => {
    const response = await matrix.login(
      discovery,
      "valid-user",
      "good-password",
    );

    expect(response.access_token).not.toBe("");
  });

  it("should error on invalid credentials", async () => {
    await expect(
      matrix.login(discovery, "user", "password"),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Matrix homeserver responded with an unexpected status code (403)."',
    );
  });
});

describe("sync", () => {
  const discovery: matrix.DiscoveryInformation = {
    "m.homeserver": {
      base_url: "https://matrix.example.com",
    },
  };

  const token: matrix.LoginResponse = {
    access_token: "12345",
  };

  const server = setupServer(
    rest.get(
      "https://matrix.example.com/_matrix/client/v3/sync",
      (_, res, ctx) => res(ctx.status(200), ctx.json({})),
    ),

    rest.get("https://500.example.com/_matrix/client/v3/sync", (_, res, ctx) =>
      res(ctx.status(500), ctx.json({})),
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it("should sync", async () => {
    const response = await matrix.sync(discovery, token);

    expect(response).not.toBe(null);
  });

  it("should error on invalid status code", async () => {
    const thisDiscovery: matrix.DiscoveryInformation = {
      ...discovery,
      "m.homeserver": {
        base_url: "https://500.example.com",
      },
    };

    await expect(matrix.sync(thisDiscovery, token)).rejects.toBeTruthy();
  });
});

describe("getThumbnailUrl", () => {
  const discovery: matrix.DiscoveryInformation = {
    "m.homeserver": {
      base_url: "https://matrix.example.com",
    },
  };

  const token: matrix.LoginResponse = {
    access_token: "12345",
  };

  const connection: matrix.Connection = { discovery, token };

  const slug = fc.stringMatching(/^[a-zA-Z0-9]$/);

  it("should generate proper urls", () =>
    fc.assert(
      fc.property(slug, slug, (serverName, mediaId) => {
        const str = matrix.getThumbnailUrl(connection, serverName, mediaId);
        const url = new URL(str);
        expect(url.pathname).toStrictEqual(
          `/_matrix/media/v3/thumbnail/${encodeURI(serverName)}/${encodeURI(
            mediaId,
          )}`,
        );
      }),
    ));
});

describe("parseMxcUrl", () => {
  // Is there a better way to do this? I have to imagine that
  // shrinking to a regex isn't particularly efficient.
  const arbServerName = fc.stringMatching(/^[^/]$/);

  it.each([
    ["mxc://example.org/SEsfnsuifSDFSSEF", "example.org", "SEsfnsuifSDFSSEF"],
    ["mxc://localhost/wefuiwegh8742w", "localhost", "wefuiwegh8742w"],
  ])("should parse %s", (input, server, mediaId) => {
    const actual = matrix.parseMxcUrl(input);
    expect(actual.serverName).toBe(server);
    expect(actual.mediaId).toBe(mediaId);
  });

  it("should parse any mxc", () =>
    fc.assert(
      // serverName logically can't contain a slash, since that's the
      // delimiter that separates it from the tail
      fc.property(arbServerName, fc.string(), (serverName, mediaId) => {
        const actual = matrix.parseMxcUrl(`mxc://${serverName}/${mediaId}`);
        expect(actual.serverName).toBe(serverName);
        expect(actual.mediaId).toBe(mediaId);
      }),
    ));
});
