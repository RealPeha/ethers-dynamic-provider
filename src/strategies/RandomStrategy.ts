import { JsonRpcPayload, JsonRpcResult } from "ethers";
import { Strategy } from "./Strategy";
import { NoAvailableRPCError } from "../utils";

export class RandomStrategy extends Strategy {
  async send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]> {
    const errors: any[] = [];
    const usedRpc = new Set<string>();

    while (true) {
      const freeRpcs = this.provider.onlyFreeRpcs(rpcs);
      const availableRpcs = freeRpcs.filter((rpc) => !usedRpc.has(rpc));

      if (!availableRpcs.length) {
        throw errors.length
          ? new AggregateError(errors)
          : new NoAvailableRPCError();
      }

      const rpc =
        availableRpcs[Math.floor(Math.random() * availableRpcs.length)];

      try {
        const result = await this.provider.sendRequest(payload, rpc);

        return result;
      } catch (err) {
        errors.push(err);
        this.provider.jail(rpc, err);
        usedRpc.add(rpc);
      }
    }
  }
}
