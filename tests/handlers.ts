import type { ResponseResolver, RestRequest, RestContext } from "msw";
import type { DiscoveryInformation, SyncResponse } from "../src/matrix";

import { randomBytes } from "node:crypto";

type Resolver = ResponseResolver<RestRequest, RestContext>;

export const resolveDoc = <T>(doc: T): Resolver => {
  return (_, res, ctx) => res(ctx.status(200), ctx.json<T>(doc));
};

export const resolveDiscovery = (homeserver: string): Resolver =>
  resolveDoc<DiscoveryInformation>({
    "m.homeserver": {
      base_url: homeserver,
    },
  });

export const resolveEmptySync = resolveDoc<SyncResponse>({
  next_batch: "unknown",
});

function defaultGenToken(): string {
  return randomBytes(20).toString("hex");
}

type LoginPred = (userId: string, password: string) => boolean;
export const resolveLogin =
  (pred: LoginPred, genToken?: () => string): Resolver =>
  async (req, res, ctx) => {
    const request = await req.json();

    if (
      request?.type !== "m.login.password" ||
      request?.identifier?.type !== "m.id.user"
    ) {
      return res(ctx.status(403), ctx.json({}));
    }

    const userId = request.identifier.user as string;
    const password = request.password as string;
    if (!pred(userId, password)) {
      return res(ctx.status(403), ctx.json({}));
    }

    const token = (genToken ?? defaultGenToken)();

    return res(
      ctx.status(200),
      ctx.json({
        access_token: token,
      }),
    );
  };
