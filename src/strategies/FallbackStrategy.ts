import { JsonRpcPayload, JsonRpcResult } from "ethers";
import { Strategy } from "./Strategy";
import { NoAvailableRPCError } from "../utils";

export class FallbackStrategy extends Strategy {
  async send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]> {
    const errors: any[] = [];
    let index = 0;

    while (true) {
      const rpc = rpcs[index];

      if (!rpc) {
        throw errors.length
          ? new AggregateError(errors)
          : new NoAvailableRPCError();
      }

      // skip jailed rpcs
      if (this.provider.isJailed(rpc)) {
        index += 1;
        continue;
      }

      try {
        const result = await this.provider.sendRequest(payload, rpc);

        return result;
      } catch (err) {
        errors.push(err);
        this.provider.jail(rpc, err);
        index += 1;
      }
    }
  }
}
