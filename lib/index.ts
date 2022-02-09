import { Axios } from 'axios';

const localhost_endpoint = 'http://localhost:8888/v1';
const testnet_endpoint = 'https://rest-testnet.onflow.org/v1';
const mainnet_endpoint = 'https://rest-mainnet.onflow.org/v1';

export interface Script {
    script: string;
    arguments: Array<string>;
}
export interface Account {
    address: string;
    balance: string;
    keys: Array<{
        index: string;
        public_key: string;
        signing_algorithm: string;
        hashing_algorithm: string;
        sequence_number: string;
        weight: string;
        revoked: boolean;
    }>;
    contracts: any;
}
export interface Transaction {
    script: string;
    arguments: Array<string>;
    reference_block_id: string;
    gas_limit: string;
    proposal_key: {
        address: string;
        key_index: string;
        sequence_number: string;
    };
    payer: string;
    authorizers: Array<string>;
    payload_signatures: Array<TransactionSignature>;
    envelope_signatures: Array<TransactionSignature>;
}
export interface TransactionResult {
    block_id: string;
    status: string;
    error_message: string;
    computation_used: string;
    events: Array<Event>;
}

export interface Event {
    type: string;
    transaction_id: string;
    transaction_index: string;
    event_index: string;
    payload: string;
}

export interface TransactionSignature {
    address: string;
    key_id: string;
    signature: string;
}

export enum TransactionStatus {
    UNKNOWN,
    PENDING,
    FINALIZED,
    EXECUTED,
    SEALED,
    EXPIRED,
}

export enum API {
    LOCALHOST,
    TESTNET,
    MAINNET,
}

export interface Block {
    id: string;
    parent_id: string;
    parent_voter_signature: string;
    height: string;
    timestamp: string;
    collection_guarantees: Array<{
        collection_id: string;
        signatures: Array<string>;
        signer_ids: Array<string>;
    }>;
    block_seals: Array<{
        block_id: string;
        execution_receipt_id: string;
        execution_receipt_signatures: Array<Buffer>;
        result_approval_signatures: Array<Buffer>;
    }>;
    execution_result: {
        id: string;
        block_id: string;
        events: [];
    }
}

export class FlowRestClient {
    private axios: Axios;
    constructor(api_endpoint: API | string | Axios) {
        if (api_endpoint instanceof Axios) {
            this.axios = api_endpoint;
        } else if (typeof (api_endpoint) === 'string') {
            this.axios = new Axios({ baseURL: api_endpoint });
        } else {
            switch (api_endpoint) {

                case API.TESTNET:
                    this.axios = new Axios({ baseURL: testnet_endpoint });
                    break;

                case API.MAINNET:
                    this.axios = new Axios({ baseURL: mainnet_endpoint });
                    break;

                default:
                    this.axios = new Axios({ baseURL: localhost_endpoint });
                    break;
            }
        }
    }
    public async getLatestBlock(): Promise<Block[] | Error> {
        return JSON.parse((await this.axios.get(`/blocks?height=final&expand=payload,execution_result`)).data);
    }
    public async getBlock(blockId: string | Buffer): Promise<Block[] | Error> {
        const block = JSON.parse((await this.axios.get(`/blocks/${blockId instanceof Buffer ? blockId.toString('hex') : blockId}?expand=payload,execution_result`)).data);
        if (block instanceof Error) return block;
        if (block.code) return Error(JSON.stringify(block, null, 2));
        return block;
    }
    public async getBlockHeight(heightIds: Array<number>): Promise<Block[] | Error> {
        const block = JSON.parse((await this.axios.get(`/blocks?height=${heightIds.join(',')}&expand=payload,execution_result`)).data);
        if (block instanceof Error) return block;
        if (block.code) return Error(JSON.stringify(block, null, 2));
        return block;
    }

    public async getBlocksInRange(startHeight: number, endHeight: number): Promise<Block[] | Error> {
        const block = JSON.parse((await this.axios.get(`/blocks?start_height=${startHeight}&end_height=${endHeight}&expand=payload,execution_result`)).data);
        if (block instanceof Error) return block;
        if (block.code) return Error(JSON.stringify(block, null, 2));
        return block;
    }
    public async getTransaction(transactionId: string | Buffer): Promise<Transaction | Error> {
        const tx = JSON.parse((await this.axios.get(`/transactions/${transactionId instanceof Buffer ? transactionId.toString('hex') : transactionId}`)).data);
        if (tx instanceof Error) return tx;
        return {
            id: tx.id,
            script: tx.script,
            arguments: tx.arguments,
            reference_block_id: tx.reference_block_id,
            gas_limit: tx.gas_limit,
            payer: tx.payer,
            proposal_key: tx.proposal_key,
            authorizers: tx.authorizers,
            payload_signatures: tx.payload_signatures,
            envelope_signatures: tx.envelope_signatures
        } as Transaction;
    }
    public async getTransactionResult(transactionId: string | Buffer): Promise<TransactionResult | Error> {
        const txr = JSON.parse((await this.axios.get(`/transaction_results/${transactionId instanceof Buffer ? transactionId.toString('hex') : transactionId}`)).data);
        if (txr instanceof Error) return txr;
        return {
            block_id: txr.block_id,
            status: txr.status,
            error_message: txr.error_message,
            computation_used: txr.computation_used,
            events: txr.events
        }
    }
    public async submitTransaction(transaction: Transaction): Promise<any> {
        return JSON.parse((await this.axios.post(`/transactions`, JSON.stringify(transaction))).data);
    }
    public async getAccount(address: string | Buffer): Promise<Account | Error> {
        const acct = JSON.parse((await this.axios.get(`/accounts/${address instanceof Buffer ? address.toString('hex') : address}?expand=contracts,keys`)).data);
        if (acct instanceof Error) return acct;
        if (acct.code) return Error(JSON.stringify(acct, null, 2));
        return {
            address: acct.address,
            balance: acct.balance,
            keys: acct.keys,
            contracts: acct.contracts,
        }
    }
    public async executeScript(script: Script): Promise<any> {
        return JSON.parse(Buffer.from((await this.axios.post(`/scripts`, JSON.stringify(script),)).data, 'base64').toString());
    }
    public async getEventsWithinBlockHeight(type: string, startHeight: number, endHeight: number): Promise<Event | Error> {
        const event = JSON.parse((await this.axios.get(`/events?type=${type}&start_height=${startHeight}&end_height=${endHeight}`)).data);
        if (event instanceof Error) return event;
        if (event.code) return Error(JSON.stringify(event, null, 2));
        return event.map((x: any) => { return x.events }).flat();
    }
    public async getEvents(type: string, blockIds: Array<string>): Promise<Event | Error> {
        const event = JSON.parse((await this.axios.get(`/events?type=${type}&block_ids=${blockIds.join(',')}`)).data);
        if (event instanceof Error) return event;
        if (event.code) return Error(JSON.stringify(event, null, 2));
        return event.map((x: any) => { return x.events }).flat();
    }
}