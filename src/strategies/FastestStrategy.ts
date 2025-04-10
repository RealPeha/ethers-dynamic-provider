import { FetchRequest, JsonRpcPayload, JsonRpcResult } from "ethers";
import { Strategy } from "./Strategy";
import { isCancelled } from "../utils";

export class FastestStrategy extends Strategy {
  async send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]> {
    const requests: FetchRequest[] = [];
    const freeRpcs = this.provider.onlyFreeRpcs(rpcs);

    const { request, result } = await Promise.any(
      freeRpcs.map(async (rpc) => {
        try {
          const request = this.provider.createRequest(payload, rpc);
          requests.push(request);

          const response = await request.send();
          response.assertOk();

          const result = response.bodyJson;

          return {
            request,
            result: Array.isArray(result) ? result : [result],
          };
        } catch (err: any) {
          if (!isCancelled(err)) {
            this.provider.jail(rpc, err);
          }

          return Promise.reject(err);
        }
      })
    );

    // Cancel all other requests
    requests.forEach((req) => {
      if (req !== request) {
        try {
          req.cancel();
        } catch {}
      }
    });

    return result;
  }
}
