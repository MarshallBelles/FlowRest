import { FlowRestClient, Transaction, Block, API } from "../lib";
import { Axios } from "axios";

const argParse = (arg: any): Object => {
    switch (typeof arg) {
        case "string":
            // handle string
            return {
                type: "String",
                value: arg,
            };
        case "boolean":
            // handle boolean
            return {
                type: "Bool",
                value: arg,
            };
        case "bigint":
            // handle bigint
            return {
                type: "Int64",
                value: arg.toString(),
            };
        case "number":
            // handle number
            if (Number.isInteger(arg)) {
                return {
                    type: "Int",
                    value: arg.toString(),
                };
            } else {
                return {
                    type: "Fix64",
                    value: arg.toString(),
                };
            }

        default:
            // argument is not supported, convert to string
            return {
                type: "String",
                value: arg.toString(),
            };
    }
};

const scriptBuilder = (script: string): string => Buffer.from(script, "utf-8").toString("base64");

const argBuilder = (args: any[]): string[] => {
    const bufs: Array<Buffer> = [];
    args.forEach((a) => {
        // handle map<any, any>
        if (a instanceof Map) {
            const mapEntries: any[] = [];
            a.forEach((v, k) => {
                mapEntries.push({
                    key: argParse(k),
                    value: argParse(v),
                });
            });
            bufs.push(Buffer.from(JSON.stringify({
                type: "Dictionary",
                value: mapEntries,
            }), "utf-8"));
            // assume its string : string
        } else if (Array.isArray(a)) {
            const arrEntries: any[] = [];
            a.forEach((e) => {
                arrEntries.push(argParse(e));
            });
            bufs.push(Buffer.from(JSON.stringify({
                type: "Array",
                value: arrEntries,
            }), "utf-8"));
            // handle array
        } else {
            bufs.push(Buffer.from(JSON.stringify(argParse(a))));
        }
    });
    return bufs.map(x => x.toString("base64"));
};

describe("FlowRestUnitTesting", () => {
    let client: FlowRestClient;
    let axiosStub: Axios;
    beforeEach(async () => {
        axiosStub = new Axios();

        Object.assign(axiosStub, {
            get: jest.fn((endpoint: string, body?: any) => {
                if (endpoint.includes("accounts")) {
                    return {
                        data: `{
                            "address": "f8d6e0586b0a20c7",
                            "balance": "99999999999700000",
                            "keys": [
                              {
                                "index": "0",
                                "public_key": "0xa6a1f28c43c89e8d04643378c93da88b52bf09c862d30a957ee403f1e7d3a6ab3723427c2bae6d13ec019e9ef892f0130caab47cae0da6b8da68f98be95d47fe",
                                "signing_algorithm": "ECDSA_P256",
                                "hashing_algorithm": "SHA3_256",
                                "sequence_number": "0",
                                "weight": "1000",
                                "revoked": false
                              }
                            ],
                            "contracts": {
                            },
                            "_expandable": {},
                            "_links": {
                              "_self": "/v1/accounts/f8d6e0586b0a20c7"
                            }
                          }`
                    }
                }
                if (endpoint.includes("blocks")) {
                    return {
                        data: `[
                        {
                          "header": {
                            "id": "7048b8707853af04ed412d669731e1a23e372a5386948ff406250e571bb68510",
                            "parent_id": "f3c1ea0f81c50c4db827920c6028a6da3fc086ad2e68e9de97687f5409dea5cd",
                            "height": "59554433",
                            "timestamp": "2022-02-08T00:03:04.132691927Z",
                            "parent_voter_signature": "pdyAoFpBYJufCD4zFHPEEut4HOSTGOPrC1CEWEdoD4aFR1K3+FwIzVymywqHzGNjjPe8LF3uMcanbep7Tjn+9APMT3PoMB3ySN6XcLJqVSfLRl2YXoc5L5PM/e9179tn"
                          },
                          "_expandable": {
                            "payload": "/v1/blocks/7048b8707853af04ed412d669731e1a23e372a5386948ff406250e571bb68510/payload",
                            "execution_result": "/v1/execution_results/42b600689ba2f9563b8ae0fbc97b79c39f43d018e29fd4ad9c1ee2f2bd8d01e2"
                          },
                          "_links": {
                            "_self": "/v1/blocks/7048b8707853af04ed412d669731e1a23e372a5386948ff406250e571bb68510"
                          }
                        }
                      ]`
                    }
                }
                if (endpoint.includes("transactions")) {
                    return {
                        data: `{
                            "id": "921a60c05e8c630fa835a40b389758dc3ca732d4e93587824e62631ee8da6ca6",
                            "script": "CmltcG9ydCBOb25GdW5naWJsZVRva2VuIGZyb20gMHg1MTMyY2FmZDIyYzA0MzcxCmltcG9ydCBUZXN0TkZUIGZyb20gMHg1MTMyY2FmZDIyYzA0MzcxCgp0cmFuc2FjdGlvbihyZWNpcGllbnQ6IEFkZHJlc3MsIHdpdGhkcmF3SUQ6IFVJbnQ2NCkgewogICAgcHJlcGFyZShzaWduZXI6IEF1dGhBY2NvdW50KSB7CiAgICAgICAgbGV0IHJlY2lwaWVudCA9IGdldEFjY291bnQocmVjaXBpZW50KQoKICAgICAgICAvLyBib3Jyb3cgYSByZWZlcmVuY2UgdG8gdGhlIHNpZ25lcidzIE5GVCBjb2xsZWN0aW9uCiAgICAgICAgbGV0IGNvbGxlY3Rpb25SZWYgPSBzaWduZXIKICAgICAgICAgICAgLmJvcnJvdzwmVGVzdE5GVC5Db2xsZWN0aW9uPihmcm9tOiBUZXN0TkZULkNvbGxlY3Rpb25TdG9yYWdlUGF0aCkhCgogICAgICAgIC8vIGJvcnJvdyBhIHB1YmxpYyByZWZlcmVuY2UgdG8gdGhlIHJlY2VpdmVycyBjb2xsZWN0aW9uCiAgICAgICAgbGV0IGRlcG9zaXRSZWYgPSByZWNpcGllbnQKICAgICAgICAgICAgLmdldENhcGFiaWxpdHkoVGVzdE5GVC5Db2xsZWN0aW9uUHVibGljUGF0aCkhCiAgICAgICAgICAgIC5ib3Jyb3c8JntOb25GdW5naWJsZVRva2VuLkNvbGxlY3Rpb25QdWJsaWN9PigpIQoKICAgICAgICAvLyB3aXRoZHJhdyB0aGUgTkZUIGZyb20gdGhlIG93bmVyJ3MgY29sbGVjdGlvbgogICAgICAgIGxldCBuZnQgPC0gY29sbGVjdGlvblJlZi53aXRoZHJhdyh3aXRoZHJhd0lEOiB3aXRoZHJhd0lEKQoKICAgICAgICAvLyBEZXBvc2l0IHRoZSBORlQgaW4gdGhlIHJlY2lwaWVudCdzIGNvbGxlY3Rpb24KICAgICAgICBkZXBvc2l0UmVmLmRlcG9zaXQodG9rZW46IDwtbmZ0KQogICAgfQp9",
                            "arguments": [
                              "eyJ0eXBlIjoiQWRkcmVzcyIsInZhbHVlIjoiMHhlZjdhMTFmNzE3MWVhMTE4In0K",
                              "eyJ0eXBlIjoiVUludDY0IiwidmFsdWUiOiI0MzQxOSJ9Cg=="
                            ],
                            "reference_block_id": "be88f72f3a6317d479cb2911ebcd8af769d4eb8fb21ecc46d381e3ee18ea7d22",
                            "gas_limit": "9999",
                            "payer": "5132cafd22c04371",
                            "proposal_key": {
                              "address": "5132cafd22c04371",
                              "key_index": "2",
                              "sequence_number": "267"
                            },
                            "authorizers": [
                              "5132cafd22c04371"
                            ],
                            "payload_signatures": [
                              {
                                "address": "5132cafd22c04371",
                                "key_index": "2",
                                "signature": "N8IBuzElvM1Lnw5WUr7t3LgyCufJwwm/cA2vxATHP6C1yxn1ivJZTF+CeSMeC2Id9QZsw8CKFQhRBIt3KXLxbw=="
                              }
                            ],
                            "envelope_signatures": [
                              {
                                "address": "5132cafd22c04371",
                                "key_index": "0",
                                "signature": "rSahpqtxmZ0U0Yr9eeTOlfdSDbDrg6mp+ADG7K0qU3DwcNVBaVJzizdW/J0+dNjYlXIrONGncJ68fOyugSHswA=="
                              }
                            ],
                            "_expandable": {
                              "result": "/v1/transaction_results/921a60c05e8c630fa835a40b389758dc3ca732d4e93587824e62631ee8da6ca6"
                            },
                            "_links": {
                              "_self": "/v1/transactions/921a60c05e8c630fa835a40b389758dc3ca732d4e93587824e62631ee8da6ca6"
                            }
                          }`
                    }
                }
                if (endpoint.includes("transaction_results")) {
                    return {
                        data: `{
                            "block_id": "f24b749733451af1a6ec20474f5cb9beef7d6eef9cf7533c55d4af8bb6095447",
                            "status": "Sealed",
                            "error_message": "[Error Code: 1007] invalid proposal key: public key 2 on account 5132cafd22c04371 has sequence number 268, but given 267",
                            "computation_used": "0",
                            "events": [],
                            "_links": {
                              "_self": "/v1/transaction_results/921a60c05e8c630fa835a40b389758dc3ca732d4e93587824e62631ee8da6ca6"
                            }
                          }`
                    }
                }
            }),
            post: jest.fn((endpoint: string, body?: any) => {
                if (endpoint.includes("transactions")) {
                    return {
                        data: `{"status":"TODO"}`
                    }
                }
                if (endpoint.includes("scripts")) {
                    return {
                        data: '"eyJ0eXBlIjoiU3RyaW5nIiwidmFsdWUiOiJhc2RmNTY3ODkifQo="'
                    }
                }
            })
        });

        client = new FlowRestClient(axiosStub);
    });
    it("should getLatestBlock", async () => {
        const block = await client.getLatestBlock();
        expect(block instanceof Error).toBeFalsy;
        expect(axiosStub.get).toBeCalled();
    });
    it("should getBlock", async () => {
        const block = await client.getBlock("934f4c693b18f036ec66e03509f7a81c026d5659e3b74cd6d9bdc5f487beb3ff");
        expect(block instanceof Error).toBeFalsy;
        expect(axiosStub.get).toBeCalled();
    });
    it("should getBlockHeight", async () => {
        const block = await client.getBlockHeight([59536847]);
        expect(block instanceof Error).toBeFalsy;
        expect(axiosStub.get).toBeCalled();
    });
    it("should getBlocksInRange", async () => {
        const block = await client.getBlocksInRange(59536847, 59536867);
        expect(block instanceof Error).toBeFalsy;
        expect(axiosStub.get).toBeCalled();
    });
    it("should getTransaction", async () => {
        const tx = await client.getTransaction("35bb3c9593e13e3e9b8a36b40941064aab14f9f76db0e3176b91b15fbc4a618e");
        expect(tx instanceof Error).toBeFalsy;
        expect(axiosStub.get).toBeCalled();
    });
    it("should getTransactionResult", async () => {
        const tx = await client.getTransactionResult("35bb3c9593e13e3e9b8a36b40941064aab14f9f76db0e3176b91b15fbc4a618e");
        expect(tx instanceof Error).toBeFalsy;
        expect(axiosStub.get).toBeCalled();
    });
    it("should submitTransaction", async () => {
        const script = `
        transaction(str: String, num: Int) {
            prepare(acct: AuthAccount) {
            }
            execute {
                log(str.concat(num.toString()))
            }
        }
        `;
        let latestBlock = <Block>(await client.getLatestBlock());
        const transaction: Transaction = {
            script: scriptBuilder(script),
            arguments: argBuilder(["hello", 12345]),
            reference_block_id: latestBlock.id,
            gas_limit: "9999",
            proposal_key: {
                address: "c05ba92552790bb0",
                key_index: "0",
                sequence_number: "0"
            },
            payer: "c05ba92552790bb0",
            authorizers: ["c05ba92552790bb0"],
            payload_signatures: [],
            envelope_signatures: []
        }
        const txres = await client.submitTransaction(transaction);
        expect(txres instanceof Error).toBeFalsy();
        expect(axiosStub.post).toBeCalledWith("/transactions", JSON.stringify(transaction));
    });
    /* it("should getCollection", async () => {
    }); */
    /* it("should getBlockExecutionResults", async () => {
    }); */
    /* it("should getExecutionResults", async () => {
    }); */
    it("should getAccount", async () => {
        const txres = await client.getAccount("f8d6e0586b0a20c7");
        expect(txres instanceof Error).toBeFalsy();
        expect(axiosStub.get).toBeCalledWith("/accounts/f8d6e0586b0a20c7?expand=contracts,keys");
    });
    it("should executeScript", async () => {
        const script = `
            pub fun main(stg: String, num: Int): String {
                return stg.concat(num.toString())
            }
        `;
        const scres = await client.executeScript({ script: scriptBuilder(script), arguments: argBuilder(["asdf", 56789]) });
        expect(scres instanceof Error).toBeFalsy();
        expect(scres.value).toBe("asdf56789");
    });
    /* it("should getEventsWithinBlockHeight", async () => {
    });
    it("should getEventsAtBlockHeight", async () => {
    }); */
});
