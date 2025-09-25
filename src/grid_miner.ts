import Decimal from 'decimal.js';
import BN from 'bn.js'
import * as fs from 'fs';
import * as util from 'util';
import * as sqlite3 from 'sqlite3';
import * as readline from "readline";

import { CoinBalance, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import { CoinAssist, ClmmPoolUtil, TickMath, TickUtil,CoinAmounts , Percentage, adjustForSlippage ,MathUtil} from '@cetusprotocol/common-sdk';
import { d } from '@cetusprotocol/common-sdk';
import { CetusClmmSDK, Pool, Position, AddLiquidityFixTokenParams, AddLiquidityParams,
    FetchPosRewardParams, FetchPosFeeParams, CollectFeesQuote, PosRewarderResult} from '@cetusprotocol/sui-clmm-sdk';
import { AggregatorClient, RouterData } from "@cetusprotocol/aggregator-sdk";


import { NumberLiteralType } from 'typescript';




const cetusClmmSDK = CetusClmmSDK.createSDK({});

const client = new AggregatorClient();












// Coin Type


enum CoinTypeEnum {  
    USDC = 0,
    SUI,
    CETUS,
    DEEP,
    COIN_TYPE_MAX
}

const COIN_TYPE_ADDRESS_SUI = '0x2::sui::SUI';
const COIN_TYPE_ADDRESS_USDC = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const COIN_TYPE_ADDRESS_DEEP = '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP';
const COIN_TYPE_ADDRESS_CETUS = '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS';


function getCoinTypeEnum(coinType: string): CoinTypeEnum {
    if (coinType === COIN_TYPE_ADDRESS_USDC || coinType.endsWith('dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC')) {
        return CoinTypeEnum.USDC;
    } else if (coinType === COIN_TYPE_ADDRESS_SUI || coinType.endsWith('2::sui::SUI')) {
        return CoinTypeEnum.SUI;
    } else if (coinType === COIN_TYPE_ADDRESS_CETUS || coinType.endsWith('6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS')) {
        return CoinTypeEnum.CETUS;
    } else if (coinType === COIN_TYPE_ADDRESS_DEEP || coinType.endsWith('deeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP')) {
        return CoinTypeEnum.DEEP;
    }
    return CoinTypeEnum.COIN_TYPE_MAX;
}

function getCoinTypeAddress(coinType: CoinTypeEnum): string {
    let coin_address = '';
    switch(coinType) {
        case CoinTypeEnum.USDC:
            coin_address = COIN_TYPE_ADDRESS_USDC;
            break;
        case CoinTypeEnum.SUI:
            coin_address = COIN_TYPE_ADDRESS_SUI;
            break;
        case CoinTypeEnum.CETUS:
            coin_address = COIN_TYPE_ADDRESS_CETUS;
            break;
        case CoinTypeEnum.DEEP:
            coin_address = COIN_TYPE_ADDRESS_DEEP;
            break;
        default:
            break;            
    }
    return coin_address;
}


const COIN_A_TYPE = CoinTypeEnum.USDC;
const COIN_A_DECIMALS = 6;
const COIN_A_NAME = 'USDC';

const COIN_B_TYPE = CoinTypeEnum.SUI;
const COIN_B_DECIMALS = 9;
const COIN_B_NAME = 'SUI';
















// Pool 

const POOL_ADDRESS_USDC_SUI_0_05 = '0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab';
const POOL_ADDRESS_USDC_SUI_0_25 = '0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105';
const POOL_ADDRESS_USDC_CETUS_0_25 = '0x3b13ac70030d587624e407bbe791160b459c48f1049e04269eb8ee731f5442b4';

const POOL_TICK_SPACING_USDC_SUI_0_05: number = 10;
const POOL_TICK_SPACING_USDC_SUI_0_25: number = 60;





const POOL_ADDRESS = POOL_ADDRESS_USDC_SUI_0_05;
const POOL_ADDRESS_FOR_FEE = POOL_ADDRESS_USDC_CETUS_0_25;

const POOL_TICK_SPACING = POOL_TICK_SPACING_USDC_SUI_0_05;
const POOL_TICK_SPACING_TIMES: number = 3;
const POSITION_TICK_RANGE: number = POOL_TICK_SPACING * POOL_TICK_SPACING_TIMES;
















// HD WAllet
const ACCOUNT_ADDRESS = '';

const MNEMONICS = '';  // your mnemonics
// Account 1, Account 2 .... of your wallet
const HD_WALLET_PATH = 'm\/44\'\/784\'\/0\'\/0\'\/0\'';
// const path = 'm\/44\'\/784\'\/1\'\/0\'\/0\''
// const path = 'm\/44\'\/784\'\/2\'\/0\'\/0\''





















// Log and database


const date = new Date();
const LOG_FILE_NAME = 'log_file_name_' + date.toISOString() + '.log';

function dumpSDKRet2Logfile(title: string, context: string) {
    date.setTime(Date.now())
    fs.appendFileSync(LOG_FILE_NAME, util.format('\n[%s] ===== %s =====\n', date.toLocaleString(), title));
    fs.appendFileSync(LOG_FILE_NAME, util.format(context));
    fs.appendFileSync(LOG_FILE_NAME, util.format('\n[%s] ===== %s End =====\n', date.toLocaleString(), title));
}


const SQLITE_DB_FILE_NAME = 'GridInfo.db';
const GRID_MINER_CONFIG_FILE_NAME = 'grid_miner_config.json';

function formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");

    return `${yyyy}${mm}${dd}_${hh}${mi}${ss}.${ms}`;
}









// Params for swap or add liquidity

const SUI_RESERVED = new BN('1').mul(new BN('1000000000')); // 1 sui
const USDC_RESERVED = new BN('1').mul(new BN('1000000')); // 1 usdc

const SLIPPAGE_AGGREGATOR_SWAP = 0.05
const SLIPPAGE_FOR_ADD_LIQUIDITY = 0.05


let COIN_B_AMOUNT_EACH_GRID: BN = new BN(13 * 1000000000); // 15 sui upper bounder

let GRID_AMOUNT_MAX: number = 9;


























// Fee and Reward

type FeeAndReward = {
    fee_owned_a: BN;
    fee_owned_b: BN;
    rwd_owned_cetus: BN;
    rwd_owned_sui: BN;
};


function newFeeAndReward(): FeeAndReward {
    let ret: FeeAndReward = {
        fee_owned_a: new BN(0),
        fee_owned_b: new BN(0),
        rwd_owned_cetus: new BN(0),
        rwd_owned_sui: new BN(0)
    };
    return ret;
}

function cloneFeeAndReward(ori: FeeAndReward): FeeAndReward {
    let ret: FeeAndReward = {
        fee_owned_a: ori.fee_owned_a.clone(),
        fee_owned_b: ori.fee_owned_b.clone(),
        rwd_owned_cetus: ori.rwd_owned_cetus.clone(),
        rwd_owned_sui: ori.rwd_owned_sui.clone()
    };
    return ret;
}

function addFeeAndReward(ori1: FeeAndReward, ori2: FeeAndReward): FeeAndReward {
    let ret: FeeAndReward = {
        fee_owned_a: ori1.fee_owned_a.add(ori2.fee_owned_a),
        fee_owned_b: ori1.fee_owned_b.add(ori2.fee_owned_b),
        rwd_owned_sui: ori1.rwd_owned_sui.add(ori2.rwd_owned_sui),
        rwd_owned_cetus: ori1.rwd_owned_cetus.add(ori2.rwd_owned_cetus)
    };
    return ret;
}


async function getFeeAndReward(pool: Pool, pos_id: string): Promise<FeeAndReward> {
    let ret : FeeAndReward = {
        fee_owned_a: new BN(0),
        fee_owned_b: new BN(0),
        rwd_owned_cetus: new BN(0),
        rwd_owned_sui: new BN(0)
    };

    const posRewardParamsList: FetchPosRewardParams[] = [];
    const posFeeParamsList: FetchPosFeeParams[] = [];

    posRewardParamsList.push({
        pool_id: pool.id,
        position_id: pos_id,
        rewarder_types: pool.rewarder_infos.map((rewarder) => rewarder.coin_type),
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b,
    });

    posFeeParamsList.push({
        pool_id: pool.id,
        position_id: pos_id,
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b,
    });
    const collectFeesQuote: CollectFeesQuote[] = await cetusClmmSDK.Rewarder.fetchPosFeeAmount(posFeeParamsList);
    const posRewarderResult: PosRewarderResult[] = await cetusClmmSDK.Rewarder.fetchPosRewardersAmount(posRewardParamsList);   

    ret.fee_owned_a = new BN(collectFeesQuote[0].fee_owned_a);
    ret.fee_owned_b = new BN(collectFeesQuote[0].fee_owned_b);

    for (const rwd of posRewarderResult[0].rewarder_amounts) {
        if (getCoinTypeEnum(rwd.coin_type) === CoinTypeEnum.CETUS) {
            ret.rwd_owned_cetus.iadd(new BN(rwd.amount_owned));
        } else if (getCoinTypeEnum(rwd.coin_type) === CoinTypeEnum.SUI) {
            ret.rwd_owned_sui.iadd(new BN(rwd.amount_owned));
        }
    }

    return ret;
}






type FeeAndRewardValue = {
    fee_usdc_value: Decimal;
    fee_sui_value: Decimal;
    rwd_sui_value: Decimal;
    rwd_cetus_value: Decimal;
    total_value: Decimal;
};

function newFeeAndRewardValue(): FeeAndRewardValue{
    let ret: FeeAndRewardValue = {
        fee_usdc_value: d(0),
        fee_sui_value: d(0),
        rwd_sui_value: d(0),
        rwd_cetus_value: d(0),
        total_value: d(0)
    };
    return ret;
}

function addFeeAndRewardValue(ori1: FeeAndRewardValue, ori2: FeeAndRewardValue): FeeAndRewardValue{
    let ret: FeeAndRewardValue = {
        fee_usdc_value: ori1.fee_usdc_value.add(ori2.fee_usdc_value),
        fee_sui_value: ori1.fee_sui_value.add(ori2.fee_sui_value),
        rwd_sui_value: ori1.rwd_sui_value.add(ori2.rwd_sui_value),
        rwd_cetus_value: ori1.rwd_cetus_value.add(ori2.rwd_cetus_value),
        total_value: ori1.total_value.add(ori2.total_value)
    };
    return ret;
}


function getFeeAndRewardValue(sui_price: Decimal, cetus_price: Decimal, fee_and_reward: FeeAndReward): FeeAndRewardValue {
    let ret = newFeeAndRewardValue();
    ret.fee_usdc_value = Decimal(fee_and_reward.fee_owned_a.toString()).mul(Decimal.pow(10, -6));
    ret.fee_sui_value = Decimal(fee_and_reward.fee_owned_b.toString()).mul(Decimal.pow(10, -9)).mul(sui_price);
    ret.rwd_sui_value = Decimal(fee_and_reward.rwd_owned_sui.toString()).mul(Decimal.pow(10, -9)).mul(sui_price);
    ret.rwd_cetus_value = Decimal(fee_and_reward.rwd_owned_cetus.toString()).mul(Decimal.pow(10, -9)).mul(cetus_price);
    ret.total_value = ret.fee_usdc_value.add(ret.fee_sui_value).add(ret.rwd_sui_value).add(ret.rwd_cetus_value);
    return ret;
}
























// Transactions Info

type LiquidityEvent = {
    after_liquidity: BN;
    amount_a: BN;
    amount_b: BN;
    liquidity: BN;
    pool: string;
    position: string
};


function newLiquidityEvent(): LiquidityEvent  {
    let ret: LiquidityEvent = {
        after_liquidity: new BN(0),
        amount_a: new BN(0),
        amount_b: new BN(0),
        liquidity: new BN(0),
        pool: '',
        position: ''
    };
    return ret;
}


type BalanceChange = {
    usdc_change: BN;
    sui_change: BN;
    cetus_change: BN;
};

function newBalanceChange(): BalanceChange {
    let ret: BalanceChange = {
        usdc_change: new BN(0),
        sui_change: new BN(0),
        cetus_change: new BN(0)
    };
    return ret;
}


export type TransactionInfo = {
    unix_timestamp_ms: number;
    type: string;  // 'merge_coin_usdc','merge_coin_sui','aggregator_swap', 'add_liquidity', 'close_position', 'merge_coin_cetus','cetus_aggregator_swap', 
    digest: string;
    total_gas_fee: BN;
    balance_change: BalanceChange;
    liquidity_event: LiquidityEvent;
    fee_and_reward: FeeAndReward;
}

export function newTransactionInfo():TransactionInfo  {
    let ret: TransactionInfo = {
        unix_timestamp_ms: 0,
        type: '',
        digest: '',
        total_gas_fee: new BN(0),
        balance_change: newBalanceChange(),
        liquidity_event: newLiquidityEvent(),
        fee_and_reward: newFeeAndReward()
    };
    return ret;
}

function cloneTransactionInfo(ori: TransactionInfo): TransactionInfo {
    let ret = {...ori};
    ret.total_gas_fee = ori.total_gas_fee.clone();
    ret.balance_change.usdc_change = ori.balance_change.usdc_change.clone();
    ret.balance_change.sui_change = ori.balance_change.sui_change.clone();
    ret.balance_change.cetus_change = ori.balance_change.cetus_change.clone();
    ret.fee_and_reward = cloneFeeAndReward(ori.fee_and_reward);
    ret.liquidity_event.after_liquidity = ori.liquidity_event.after_liquidity.clone();
    ret.liquidity_event.amount_a = ori.liquidity_event.amount_a.clone();
    ret.liquidity_event.amount_b = ori.liquidity_event.amount_b.clone();
    ret.liquidity_event.liquidity = ori.liquidity_event.liquidity.clone();
    ret.liquidity_event.pool = ori.liquidity_event.pool;
    ret.liquidity_event.position = ori.liquidity_event.position;
    return ret;
}

type TransactionInfoQueryOptions = {
    get_fee_and_rwd: boolean;
    get_balance_change: boolean;
    get_add_liquidity_event: boolean;
    get_remove_liquidity_event: boolean;
    get_total_gas_fee: boolean;
};





function getFeeAndRewardCollectEvent(rst: SuiTransactionBlockResponse): FeeAndReward {
    let ret = newFeeAndReward();
    if (rst.events?.length) {
        for (const event of rst.events) {            
            if (event.type.endsWith('::pool::CollectRewardV2Event')) {
                // rwd: one coin one event
                const json = event.parsedJson as {
                    amount: string;
                    rewarder_type: {
                        name: string;
                    };
                };
                switch(getCoinTypeEnum(json.rewarder_type.name)) {
                    case CoinTypeEnum.SUI:
                        ret.rwd_owned_sui.iadd(new BN(json.amount));
                        break;
                    case CoinTypeEnum.CETUS:
                        ret.rwd_owned_cetus.iadd(new BN(json.amount));
                        break;
                    default:
                        break;
                }

            } else if (event.type.endsWith('::pool::CollectFeeEvent')) {
                // fee: maybe pool_script and pool_script_v2 event exist at the same time
                const json = event.parsedJson as {
                    amount_a: string;
                    amount_b: string;
                };
                ret.fee_owned_a.iadd(new BN(json.amount_a));
                ret.fee_owned_b.iadd(new BN(json.amount_b));
            }
        }
    }
    return ret;
}


function getTotalGasFee(rst: SuiTransactionBlockResponse): BN {
    let gas = new BN(0);
    if (rst.effects) {
        let computationCost = new BN(rst.effects.gasUsed.computationCost);
        let storageCost = new BN(rst.effects.gasUsed.storageCost);
        let storageRebate = new BN(rst.effects.gasUsed.storageRebate);
        gas.iadd(computationCost);
        gas.iadd(storageCost);
        gas.isub(storageRebate);
    }
    return gas;
}

function getBalanceChange(rst: SuiTransactionBlockResponse): BalanceChange {
    let ret = newBalanceChange();
    if (rst.balanceChanges) {
        for (const balance of rst.balanceChanges) {
            if (getCoinTypeEnum(balance.coinType) === CoinTypeEnum.CETUS) {
                ret.cetus_change = new BN(balance.amount);
            } else if (getCoinTypeEnum(balance.coinType) === CoinTypeEnum.SUI) {
                ret.sui_change = new BN(balance.amount);
            } else if (getCoinTypeEnum(balance.coinType) === CoinTypeEnum.USDC) {
                ret.usdc_change = new BN(balance.amount);
            }
        }
    } else {
        console.log('rst.balanceChanges is empty');
    }
    return ret;
}

function getAddLiquidityEvent(rst: SuiTransactionBlockResponse): LiquidityEvent {
    let ret = newLiquidityEvent();
    if (rst.events?.length) {
        for (const event of rst.events) {
            if (event.type.endsWith('::pool::AddLiquidityEvent') || event.type.endsWith('::pool::AddLiquidityV2Event')) {
                const json = event.parsedJson as {
                    after_liquidity: string;
                    amount_a: string;
                    amount_b: string;
                    liquidity: string;
                    pool: string;
                    position: string;
                };
                ret.after_liquidity = new BN(json.after_liquidity);
                ret.amount_a = new BN(json.amount_a);
                ret.amount_b = new BN(json.amount_b);
                ret.liquidity = new BN(json.liquidity);
                ret.pool = json.pool;
                ret.position = json.position;
            }
        }
    }

    return ret;
}

function getRemoveLiquidityEvent(rst: SuiTransactionBlockResponse): LiquidityEvent {
    let ret = newLiquidityEvent();

    if (rst.events?.length) {
        for (const event of rst.events) {
            if (event.type.endsWith('::pool::RemoveLiquidityEvent') || event.type.endsWith('::pool::RemoveLiquidityV2Event')) {
                const json = event.parsedJson as {
                    after_liquidity: string;
                    amount_a: string;
                    amount_b: string;
                    liquidity: string;
                    pool: string;
                    position: string;
                };
                ret.after_liquidity = new BN(json.after_liquidity);
                ret.amount_a = new BN(json.amount_a);
                ret.amount_b = new BN(json.amount_b);
                ret.liquidity = new BN(json.liquidity);
                ret.pool = json.pool;
                ret.position = json.position;
            }
        }
    }
    return ret;
}

async function getTransactionInfo(digest: string, tx_info: TransactionInfo, tx_opt: TransactionInfoQueryOptions, sendKeypair: Ed25519Keypair) {
    while (true) {
        try {
            // const tx_rsp = await cetusClmmSDK.FullClient.getTransactionBlock({
            //     digest, 
            //     options: {
            //         showBalanceChanges: tx_opt.get_balance_change,
            //         showEffects: true, //  tx_opt.get_total_gas_fee and effects?.status.status
            //         showEvents: tx_opt.get_fee_and_rwd || tx_opt.get_add_liquidity_event || tx_opt.get_remove_liquidity_event,
            //         // showInput: true,
            //         // showObjectChanges: true,
            //         // showRawEffects: true,
            //         // showRawInput:true
            //     }
            // });
            const tx_rsp = await cetusClmmSDK.FullClient.waitForTransaction({
                digest, 
                options: {
                    showBalanceChanges: tx_opt.get_balance_change,
                    showEffects: true, //  tx_opt.get_total_gas_fee and effects?.status.status
                    showEvents: tx_opt.get_fee_and_rwd || tx_opt.get_add_liquidity_event || tx_opt.get_remove_liquidity_event,
                    // showInput: true,
                    // showObjectChanges: true,
                    // showRawEffects: true,
                    // showRawInput:true
                }
            });
            if (tx_rsp.effects?.status.status !== 'success') {
                date.setTime(Date.now())
                console.log('%s [WARNNING] cetusClmmSDK.FullClient.getTransactionBlock: the retrieved tx is a failed tx(%s)', date.toLocaleString(), digest);
                // await new Promise(f => setTimeout(f, 2000));
                // continue;
            }

            if (tx_rsp.timestampMs) {
                tx_info.unix_timestamp_ms = Number.parseInt(tx_rsp.timestampMs);
            } else {
                tx_info.unix_timestamp_ms = Date.now();
            }
            
            tx_info.digest = digest;
            // effect 
            if (tx_opt.get_total_gas_fee) {
                tx_info.total_gas_fee = getTotalGasFee(tx_rsp);
            }

            // balance change
            if (tx_opt.get_balance_change) {
                tx_info.balance_change = getBalanceChange(tx_rsp);
            }

            // events
            if (tx_opt.get_add_liquidity_event) {
                tx_info.liquidity_event = getAddLiquidityEvent(tx_rsp);
            } 
            if (tx_opt.get_remove_liquidity_event) {
                tx_info.liquidity_event = getRemoveLiquidityEvent(tx_rsp);
            }
            
            if (tx_opt.get_fee_and_rwd) {
                tx_info.fee_and_reward = getFeeAndRewardCollectEvent(tx_rsp);
            }
        } catch(e) {
            date.setTime(Date.now())
            if (e instanceof Error) {
                console.error('%s [ERROR] getTransactionBlock get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('[ERROR] getTransactionBlock get an exception'); 
                console.error(e);
            }
            console.error('wait 2s and try again...'); 
            await new Promise(f => setTimeout(f, 2000));
            continue;
        }
        break;
    }
}


function dumpTransactionInfo(title: string, tx_info: TransactionInfo, tx_opt: TransactionInfoQueryOptions) {
    console.log('- %s - ', title);
    console.log('timestamp: ', new Date(tx_info.unix_timestamp_ms).toLocaleString());
    console.log('type: ', tx_info.type);
    console.log('digest: ', tx_info.digest);

    if (tx_opt.get_total_gas_fee) {
        console.log('total_gas_fee: ', tx_info.total_gas_fee.toString());
    }
    if (tx_opt.get_balance_change) {
        console.log('balance_change.usdc_change: ', tx_info.balance_change.usdc_change.toString());
        console.log('balance_change.sui_change: ', tx_info.balance_change.sui_change.toString());
        console.log('balance_change.cetus_change: ', tx_info.balance_change.cetus_change.toString());
    }

    if (tx_opt.get_add_liquidity_event || tx_opt.get_remove_liquidity_event) {
        console.log('liquidity_event.after_liquidity: ', tx_info.liquidity_event.after_liquidity.toString());
        console.log('liquidity_event.amount_a: ', tx_info.liquidity_event.amount_a.toString());
        console.log('liquidity_event.amount_b: ', tx_info.liquidity_event.amount_b.toString());
        console.log('liquidity_event.liquidity: ', tx_info.liquidity_event.liquidity.toString());
        console.log('liquidity_event.pool: ', tx_info.liquidity_event.pool);
        console.log('liquidity_event.position: ', tx_info.liquidity_event.position);
    }

    if (tx_opt.get_fee_and_rwd) {
        console.log('fee_and_reward.fee_owned_a: ', tx_info.fee_and_reward.fee_owned_a.toString());
        console.log('fee_and_reward.fee_owned_b: ', tx_info.fee_and_reward.fee_owned_b.toString());
        console.log('fee_and_reward.rwd_owned_sui: ', tx_info.fee_and_reward.rwd_owned_sui.toString());
        console.log('fee_and_reward.rwd_owned_cetus: ', tx_info.fee_and_reward.rwd_owned_cetus.toString());
    }
    console.log('- %s End- ', title);
}



































// estimated coin amount and liquidity and tick

type LiquidityInfo = {
    tick_lower_index: number;
    tick_upper_index: number;
    coin_a_amount_lower: string;
    coin_b_amount_upper: string;
    liquidity: string; 
};

function newLiquidityInfo(): LiquidityInfo {
    let ret: LiquidityInfo = {
        tick_lower_index: 0,
        tick_upper_index: 0,
        coin_a_amount_lower: '0',
        coin_b_amount_upper: '0',
        liquidity: '0'
    };
    return ret;
}


function estLiquidityInfo(tick_lower_index: number, tick_upper_index: number, fix_amount_a: boolean, coin_amount: string): LiquidityInfo {
    let ret = newLiquidityInfo();

    ret.tick_lower_index = tick_lower_index;
    ret.tick_upper_index = tick_upper_index;

    let coin_amount_lower_side: CoinAmounts = {
        coin_amount_a: '0',
        coin_amount_b: '0'
    };

    let coin_amount_upper_side: CoinAmounts = {
        coin_amount_a: '0',
        coin_amount_b: '0'
    };


    if (fix_amount_a) {
        coin_amount_lower_side = {
            coin_amount_a: coin_amount,
            coin_amount_b: '0'
        };
        const liquidity = ClmmPoolUtil.estimateLiquidityFromCoinAmounts(
            TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
            tick_lower_index,
            tick_upper_index,
            coin_amount_lower_side
        );
        ret.liquidity = liquidity;
        coin_amount_upper_side = ClmmPoolUtil.getCoinAmountFromLiquidity(
            new BN(liquidity),
            TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
            TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
            TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
            false
        );
        ret.coin_a_amount_lower = coin_amount;
        ret.coin_b_amount_upper = coin_amount_upper_side.coin_amount_b;


    } else {
        coin_amount_upper_side = {
            coin_amount_a: '0',
            coin_amount_b: coin_amount.toString()
        };
        const liquidity = ClmmPoolUtil.estimateLiquidityFromCoinAmounts(
            TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
            tick_lower_index,
            tick_upper_index,
            coin_amount_upper_side
        );
        ret.liquidity = liquidity;

        coin_amount_lower_side = ClmmPoolUtil.getCoinAmountFromLiquidity(
            new BN(liquidity),
            TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
            TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
            TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
            false
        );

        ret.coin_a_amount_lower = coin_amount_lower_side.coin_amount_a;
        ret.coin_b_amount_upper = coin_amount;
    }

    // console.log('--------------------------------------------------------'); 
    // console.log('estLiquidityInfo');
    // console.log('coin_amount_lower_side: coin a: %s, coin b: %s', coin_amount_lower_side.coin_amount_a, coin_amount_lower_side.coin_amount_b);
    // console.log('coin_amount_upper_side: coin a: %s, coin b: %s', coin_amount_upper_side.coin_amount_a, coin_amount_upper_side.coin_amount_b);
    // console.log('%d - %d, liquidity: %s', ret.tick_lower_index, ret.tick_upper_index, ret.liquidity);
    // console.log('coin_a_amount_lower: %s, coin_b_amount_upper: %s', ret.coin_a_amount_lower, ret.coin_b_amount_upper);
    // console.log('--------------------------------------------------------'); 
    return ret;
}



function estLiquidityInfoByLiquidity(tick_lower_index: number, tick_upper_index: number, liquidity: string): LiquidityInfo {
    let ret = newLiquidityInfo();

    ret.tick_lower_index = tick_lower_index;
    ret.tick_upper_index = tick_upper_index;
    ret.liquidity = liquidity;




    let coin_amount_lower_side: CoinAmounts = {
        coin_amount_a: '0',
        coin_amount_b: '0'
    };

    let coin_amount_upper_side: CoinAmounts = {
        coin_amount_a: '0',
        coin_amount_b: '0'
    };

    coin_amount_lower_side = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(liquidity),
        TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
        TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
        TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
        false
    );

    coin_amount_upper_side = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(liquidity),
        TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
        TickMath.tickIndexToSqrtPriceX64(tick_lower_index),
        TickMath.tickIndexToSqrtPriceX64(tick_upper_index),
        false
    );
    ret.coin_a_amount_lower = coin_amount_lower_side.coin_amount_a;
    ret.coin_b_amount_upper = coin_amount_upper_side.coin_amount_b;

    return ret;
}



function estAddCloseLiquidityTickIndex(tick_lower_index: number, tick_upper_index: number, liqui_event: LiquidityEvent, is_add: number): number {
    let add_liqui_tick = -443637;

    if (liqui_event.amount_a.lten(0) && liqui_event.amount_b.lten(0)) {
        return add_liqui_tick;
    } else if (liqui_event.amount_a.lten(0) && liqui_event.amount_b.gtn(0)) {
        return tick_upper_index;
    } else if (liqui_event.amount_a.gtn(0) && liqui_event.amount_b.lten(0)) {
        return tick_lower_index;
    }

    const sqrtPl = new Decimal(TickMath.tickIndexToSqrtPriceX64(tick_lower_index).toString());
    const sqrtPu = new Decimal(TickMath.tickIndexToSqrtPriceX64(tick_upper_index).toString());

    let liquidity_d = is_add ? Decimal(liqui_event.after_liquidity.toString()) : Decimal(liqui_event.liquidity.toString()) ;
    let amount_a_d = Decimal(liqui_event.amount_a.toString());
    let amount_b_d = Decimal(liqui_event.amount_b.toString());

    const sqrtP_from_A = MathUtil.toX64Decimal(liquidity_d).mul(sqrtPu).div(amount_a_d.mul(sqrtPu).add(MathUtil.toX64Decimal(liquidity_d)));
    const sqrtP_from_B = amount_b_d.div(MathUtil.fromX64Decimal(liquidity_d)).add(sqrtPl);
    const sqrtP = sqrtP_from_A.add(sqrtP_from_B).div(2);

    if (sqrtP.isNaN()) {
        console.log('sqrtP is NaN return');
        return add_liqui_tick;
    }
    add_liqui_tick = TickMath.sqrtPriceX64ToTickIndex(new BN(sqrtP.round().toString()));
    return add_liqui_tick;
}



















// wallet balance

type AllCoinAmounts = {
    usdc_amount: string;
    sui_amount: string;
    cetus_amount: string;
};

async function getAllWalletBalance(account_address: string): Promise<AllCoinAmounts> {
    let ret: AllCoinAmounts = {usdc_amount: '0', sui_amount: '0', cetus_amount: '0'};
    const CoinBalance = await cetusClmmSDK.FullClient.getAllBalances({owner: account_address});
    for (const coin of CoinBalance) {
        switch(getCoinTypeEnum(coin.coinType)) {
        case CoinTypeEnum.USDC:
            ret.usdc_amount = coin.totalBalance;
            break;
        case CoinTypeEnum.SUI:
            ret.sui_amount = coin.totalBalance;
            break;
        case CoinTypeEnum.CETUS:
            ret.cetus_amount = coin.totalBalance;
            break;
        default:
            break;
        }
    }
    return ret;
}


function balanceNotChange(coin_amount_old: AllCoinAmounts, coin_amount_new: AllCoinAmounts): boolean {
    let coin_a_not_change = Decimal(coin_amount_old.usdc_amount).eq(d(coin_amount_new.usdc_amount));
    let coin_b_not_change = Decimal(coin_amount_old.sui_amount).eq(d(coin_amount_new.sui_amount));
    let cetus_not_change = Decimal(coin_amount_old.cetus_amount).eq(d(coin_amount_new.cetus_amount));
    return coin_a_not_change && coin_b_not_change && cetus_not_change;
}

function getAllWalletBalanceValue(all_coin_amount: AllCoinAmounts, sui_price: Decimal, cetus_price: Decimal) :Decimal {
    let usdc_value = d(all_coin_amount.usdc_amount).mul(Decimal.pow(10, -6));
    let sui_value = d(all_coin_amount.sui_amount).mul(Decimal.pow(10, -9)).mul(sui_price);
    let cetus_value = d(all_coin_amount.cetus_amount).mul(Decimal.pow(10, -9)).mul(cetus_price);
    return usdc_value.add(sui_value).add(cetus_value);
}























// Grid trading ctx


type PositionAttribute = {
    tick_lower_index: number;
    tick_upper_index: number;    
    liquidity_est: BN;

    coin_a_amount_lower_est: BN;
    coin_b_amount_lower_est: BN;
    liquidity_value_lower_est: Decimal;

    coin_a_amount_upper_est: BN;
    coin_b_amount_upper_est: BN;
    liquidity_value_upper_est: Decimal;
};

function newPositionAttribute(): PositionAttribute {
    let ret: PositionAttribute = {
        tick_lower_index: 0,
        tick_upper_index: 0,
        liquidity_est: new BN(0),

        coin_a_amount_lower_est: new BN(0),
        coin_b_amount_lower_est: new BN(0),
        liquidity_value_lower_est: d(0),

        coin_a_amount_upper_est: new BN(0),
        coin_b_amount_upper_est: new BN(0),
        liquidity_value_upper_est: d(0)        
    };
    return ret;
}

function initPositionAttribute(tick_lower_index: number, tick_upper_index: number, fix_amount_a: boolean, coin_amount: string): PositionAttribute {
    let ret = newPositionAttribute();

    ret.tick_lower_index = tick_lower_index;
    ret.tick_upper_index = tick_upper_index;

    let liquidity_info = estLiquidityInfo(tick_lower_index, tick_upper_index, fix_amount_a, coin_amount);
    ret.coin_a_amount_lower_est = new BN(liquidity_info.coin_a_amount_lower);
    ret.coin_b_amount_lower_est = new BN(0);
    ret.coin_a_amount_upper_est = new BN(0);
    ret.coin_b_amount_upper_est = new BN(liquidity_info.coin_b_amount_upper);
    ret.liquidity_est = new BN(liquidity_info.liquidity);
    return ret;
}


type PositionRunningCtx = {
    id: string;
    pair_ctx_id: string;

    tick_lower_index: number;
    tick_upper_index: number;

    liquidity_est: BN;

    coin_a_amount_lower_est: BN;
    coin_b_amount_lower_est: BN; // not used
    liquidity_value_lower_est: Decimal; // not used

    coin_a_amount_upper_est: BN; // not used
    coin_b_amount_upper_est: BN;
    liquidity_value_upper_est: Decimal; // not used

    liquidity_actual: BN;
    tx_info_grid_arr: TransactionInfo[]; // not used

    tick_index_open: number; // not used
    coin_a_amount_open: BN; // not used
    coin_b_amount_open: BN; // not used
    liquidity_value_open: Decimal;


    tick_index_latest: number; // not used
    coin_a_amount_latest: BN; 
    coin_b_amount_latest: BN;
    liquidity_value_latest: Decimal;

    total_gas_latest : BN;
    total_gas_value_latest: Decimal;

    fee_and_reward_latest: FeeAndReward;
    fee_and_reward_value_latest: Decimal;



    // tick_index_close: number; // not used
    // coin_a_amount_close: BN; // not used
    // coin_b_amount_close: BN; // not used
    // liquidity_value_close: Decimal; // not used

    // fee_and_reward_close: FeeAndReward; // not used
    // fee_and_reward_value_close: Decimal; // not used
    
};


function newPositionRunningCtx(): PositionRunningCtx {
    let ret: PositionRunningCtx = {
        id: '',
        pair_ctx_id: '',

        tick_lower_index: 0,
        tick_upper_index: 0,

        liquidity_est:  new BN(0),

        coin_a_amount_lower_est:  new BN(0),
        coin_b_amount_lower_est:  new BN(0),
        liquidity_value_lower_est: d(0),

        coin_a_amount_upper_est:  new BN(0),
        coin_b_amount_upper_est:  new BN(0),
        liquidity_value_upper_est: d(0),

        liquidity_actual: new BN(0),
        tx_info_grid_arr: [],


        tick_index_open: 0,
        coin_a_amount_open: new BN(0),
        coin_b_amount_open: new BN(0),        
        liquidity_value_open: d(0),


        tick_index_latest: 0,
        coin_a_amount_latest: new BN(0),
        coin_b_amount_latest: new BN(0),
        liquidity_value_latest: d(0),

        total_gas_latest: new BN(0),
        total_gas_value_latest: d(0),

        fee_and_reward_latest: newFeeAndReward(),
        fee_and_reward_value_latest: d(0),

        // tick_index_close: 0,
        // coin_a_amount_close: new BN(0),
        // coin_b_amount_close: new BN(0),
        // liquidity_value_close: d(0),

        // fee_and_reward_close: newFeeAndReward(),
        // fee_and_reward_value_close: d(0)
        
    };
    return ret;
}

function initPositionRunningCtx(tick_lower_index: number, tick_upper_index: number, pair_ctx_id: string, fix_amount_a: boolean, coin_amount: string): PositionRunningCtx {
    let ret = newPositionRunningCtx();
    ret.pair_ctx_id = pair_ctx_id;

    ret.tick_lower_index = tick_lower_index;
    ret.tick_upper_index = tick_upper_index;    

    let liquidity_info = estLiquidityInfo(tick_lower_index, tick_upper_index, fix_amount_a, coin_amount);
    ret.coin_a_amount_lower_est = new BN(liquidity_info.coin_a_amount_lower);
    ret.coin_b_amount_lower_est = new BN(0);
    ret.coin_a_amount_upper_est = new BN(0);
    ret.coin_b_amount_upper_est = new BN(liquidity_info.coin_b_amount_upper);
    ret.liquidity_est = new BN(liquidity_info.liquidity);
    return ret;
}


function clonePositionRunningCtx(ori_position: PositionRunningCtx): PositionRunningCtx {
    let ret: PositionRunningCtx = {
        id: ori_position.id,
        pair_ctx_id: ori_position.pair_ctx_id,

        tick_lower_index: ori_position.tick_lower_index,
        tick_upper_index: ori_position.tick_upper_index,

        liquidity_est: ori_position.liquidity_est.clone(),

        coin_a_amount_lower_est: ori_position.coin_a_amount_lower_est.clone(),
        coin_b_amount_lower_est: ori_position.coin_b_amount_lower_est.clone(),
        liquidity_value_lower_est: ori_position.liquidity_value_lower_est,

        coin_a_amount_upper_est: ori_position.coin_a_amount_upper_est.clone(),
        coin_b_amount_upper_est: ori_position.coin_b_amount_upper_est.clone(),
        liquidity_value_upper_est: ori_position.liquidity_value_upper_est,

        liquidity_actual: ori_position.liquidity_actual.clone(),
        tx_info_grid_arr: [],


        tick_index_open: ori_position.tick_index_open,
        coin_a_amount_open: ori_position.coin_a_amount_open.clone(),
        coin_b_amount_open: ori_position.coin_b_amount_open.clone(),
        liquidity_value_open: ori_position.liquidity_value_open,


        tick_index_latest: ori_position.tick_index_latest,
        coin_a_amount_latest: ori_position.coin_a_amount_latest.clone(),
        coin_b_amount_latest: ori_position.coin_b_amount_latest.clone(),
        liquidity_value_latest: ori_position.liquidity_value_latest,

        total_gas_latest: ori_position.total_gas_latest.clone(),
        total_gas_value_latest: ori_position.total_gas_value_latest,

        fee_and_reward_latest: cloneFeeAndReward(ori_position.fee_and_reward_latest),
        fee_and_reward_value_latest: ori_position.fee_and_reward_value_latest

        // tick_index_close: ori_position.tick_index_close,
        // coin_a_amount_close: ori_position.liquidity_est.clone(),
        // coin_b_amount_close: ori_position.liquidity_est.clone(),
        // liquidity_value_close: ori_position.liquidity_value_close,

        // fee_and_reward_close: cloneFeeAndReward(ori_position.fee_and_reward_close),
        // fee_and_reward_value_close: ori_position.fee_and_reward_value_close
    };

    for (const tx_info of ori_position.tx_info_grid_arr) {
        ret.tx_info_grid_arr.push(cloneTransactionInfo(tx_info));
    }
    return ret;
}


type GridTradingPairProfit = {
    liquidity_delta: Decimal;
    total_gas_used: BN;
    total_gas_used_value: Decimal;
    total_fee_and_rwd: FeeAndReward;
    total_fee_and_rwd_value: Decimal;
};

function newGridTradingPairProfit(): GridTradingPairProfit {
    let ret: GridTradingPairProfit = {
        liquidity_delta: d(0),
        total_gas_used: new BN(0),
        total_gas_used_value: d(0),
        total_fee_and_rwd: newFeeAndReward(),
        total_fee_and_rwd_value: d(0)
    };
    return ret;
}

function addGridTradingPairProfit(ori1: GridTradingPairProfit, ori2: GridTradingPairProfit): GridTradingPairProfit {
    let ret: GridTradingPairProfit = {
        liquidity_delta: ori1.liquidity_delta.add(ori2.liquidity_delta),
        total_gas_used: ori1.total_gas_used.add(ori2.total_gas_used),
        total_gas_used_value: ori1.total_gas_used_value.add(ori2.total_gas_used_value),
        total_fee_and_rwd: addFeeAndReward(ori1.total_fee_and_rwd, ori2.total_fee_and_rwd),
        total_fee_and_rwd_value: ori1.total_fee_and_rwd_value.add(ori2.total_fee_and_rwd_value)
    };
    return ret;
}





enum GridTradingPairState {
    Initial = 0,
    Buying,
    BuyFinished,
    Selling,
    SellFinished,
    GridTradingStateMax
};


function getGridTradingPairStateStr(id: number): string {
    switch(id) {
        case GridTradingPairState.Initial: 
            return 'Initial';
        case GridTradingPairState.Buying: 
            return 'Buying';
        case GridTradingPairState.BuyFinished: 
            return 'BuyFinished';
        case GridTradingPairState.Selling: 
            return 'Selling';
        case GridTradingPairState.SellFinished: 
            return 'SellFinished';
        default:
            return 'UnknownState';            
    }
}

type GridTradingPairCtx = {
    id: string;
    previous_id: string;
    unix_timestamp_ms: number;
    state: number;
    buy_with_pos: number;

    buy_position_ctx: PositionRunningCtx;
    sell_position_ctx: PositionRunningCtx;

    current_pair_profit: GridTradingPairProfit;
    total_history_pair_profit: GridTradingPairProfit;
};

function newGridTradingPairCtx(): GridTradingPairCtx {
    let ret: GridTradingPairCtx = {
        id: '',
        previous_id: '',
        unix_timestamp_ms: 0,
        state: GridTradingPairState.Initial,
        buy_with_pos: 0,

        buy_position_ctx: newPositionRunningCtx(),
        sell_position_ctx: newPositionRunningCtx(),

        current_pair_profit: newGridTradingPairProfit(),
        total_history_pair_profit: newGridTradingPairProfit()
    };
    return ret;
}


function initGridTradingPairCtx(tick_of_buy_position: number, tick_of_sell_position: number, buy_pos_exist: number, previous_ctx: GridTradingPairCtx | undefined): GridTradingPairCtx {
    let grid_trading_pair_ctx = newGridTradingPairCtx();

    grid_trading_pair_ctx.unix_timestamp_ms = Date.now();
    grid_trading_pair_ctx.id = util.format('%s_%d_%d', formatDate(new Date(grid_trading_pair_ctx.unix_timestamp_ms)), tick_of_buy_position, tick_of_sell_position);
    grid_trading_pair_ctx.previous_id = previous_ctx ? previous_ctx.id : '';
    grid_trading_pair_ctx.state = buy_pos_exist? GridTradingPairState.Initial : GridTradingPairState.BuyFinished;
    grid_trading_pair_ctx.buy_with_pos = buy_pos_exist;

    if (previous_ctx) {
        grid_trading_pair_ctx.total_history_pair_profit = addGridTradingPairProfit(previous_ctx.current_pair_profit, previous_ctx.total_history_pair_profit);
    }
    return grid_trading_pair_ctx;
}





type GridInfo = {
    tick_lower_index: number;
    tick_upper_index: number;

    grid_trading_pair_ctx: GridTradingPairCtx | undefined;
};


function newGridInfo(): GridInfo {
    let ret: GridInfo = {
        tick_lower_index: 0,
        tick_upper_index: 0,
        grid_trading_pair_ctx: undefined
    };
    return ret;
}



enum GridAction {  
    OPEN_BUY_POSITION = 0,
    CLOSE_BUY_POSITION,
    OPEN_SELL_POSITION,
    CLOSE_SELL_POSITION,
    GRID_ACTION_MAX
};

type GridActionCtx = {
    action_type: number;
    tick_lower_index: number;
    tick_upper_index: number;
    grid_trading_pair_ctx: GridTradingPairCtx;
    cancel_out_action_idx: number;
    cancel_out_action_reference_position_ctx: PositionRunningCtx | undefined;
};

function getGridActionCtxStr(id: number): string {
    switch(id) {
        case GridAction.OPEN_BUY_POSITION: 
            return 'OPEN_BUY_POSITION';
        case GridAction.CLOSE_BUY_POSITION: 
            return 'CLOSE_BUY_POSITION';
        case GridAction.OPEN_SELL_POSITION: 
            return 'OPEN_SELL_POSITION';
        case GridAction.CLOSE_SELL_POSITION: 
            return 'CLOSE_SELL_POSITION';
        default:
            return 'UnknownAction';            
    }
}








































// action add


async function getCoins(account_address: string, coin_type: string): Promise<string[]> {
    // merge coin check
    let coins: string[] = [];
    let retry_times = 5;
    while(true) { // try best to recover
        try {
            let hasNextPage = true;
            let cursor: string | null| undefined = null;            

            while (hasNextPage) {
                const rsp = await cetusClmmSDK.FullClient.getCoins({
                    owner: account_address,
                    coinType: coin_type,
                    cursor,
                    limit: 50
                });

                rsp.data.forEach(c => coins.push(c.coinObjectId));
                hasNextPage = rsp.hasNextPage;
                cursor = rsp.nextCursor;
            }
        } catch (e) {
            if (e instanceof Error) {
                console.error('%s [error] getCoins get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('getCoins get an exception'); 
                console.error(e);
            }

            coins = [];
            if (retry_times <= 0) {
                console.error('no retry_times remains, return undefined.');
                break;
            }
            console.error('wait and try again...'); 
            await new Promise(f => setTimeout(f, 500));
            retry_times--;            
            continue;
        }
        break;
    }
    return coins;
}



async function mergeCoin(coins: string[], sendKeypair: Ed25519Keypair): Promise<SuiTransactionBlockResponse | undefined> {
    const tx = new Transaction();
    let tx_rsp: SuiTransactionBlockResponse | undefined = undefined;
    let retry_times = 5;

    while(true) {
        try {
            if (coins.length <= 1) {
                return tx_rsp;
            }
            const primaryCoin = tx.object(coins[0]);
            const toMerge = coins.slice(1).map(id => tx.object(id));
            tx.mergeCoins(primaryCoin, toMerge);
            tx_rsp = await cetusClmmSDK.FullClient.signAndExecuteTransaction(
                {
                    transaction: tx, 
                    signer: sendKeypair, 
                    options: {
                        showEffects: true,
                        showEvents: true,
                        showInput: true,
                        showBalanceChanges: true,
                    },
                }
            );
            dumpSDKRet2Logfile('mergeCoin: cetusClmmSDK.FullClient.signAndExecuteTransaction', JSON.stringify(tx_rsp, null, 2));
            console.log('[%s] - mergeCoin: cetusClmmSDK.FullClient.signAndExecuteTransaction: %s - ', date.toLocaleString(), tx_rsp.effects?.status.status);
        } catch(e) {
            if (e instanceof Error) {
                console.error('%s [error] mergeCoin get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('[error] mergeCoin get an exception'); 
                console.error(e);
            }
            if (retry_times <= 0) {
                console.error('no retry_times remains, return undefined.');
                tx_rsp = undefined;
                break;
            }
            console.error('wait 2s and try again..., remain times: ', retry_times); 
            await new Promise(f => setTimeout(f, 2000));
            retry_times = retry_times - 1;
            continue;
        }
        break;
    }                    
    return tx_rsp;
}


async function aggregatorSwap(from: string, target: string, amount: BN, by_amount_in: boolean, sendKeypair: Ed25519Keypair):  Promise<SuiTransactionBlockResponse | undefined> {

    let txb = new Transaction();
    let tx_rsp: SuiTransactionBlockResponse | undefined = undefined;
    let retry_times = 5;
    while (true) { // try best to recover
        try {
            const routers = await client.findRouters({
                from,
                target,
                amount,
                byAmountIn: by_amount_in // `true` means fix input amount, `false` means fix output amount
            }); 
            dumpSDKRet2Logfile('Aggregator Swap: client.findRouters', JSON.stringify(routers, null, 2));
            console.log('[%s] - Aggregator Swap: client.findRouters: %s - ', date.toLocaleString(), routers ? 'success' : 'failure');

            if (routers == null) {
                console.log('[error] Swap: client.findRouter return null'); 
                if (retry_times <= 0) {
                    console.error('no retry_times remains, return undefined.');
                    tx_rsp = undefined;
                    break;
                }
                console.log('[error] wait 2s and try again..., remain times:', retry_times);
                await new Promise(f => setTimeout(f, 2000));
                retry_times = retry_times - 1;
                continue;
            }

            client.signer = sendKeypair.getPublicKey().toSuiAddress();
            await client.fastRouterSwap({
                routers,
                txb,
                slippage: SLIPPAGE_AGGREGATOR_SWAP,
            });



            const result = await client.devInspectTransactionBlock(txb);
            dumpSDKRet2Logfile('Aggregator Swap: client.devInspectTransactionBlock', JSON.stringify(result, null, 2));
            console.log('[%s] - Aggregator Swap: client.devInspectTransactionBlock: %s - ', date.toLocaleString(), result.effects.status.status);


            tx_rsp = await client.signAndExecuteTransaction(txb, sendKeypair);
            // const signAndExecuteResult = await client.sendTransaction(txb, sendKeypair);
            dumpSDKRet2Logfile('Aggregator Swap: client.signAndExecuteTransaction', JSON.stringify(tx_rsp, null, 2));
            console.log('[%s] - Aggregator Swap: client.signAndExecuteTransaction: %s - ', date.toLocaleString(), tx_rsp.effects?.status.status);

        } catch (e) {
            if (e instanceof Error) {
                console.error('%s [error] Aggregator Swap get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('[error] Aggregator Swap get an exception'); 
                console.error(e);
            }
            if (retry_times <= 0) {
                console.error('no retry_times remains, return undefined.');
                tx_rsp = undefined;
                break;
            }
            console.error('wait 2s and try again..., remain times: ', retry_times); 
            await new Promise(f => setTimeout(f, 2000));
            retry_times = retry_times - 1;
            continue;
        }
        break;
    }
    return tx_rsp;
}


async function closePosition(pool: Pool, pos_id: string, sendKeypair: Ed25519Keypair):  Promise<SuiTransactionBlockResponse | undefined> {
    let transfer_txn: SuiTransactionBlockResponse | undefined = undefined;
    let retry_times = 5;
    while (true) {
        try {
            const reward_coin_types = pool.rewarder_infos.map((rewarder) => rewarder.coin_type);
            const close_position_payload = await cetusClmmSDK.Position.closePositionPayload({
                coin_type_a: pool.coin_type_a,
                coin_type_b: pool.coin_type_b,
                min_amount_a: '0',
                min_amount_b: '0',
                rewarder_coin_types: reward_coin_types,
                pool_id: pool.id,
                pos_id: pos_id,
                collect_fee: true,
                });
            dumpSDKRet2Logfile('Close Position: cetusClmmSDK.Position.closePositionPayload', JSON.stringify(close_position_payload, null, 2));
            console.log('[%s] - Close Position: cetusClmmSDK.Position.closePositionPayload - ', date.toLocaleString());

            transfer_txn = await cetusClmmSDK.FullClient.sendTransaction(sendKeypair, close_position_payload);
            dumpSDKRet2Logfile('Close Position: cetusClmmSDK.FullClient.sendTransaction', JSON.stringify(transfer_txn, null, 2));
            console.log('[%s] - Close Position: cetusClmmSDK.FullClient.sendTransaction: %s - ', date.toLocaleString(), transfer_txn?.effects?.status.status);
        } catch(e) {
            if (e instanceof Error) {
                console.error('%s [error] Close Position get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('[error] Close Position get an exception'); 
                console.error(e);
            }
            if (retry_times <= 0) {
                console.error('no retry_times remains, return undefined.');
                transfer_txn = undefined;
                break;
            }

            console.error('wait 2s and try again..., remain times:', retry_times);
            await new Promise(f => setTimeout(f, 2000));
            retry_times = retry_times - 1;
            continue;
        }
        break;
    }
    return transfer_txn;
}




























// rebalance by both coin quota

type RebalanceInfo = {
    valid: boolean;
    need_swap: boolean;
    a2b: boolean;
    amount_in: BN;
    amount_out: BN;
};

function newRebalanceInfo() {
    let ret: RebalanceInfo = {
        valid: false,
        need_swap: false,
        a2b: false,
        amount_in: new BN(0),
        amount_out: new BN(0)
    };
    return ret;
}

function getRebalanceInfo(coin_a_amount_in_wallet: BN, coin_b_amount_in_wallet: BN, coin_a_amount_quota: BN, coin_b_amount_quota: BN, 
                current_tick_index: number) : RebalanceInfo {

    let ret = newRebalanceInfo();
    if (coin_a_amount_in_wallet.gte(coin_a_amount_quota) && coin_b_amount_in_wallet.gte(coin_b_amount_quota)) {
        ret.valid = true;
        ret.need_swap = false;
    } else if (coin_a_amount_in_wallet.lt(coin_a_amount_quota) && coin_b_amount_in_wallet.lt(coin_b_amount_quota)) {
        ret.valid = false;
    } else if (coin_a_amount_in_wallet.gte(coin_a_amount_quota) && coin_b_amount_in_wallet.lt(coin_b_amount_quota)) {
        let coin_a_delta = coin_a_amount_in_wallet.sub(coin_a_amount_quota);
        let coin_b_delta = coin_b_amount_quota.sub(coin_b_amount_in_wallet);

        let coin_b_price = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));
        let amount_in_est = d(coin_b_delta.toString()).mul(Decimal.pow(10, -9)).mul(coin_b_price).mul(Decimal.pow(10, 6));

        if (amount_in_est.mul(1 + SLIPPAGE_AGGREGATOR_SWAP).lt(d(coin_a_delta.toString()))) {
            ret.valid = true;
            ret.need_swap = true;
            ret.a2b = true;
            ret.amount_in = new BN(amount_in_est.mul(1 + SLIPPAGE_AGGREGATOR_SWAP).round().toString());
            ret.amount_out = coin_b_delta.clone();
        } else {
            ret.valid = false;
        } 
    } else { // coin_a_amount_in_wallet.lt(coin_a_amount_quota) && coin_b_amount_in_wallet.gte(coin_b_amount_quota)
        let coin_a_delta = coin_a_amount_quota.sub(coin_a_amount_in_wallet);
        let coin_b_delta = coin_b_amount_in_wallet.sub(coin_b_amount_quota);
        let coin_a_price = TickMath.tickIndexToPrice(current_tick_index, 6, 9);

        let amount_in_est = d(coin_a_delta.toString()).mul(Decimal.pow(10, -6)).mul(coin_a_price).mul(Decimal.pow(10, 9)); // coin b -> coin a
        if (amount_in_est.mul(1 + SLIPPAGE_AGGREGATOR_SWAP).lt(d(coin_b_delta.toString()))) {
            ret.valid = true;
            ret.need_swap = true;
            ret.a2b = false;
            ret.amount_in = new BN(amount_in_est.mul(1 + SLIPPAGE_AGGREGATOR_SWAP).round().toString());
            ret.amount_out = coin_a_delta.clone();
        } else {
            ret.valid = false;
        } 
    }
    return ret;
}















// utils

function sortMapByKey(inputMap: Map<number, GridInfo>): Map<number, GridInfo> {
    const entries = Array.from(inputMap.entries());

    entries.sort((a, b) => {
        const keyA = a[0];
        const keyB = b[0];
        return keyA - keyB;
    });

    return new Map(entries);
}




async function getCurrentTickIndex(pool_address: string): Promise<number> {
    let current_tick_index = 0;
    let pool: Pool | undefined = undefined;
    while(true) { // try best to recover
        try {
            pool = await cetusClmmSDK.Pool.getPool(pool_address);
            if (pool == undefined) {
                console.log('[ERROR] can not retrive pool info with getPool, wait and try again...');
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
        } catch (e) {
            if (e instanceof Error) {
                console.error('%s [error] getPool get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('getPool get an exception'); 
                console.error(e);
            }
            console.error('wait and try again...'); 
            await new Promise(f => setTimeout(f, 500));
            continue;
        }
        break;
    }
    current_tick_index = pool.current_tick_index;

    return current_tick_index;
}


function posInRange(cur_tick: number, lower_tick: number, upper_tick: number): boolean {
    if (cur_tick >= lower_tick && cur_tick <= upper_tick) {
        return true;
    } else {
        return false;
    }
}



type GridMinerConfig = {
    mode: string;  // 'running', 'close_position'
    close_when_sig_int: string;
    dump_trading_pair: string;
    grid_amount_max: string;
    liquidity_in_sui: string;
};

function newMinerConfig(): GridMinerConfig {
    let ret: GridMinerConfig = {
        mode: 'running',
        close_when_sig_int: 'false',
        dump_trading_pair: 'false',
        grid_amount_max: '9',
        liquidity_in_sui: '13000000000'
    };
    return ret;
}




async function loadGridMinerConfig(): Promise<GridMinerConfig> {
    let miner_config = newMinerConfig();

    if (fs.existsSync(GRID_MINER_CONFIG_FILE_NAME)) {
        try {
            let raw_file: string = fs.readFileSync(GRID_MINER_CONFIG_FILE_NAME).toString();
            miner_config = JSON.parse(raw_file);
        } catch (e) {
            date.setTime(Date.now());
            if (e instanceof Error) {
                console.log('%s [error] load %s and parse get an exception:\n%s \n%s \n%s', date.toLocaleString(), GRID_MINER_CONFIG_FILE_NAME, e.message, e.name, e.stack)
            } else {
                console.log('%s [error] load %s and parse get an exception',date.toLocaleString(), GRID_MINER_CONFIG_FILE_NAME); 
                console.log(e);
            }
            miner_config = newMinerConfig();
        }
    }
    return miner_config;
}



















































async function main() {

    const sendKeypair = Ed25519Keypair.deriveKeypair(MNEMONICS, HD_WALLET_PATH);
    const account_address = sendKeypair.getPublicKey().toSuiAddress();
    cetusClmmSDK.setSenderAddress(account_address);
    console.log('Account Address: ', account_address);



    // open position
    let tx_info_aggregator_swap = newTransactionInfo();
    let tx_info_add_liquidity = newTransactionInfo();


    // close position
    let pools_close_position: Pool[] | null = null;
    let tx_info_close_position = newTransactionInfo();


    // Post Process 
    let tx_info_merge_coin_cetus: TransactionInfo | null = null;
    let tx_info_cetus_aggregator_swap: TransactionInfo | null = null;
    let tx_info_merge_coin_usdc: TransactionInfo | null = null;
    let tx_info_merge_coin_sui: TransactionInfo | null = null;


    // helper
    let tx_info_arr: TransactionInfo[] = [];
    let tx_info_arr_length_last: number = 0;

    let total_gas_fee_accumulate = new BN(0);

    let total_util_gas_now = new BN(0);
    let total_util_gas_value_now = d(0);





    let grid_miner_config = await loadGridMinerConfig();

    if (GRID_AMOUNT_MAX < 3) {
        console.log('[ERROR] GRID_AMOUNT_MAX is %d, must greater than or equal to 3', GRID_AMOUNT_MAX);
        return;
    }






    let pools_initial: Pool[] | undefined = undefined;
    while(true) { // try best to recover
        try {
            pools_initial = await cetusClmmSDK.Pool.getAssignPools([POOL_ADDRESS]);
            if (pools_initial == undefined || pools_initial.length <= 0) {
                console.log('[ERROR] can not retrive pool info with getAssignPools, wait and try again...');
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
        } catch (e) {
            if (e instanceof Error) {
                console.error('%s [error] getAssignPools get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('getAssignPools get an exception'); 
                console.error(e);
            }
            console.error('wait and try again...'); 
            await new Promise(f => setTimeout(f, 500));
            continue;
        }
        break;
    }


    // close existing position
    let positions_initial: Position[] | null = null;
    while(true) {
        try {
            positions_initial = await cetusClmmSDK.Position.getPositionList(account_address, [POOL_ADDRESS], false);
            if (positions_initial == null) {
                console.log('[ERROR] can not retrive pool info with getPositionList, wait and try again...');
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
        } catch (e) {
            if (e instanceof Error) {
                console.error('%s [error] getPositionList get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('getPositionList get an exception'); 
                console.error(e);
            }
            console.error('wait and try again...'); 
            await new Promise(f => setTimeout(f, 500));
            continue;
        }
        break;
    }
    for (const position of positions_initial) {
        while (true) {
            try {
                let tx_rsp = await closePosition(pools_initial[0], position.pos_object_id, sendKeypair);
                if (tx_rsp == undefined || tx_rsp.effects?.status.status == 'failure') { // exception exceed retry times
                    console.log('[error] Close Position: cetusClmmSDK.FullClient.sendTransaction exception exceed retry time, wait 2s and try again...');
                    await new Promise(f => setTimeout(f, 2000));
                    continue;
                }
            } catch (e) {
                if (e instanceof Error) {
                    console.error('%s [error] getPositionList get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getPositionList get an exception'); 
                    console.error(e);
                }
                console.error('wait and try again...'); 
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }
    }
    if (positions_initial.length) {
        console.error('Close Position Detect. Wait 10s'); 
        await new Promise(f => setTimeout(f, 10000));
    }





    let current_tick_index = pools_initial[0].current_tick_index;

    let tick_lower_index_seed = 0;
    let tick_range = 0;

    let tick_of_lower_side_grid_boundary_position = 0;
    let tick_of_upper_side_grid_boundary_position = 0;

    let tick_of_blank_position = 0;
    let tick_of_previous_position = 0;

    let tick_of_current_position = 0;
    let tick_of_lower_side_position = 0;
    let tick_of_upper_side_position = 0;
    let grid_info_current_position: GridInfo | undefined = undefined;
    let grid_info_lower_side_position: GridInfo | undefined = undefined;
    let grid_info_upper_side_position: GridInfo | undefined = undefined;

    let grid_info_map = new Map<number, GridInfo>();
    let grid_trading_pair_ctx_map = new Map<string, GridTradingPairCtx>();
    let grid_action_ctx: GridActionCtx[] = [];


    // get init status
    let wallet_balance_init: AllCoinAmounts = {usdc_amount: '0', sui_amount: '0', cetus_amount: '0'};
    while(true) {
        try {
            wallet_balance_init = await getAllWalletBalance(account_address);
            console.log('wallet_balance: usdc %s, sui %s, cetus %s', 
                wallet_balance_init.usdc_amount, 
                wallet_balance_init.sui_amount, 
                wallet_balance_init.cetus_amount);
        } catch(e) {
            if (e instanceof Error) {
                console.error('%s [error] getAllWalletBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
            } else {
                console.error('getAllWalletBalance get an exception'); 
                console.error(e);
            }
            await new Promise(f => setTimeout(f, 500));
            continue;
        }
        break;
    }

    let current_tick_index_init = current_tick_index;
    let sui_price_init = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));

    let cetus_current_tick_index_init = await getCurrentTickIndex(POOL_ADDRESS_FOR_FEE);
    let cetus_price_init = d(1).div(TickMath.tickIndexToPrice(cetus_current_tick_index_init, 6, 9));






    let init_tick = true;

    // mock data
    // let cycle_count = -1;
    // let tick_change_delta: number[] = [0, 180, 0, -120, 30, 60]

    for(;;) {
        // mock test
        // cycle_count++;
        // if (cycle_count > 5) {
        //     break;
        // }



        // load config and update

        grid_miner_config = await loadGridMinerConfig();


        date.setTime(Date.now())

        console.log('');
        console.log('');
        console.log('--------------------------------------------------------');
        console.log('New Circle: %s', date.toLocaleString());
        console.log('');

        // get tick
        let pools_running: Pool[] | null = null;
        pools_running = null;
        while(true) { // try best to recover
            try {
                pools_running = await cetusClmmSDK.Pool.getAssignPools([POOL_ADDRESS]);
                if (pools_running == null || pools_running.length <= 0) {
                    console.log('[ERROR] can not retrive pool info with getAssignPools, wait and try again...');
                    await new Promise(f => setTimeout(f, 500));
                    continue;
                }
            } catch (e) {
                if (e instanceof Error) {
                    console.error('%s [error] getAssignPools get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getAssignPools get an exception'); 
                    console.error(e);
                }
                console.error('wait and try again...'); 
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }

        current_tick_index = pools_running[0].current_tick_index;
        // current_tick_index = current_tick_index + tick_change_delta[cycle_count];
        console.log('current_tick_index: %d', current_tick_index);

        if (init_tick) {
            let tick_lower_index = 0;
            let tick_upper_index = 0;

            let tick_spacing_lower_index = Math.floor(current_tick_index / POOL_TICK_SPACING) * POOL_TICK_SPACING;
            let tick_spacing_upper_index = tick_spacing_lower_index + POOL_TICK_SPACING;

            let tick_lower_side = (tick_spacing_upper_index - current_tick_index) > (current_tick_index - tick_spacing_lower_index); // [tick_lower_index, tick_middle)

            if (POOL_TICK_SPACING_TIMES % 2) { // odd
                tick_lower_index = tick_spacing_lower_index - Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING;
                tick_upper_index = tick_spacing_upper_index + Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING;
            } else { // even
                tick_lower_index = (tick_lower_side? tick_spacing_lower_index : tick_spacing_upper_index) - Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING;
                tick_upper_index = (tick_lower_side? tick_spacing_lower_index : tick_spacing_upper_index) + Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING;
            }


            console.log('Tick Basic Space: %d - (%d) - %d', tick_spacing_lower_index, current_tick_index, tick_spacing_upper_index);  
            console.log('Position Tick Range for Swap Calc / Add: %d - (%d) - %d', tick_lower_index, current_tick_index, tick_upper_index);
            console.log('Initial Lower Boundary Calc Seed: ', tick_lower_index);


            tick_lower_index_seed = tick_lower_index;
            tick_range = tick_upper_index - tick_lower_index;

            tick_of_blank_position = tick_lower_index;
            
            tick_of_previous_position = tick_lower_index;

            tick_of_lower_side_grid_boundary_position = tick_lower_index;
            tick_of_upper_side_grid_boundary_position = tick_lower_index;

            init_tick = false;
        }

        tick_of_current_position = tick_lower_index_seed + Math.floor((current_tick_index - tick_lower_index_seed) / tick_range) * tick_range;
        tick_of_lower_side_position = tick_of_current_position - tick_range;
        tick_of_upper_side_position = tick_of_current_position + tick_range;

        
        

        
        

        console.log('Before Grid Boundary Check: tick_of_lower_side_grid_boundary_position: %d, tick_of_upper_side_grid_boundary_position: %d, amount: %d', 
                tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position, 
                (tick_of_upper_side_grid_boundary_position - tick_of_lower_side_grid_boundary_position) / tick_range + 1);

        // check and extend grid range
        if (tick_of_lower_side_position < tick_of_lower_side_grid_boundary_position) {
            if ((tick_of_upper_side_grid_boundary_position - tick_of_lower_side_position) / tick_range <= (GRID_AMOUNT_MAX - 1)) {
                tick_of_lower_side_grid_boundary_position = tick_of_lower_side_position;
            } else {
                tick_of_lower_side_grid_boundary_position = tick_of_upper_side_grid_boundary_position - tick_range * (GRID_AMOUNT_MAX - 1);
            }
        }
        if (tick_of_upper_side_position > tick_of_upper_side_grid_boundary_position) {
            if ((tick_of_upper_side_position - tick_of_lower_side_grid_boundary_position) / tick_range <= (GRID_AMOUNT_MAX - 1)) {
                tick_of_upper_side_grid_boundary_position = tick_of_upper_side_position;
            } else {
                tick_of_upper_side_grid_boundary_position = tick_of_lower_side_grid_boundary_position + tick_range * (GRID_AMOUNT_MAX - 1);
            }
        }

        console.log('After Grid Boundary Check: tick_of_lower_side_grid_boundary_position: %d, tick_of_upper_side_grid_boundary_position: %d, amount: %d', 
                tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position, 
                (tick_of_upper_side_grid_boundary_position - tick_of_lower_side_grid_boundary_position) / tick_range + 1);
        

        // fulfill map
        for (let tick = tick_of_lower_side_grid_boundary_position; tick <= tick_of_upper_side_grid_boundary_position; tick += tick_range) {
            if(!grid_info_map.has(tick)) {
                grid_info_map.set(tick, {
                    tick_lower_index: tick, 
                    tick_upper_index: tick + tick_range,
                    grid_trading_pair_ctx: undefined
                });
            }
        }
        
        




        let tick_ahead_current = 0;
        let tick_current = 0;
        let tick_previous = 0;
        let tick_behind_previous = 0;
        let grid_info_ahead_current: GridInfo | undefined = undefined;
        let grid_info_current: GridInfo | undefined = undefined;
        let grid_info_previous: GridInfo | undefined = undefined;
        let grid_info_behind_previous: GridInfo | undefined = undefined;

        grid_action_ctx = [];

        if (tick_of_current_position == tick_of_previous_position) {
            console.log('tick_of_current_position(%d) == tick_of_previous_position(%d)', tick_of_current_position, tick_of_previous_position);

            if (posInRange(tick_of_lower_side_position, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                grid_info_lower_side_position = grid_info_map.get(tick_of_lower_side_position)!;

                if (tick_of_lower_side_position != tick_of_blank_position && grid_info_lower_side_position.grid_trading_pair_ctx == undefined) {
                    let grid_trading_pair_ctx = initGridTradingPairCtx(tick_of_current_position, tick_of_lower_side_position, 0, undefined); // tick_of_current_position: virtual buy pos tick
                    grid_trading_pair_ctx.buy_position_ctx = initPositionRunningCtx(tick_of_current_position, tick_of_current_position + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());
                    grid_trading_pair_ctx.sell_position_ctx = initPositionRunningCtx(tick_of_lower_side_position, tick_of_lower_side_position + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());

                    grid_info_lower_side_position.grid_trading_pair_ctx = grid_trading_pair_ctx;
                    grid_trading_pair_ctx_map.set(grid_trading_pair_ctx.id, grid_trading_pair_ctx);

                    console.log(' = Action = OPEN_SELL_POSITION(No buy pos): tick_index: %d, pair_ctx_id: %s.', tick_of_lower_side_position, grid_trading_pair_ctx.id);

                    grid_action_ctx.push({
                        action_type: GridAction.OPEN_SELL_POSITION, 
                        tick_lower_index: tick_of_lower_side_position,
                        tick_upper_index: tick_of_lower_side_position + tick_range,
                        grid_trading_pair_ctx: grid_trading_pair_ctx,
                        cancel_out_action_idx: -1,
                        cancel_out_action_reference_position_ctx: undefined
                    });
                }
            }

            if (posInRange(tick_of_upper_side_position, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                grid_info_upper_side_position = grid_info_map.get(tick_of_upper_side_position)!;

                if (tick_of_upper_side_position != tick_of_blank_position && grid_info_upper_side_position.grid_trading_pair_ctx == undefined) {
                    let grid_trading_pair_ctx = initGridTradingPairCtx(tick_of_upper_side_position, tick_of_current_position, 1, undefined); 
                    grid_trading_pair_ctx.buy_position_ctx = initPositionRunningCtx(tick_of_upper_side_position, tick_of_upper_side_position + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());
                    grid_trading_pair_ctx.sell_position_ctx = initPositionRunningCtx(tick_of_current_position, tick_of_current_position + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());

                    grid_info_upper_side_position.grid_trading_pair_ctx = grid_trading_pair_ctx;
                    grid_trading_pair_ctx_map.set(grid_trading_pair_ctx.id, grid_trading_pair_ctx);

                    console.log(' = Action = OPEN_BUY_POSITION: tick_index: %d, pair_ctx_id: %s.', tick_of_upper_side_position, grid_trading_pair_ctx.id);

                    grid_action_ctx.push({
                        action_type: GridAction.OPEN_BUY_POSITION, 
                        tick_lower_index: tick_of_upper_side_position,
                        tick_upper_index: tick_of_upper_side_position + tick_range,
                        grid_trading_pair_ctx: grid_trading_pair_ctx,
                        cancel_out_action_idx: -1,
                        cancel_out_action_reference_position_ctx: undefined
                    });
                }
            }

        } else if (tick_of_previous_position < tick_of_current_position) {
            console.log('tick_of_previous_position(%d) < tick_of_current_position(%d)', tick_of_previous_position, tick_of_current_position);

            tick_behind_previous = tick_of_previous_position - tick_range;
            tick_previous = tick_of_previous_position;
            tick_current = tick_of_previous_position + tick_range;
            tick_ahead_current = tick_of_previous_position + 2 * tick_range;

            grid_info_behind_previous = grid_info_map.get(tick_behind_previous);
            grid_info_previous = grid_info_map.get(tick_previous);
            grid_info_current = grid_info_map.get(tick_current);
            grid_info_ahead_current = grid_info_map.get(tick_ahead_current);
            


            while (tick_previous <= tick_of_upper_side_grid_boundary_position && tick_previous < tick_of_current_position) {
                console.log('Current Circle: BP(%d) - P(%d) - C(%d) - AC(%d)', tick_behind_previous, tick_previous, tick_current, tick_ahead_current);

                // check pervious pos
                if (grid_info_previous && grid_info_previous.grid_trading_pair_ctx) {
                    switch(grid_info_previous.grid_trading_pair_ctx.state) {
                        case GridTradingPairState.Buying:
                            // remove pos
                            console.log(' = Action = CLOSE_BUY_POSITION: tick_index: %d, pair_ctx_id: %s.', tick_previous, grid_info_previous.grid_trading_pair_ctx.id);
                            grid_action_ctx.push({
                                action_type: GridAction.CLOSE_BUY_POSITION, 
                                tick_lower_index: tick_previous,
                                tick_upper_index: tick_previous + tick_range,
                                grid_trading_pair_ctx: grid_info_previous.grid_trading_pair_ctx,
                                cancel_out_action_idx: -1,
                                cancel_out_action_reference_position_ctx: undefined
                            });

                            console.log(' = State Change = : Buying -> BuyFinished, pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);

                            // update ctx
                            grid_info_previous.grid_trading_pair_ctx.state = GridTradingPairState.BuyFinished;

                            tick_of_blank_position = tick_previous;
                            console.log(' = Blank Position = : %d',tick_of_blank_position);

                            if (posInRange(tick_behind_previous, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                                if (grid_info_behind_previous) {
                                    grid_info_behind_previous.grid_trading_pair_ctx = grid_info_previous.grid_trading_pair_ctx; 

                                    // add buy pos to higher grid
                                    console.log(' = Action = OPEN_SELL_POSITION: tick_index: %d, pair_ctx_id: %s.', tick_behind_previous, grid_info_behind_previous.grid_trading_pair_ctx.id);
                                    grid_action_ctx.push({
                                        action_type: GridAction.OPEN_SELL_POSITION, 
                                        tick_lower_index: tick_behind_previous,
                                        tick_upper_index: tick_behind_previous + tick_range,
                                        grid_trading_pair_ctx: grid_info_behind_previous.grid_trading_pair_ctx,
                                        cancel_out_action_idx: -1,
                                        cancel_out_action_reference_position_ctx: undefined
                                    });
                                } else {
                                    console.log('[ERROR] previous pos buy finished but behind previous pos is empty. pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);
                                }

                            } else {
                                console.log('[ERROR] previous pos buy finished but behind previous pos is out of range. pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);
                            }

                            grid_info_previous.grid_trading_pair_ctx = undefined;
                            
                            break;
                        case GridTradingPairState.Selling:
                            // update ctx
                            console.log(' = State Change = : Selling -> BuyFinished, pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);
                            grid_info_previous.grid_trading_pair_ctx.state = GridTradingPairState.BuyFinished;
                            
                            break;
                        default:
                            // invalid state
                            console.log(' = Invalid State %s = pair_ctx_id: %s', 
                                getGridTradingPairStateStr(grid_info_previous.grid_trading_pair_ctx.state), 
                                grid_info_previous.grid_trading_pair_ctx.id);
                            break;

                    }
                }

                // check current pos
                if (posInRange(tick_current, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                    if (grid_info_current && grid_info_current.grid_trading_pair_ctx) {
                        switch(grid_info_current.grid_trading_pair_ctx.state) {
                            case GridTradingPairState.Initial:
                                console.log(' = State Change = : Initial -> Buying, pair_ctx_id: %s', grid_info_current.grid_trading_pair_ctx.id);
                                grid_info_current.grid_trading_pair_ctx.state = GridTradingPairState.Buying;
                                break;
                            default:
                                // invalid state
                                break;
                        }
                    }
                }


                // check new trading pair
                if (posInRange(tick_ahead_current, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                    if (tick_ahead_current != tick_of_blank_position && grid_info_ahead_current && grid_info_ahead_current.grid_trading_pair_ctx == undefined) {

                        let grid_trading_pair_ctx = initGridTradingPairCtx(tick_ahead_current, tick_current, 1, undefined); 
                        grid_trading_pair_ctx.buy_position_ctx = initPositionRunningCtx(tick_ahead_current, tick_ahead_current + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());
                        grid_trading_pair_ctx.sell_position_ctx = initPositionRunningCtx(tick_current, tick_current + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());


                        grid_info_ahead_current.grid_trading_pair_ctx = grid_trading_pair_ctx;
                        grid_trading_pair_ctx_map.set(grid_trading_pair_ctx.id, grid_trading_pair_ctx);

                        console.log(' = Action = OPEN_BUY_POSITION: tick_index: %d, pair_ctx_id: %s.', tick_ahead_current, grid_trading_pair_ctx.id);

                        grid_action_ctx.push({
                            action_type: GridAction.OPEN_BUY_POSITION, 
                            tick_lower_index: tick_ahead_current,
                            tick_upper_index: tick_ahead_current + tick_range,
                            grid_trading_pair_ctx: grid_trading_pair_ctx,
                            cancel_out_action_idx: -1,
                            cancel_out_action_reference_position_ctx: undefined
                        });
                    }
                }

                tick_behind_previous = tick_behind_previous + tick_range;
                tick_previous = tick_previous + tick_range;
                tick_current = tick_current + tick_range;
                tick_ahead_current = tick_ahead_current + tick_range;

                grid_info_behind_previous = grid_info_map.get(tick_behind_previous);
                grid_info_previous = grid_info_map.get(tick_previous);
                grid_info_current = grid_info_map.get(tick_current);
                grid_info_ahead_current = grid_info_map.get(tick_ahead_current);
            }

        } else { // tick_of_current_position < tick_of_previous_position
            console.log('tick_of_current_position(%d) < tick_of_previous_position(%d)', tick_of_current_position, tick_of_previous_position);

            tick_behind_previous = tick_of_previous_position + tick_range;
            tick_previous = tick_of_previous_position;
            tick_current = tick_of_previous_position - tick_range;
            tick_ahead_current = tick_of_previous_position - 2 * tick_range;

            grid_info_behind_previous = grid_info_map.get(tick_behind_previous);
            grid_info_previous = grid_info_map.get(tick_previous);
            grid_info_current = grid_info_map.get(tick_current);
            grid_info_ahead_current = grid_info_map.get(tick_ahead_current);

            while (tick_previous >= tick_of_lower_side_grid_boundary_position && tick_previous > tick_of_current_position) {

                console.log('Current Circle: AC(%d) - C(%d) - P(%d) - BP(%d)', tick_ahead_current, tick_current, tick_previous, tick_behind_previous);

                if (grid_info_previous && grid_info_previous.grid_trading_pair_ctx != undefined) {
                    switch(grid_info_previous.grid_trading_pair_ctx.state) {
                        case GridTradingPairState.Selling:

                            console.log(' = Action = CLOSE_SELL_POSITION: tick_index: %d, pair_ctx_id: %s.', tick_previous, grid_info_previous.grid_trading_pair_ctx.id);
                            // remove sell pos
                            grid_action_ctx.push({
                                action_type: GridAction.CLOSE_SELL_POSITION, 
                                tick_lower_index: tick_previous,
                                tick_upper_index: tick_previous + tick_range,
                                grid_trading_pair_ctx: grid_info_previous.grid_trading_pair_ctx,
                                cancel_out_action_idx: -1,
                                cancel_out_action_reference_position_ctx: undefined
                            });
                            console.log(' = State Change = : Selling -> SellFinished, pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);

                            // update ctx
                            grid_info_previous.grid_trading_pair_ctx.state = GridTradingPairState.SellFinished;                           

                            tick_of_blank_position = tick_previous;
                            console.log(' = Blank Position = : %d',tick_of_blank_position);

                            if (posInRange(tick_behind_previous, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                                if (grid_info_behind_previous) {
                                    let grid_trading_pair_ctx = initGridTradingPairCtx(tick_behind_previous, tick_previous, 1,  grid_info_previous.grid_trading_pair_ctx); // new buy position
                                    grid_trading_pair_ctx.buy_position_ctx = initPositionRunningCtx(tick_behind_previous, tick_behind_previous + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());
                                    grid_trading_pair_ctx.sell_position_ctx = initPositionRunningCtx(tick_previous, tick_previous + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());

                                    grid_info_behind_previous.grid_trading_pair_ctx = grid_trading_pair_ctx; // update grid_trading_pair_ctx to new object
                                    grid_trading_pair_ctx_map.set(grid_trading_pair_ctx.id, grid_trading_pair_ctx);

                                    // add buy pos to higher grid
                                    console.log(' = Action = OPEN_BUY_POSITION: tick_index: %d, pair_ctx_id: %s.', tick_behind_previous, grid_trading_pair_ctx.id);
                                    grid_action_ctx.push({
                                        action_type: GridAction.OPEN_BUY_POSITION, 
                                        tick_lower_index: tick_behind_previous,
                                        tick_upper_index: tick_behind_previous + tick_range,
                                        grid_trading_pair_ctx: grid_trading_pair_ctx,
                                        cancel_out_action_idx: -1,
                                        cancel_out_action_reference_position_ctx: undefined
                                    });
                                } else {
                                    console.log('[ERROR] previous pos sell finished but behind previous pos is empty. pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);
                                }

                            } else {
                                console.log('[ERROR] previous pos sell finished but behind previous pos is out of range. pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);
                            }

                            grid_info_previous.grid_trading_pair_ctx = undefined;
                            break;
                        case GridTradingPairState.Buying:
                            // update ctx
                            console.log(' = State Change = : Buying -> Initial, pair_ctx_id: %s', grid_info_previous.grid_trading_pair_ctx.id);
                            grid_info_previous.grid_trading_pair_ctx.state = GridTradingPairState.Initial;
                            break;
                        default:
                            // invalid state
                            console.log(' = Invalid State %s = pair_ctx_id: %s', 
                                getGridTradingPairStateStr(grid_info_previous.grid_trading_pair_ctx.state), 
                                grid_info_previous.grid_trading_pair_ctx.id);
                            break;
                    }
                }

                if (posInRange(tick_current, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                    if (grid_info_current && grid_info_current.grid_trading_pair_ctx) {
                        switch(grid_info_current.grid_trading_pair_ctx.state) {
                            case GridTradingPairState.BuyFinished:
                                console.log(' = State Change = : BuyFinished -> Selling, pair_ctx_id: %s', grid_info_current.grid_trading_pair_ctx.id);
                                grid_info_current.grid_trading_pair_ctx.state = GridTradingPairState.Selling;
                                break;
                            default:
                                // invalid state
                                break;
                        }
                    }
                }

                if (posInRange(tick_ahead_current, tick_of_lower_side_grid_boundary_position, tick_of_upper_side_grid_boundary_position)) {
                    if (tick_ahead_current != tick_of_blank_position && grid_info_ahead_current && grid_info_ahead_current.grid_trading_pair_ctx == undefined) {

                        let grid_trading_pair_ctx = initGridTradingPairCtx(tick_current, tick_ahead_current, 0, undefined); // tick_current_for_new_pair: virtual buy pos tick
                        grid_trading_pair_ctx.buy_position_ctx = initPositionRunningCtx(tick_current, tick_current + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());
                        grid_trading_pair_ctx.sell_position_ctx = initPositionRunningCtx(tick_ahead_current, tick_ahead_current + tick_range, grid_trading_pair_ctx.id, false, COIN_B_AMOUNT_EACH_GRID.toString());

                        grid_info_ahead_current.grid_trading_pair_ctx = grid_trading_pair_ctx;
                        grid_trading_pair_ctx_map.set(grid_trading_pair_ctx.id, grid_trading_pair_ctx);

                        console.log(' = Action = OPEN_SELL_POSITION(No buy pos): tick_index: %d, pair_ctx_id: %s.', tick_ahead_current, grid_trading_pair_ctx.id);

                        grid_action_ctx.push({
                            action_type: GridAction.OPEN_SELL_POSITION, 
                            tick_lower_index: tick_ahead_current,
                            tick_upper_index: tick_ahead_current + tick_range,
                            grid_trading_pair_ctx: grid_trading_pair_ctx,
                            cancel_out_action_idx: -1,
                            cancel_out_action_reference_position_ctx: undefined
                        });
                    }
                }

                tick_behind_previous = tick_behind_previous - tick_range;
                tick_previous = tick_previous - tick_range;
                tick_current = tick_current - tick_range;
                tick_ahead_current = tick_ahead_current - tick_range;

                grid_info_behind_previous = grid_info_map.get(tick_behind_previous);
                grid_info_previous = grid_info_map.get(tick_previous);
                grid_info_current = grid_info_map.get(tick_current);
                grid_info_ahead_current = grid_info_map.get(tick_ahead_current);
            }
        }








        // merge operation

        for (let i = 0; i < grid_action_ctx.length; i++) {
            for(let j = 0; j < i; j++) {
                if (grid_action_ctx[j].cancel_out_action_idx >= 0) {
                    continue;
                }
                if (grid_action_ctx[j].tick_lower_index == grid_action_ctx[i].tick_lower_index) {
                    let is_former_open = grid_action_ctx[j].action_type == GridAction.OPEN_BUY_POSITION || grid_action_ctx[j].action_type == GridAction.OPEN_SELL_POSITION;
                    let is_later_open = grid_action_ctx[i].action_type == GridAction.OPEN_BUY_POSITION || grid_action_ctx[i].action_type == GridAction.OPEN_SELL_POSITION;

                    let is_former_buy = grid_action_ctx[j].action_type == GridAction.OPEN_BUY_POSITION || grid_action_ctx[j].action_type == GridAction.CLOSE_BUY_POSITION;
                    let is_later_buy = grid_action_ctx[i].action_type == GridAction.OPEN_BUY_POSITION || grid_action_ctx[i].action_type == GridAction.CLOSE_BUY_POSITION;


                    
                    if (is_former_open != is_later_open) {
                        grid_action_ctx[j].cancel_out_action_idx = i;
                        grid_action_ctx[i].cancel_out_action_idx = j;

                        console.log(' = Cancel Out Pair = ');
                        console.log('former action: %s, id: %s, state: %s',getGridActionCtxStr(grid_action_ctx[j].action_type), 
                            grid_action_ctx[j].grid_trading_pair_ctx.id, getGridTradingPairStateStr(grid_action_ctx[j].grid_trading_pair_ctx.state));
                        console.log('later action: %s, id: %s, state: %s',getGridActionCtxStr(grid_action_ctx[i].action_type), 
                            grid_action_ctx[i].grid_trading_pair_ctx.id, getGridTradingPairStateStr(grid_action_ctx[i].grid_trading_pair_ctx.state));

                        let former_position_ctx = is_former_buy? grid_action_ctx[j].grid_trading_pair_ctx.buy_position_ctx : grid_action_ctx[j].grid_trading_pair_ctx.sell_position_ctx;
                        let later_position_ctx = is_former_buy? grid_action_ctx[i].grid_trading_pair_ctx.buy_position_ctx : grid_action_ctx[i].grid_trading_pair_ctx.sell_position_ctx;


                        // former open and later close, just use theory data 
                        if (is_former_open && !is_later_open) { 
                            former_position_ctx.id = '';
                            // later_position_ctx.id = '';

                            former_position_ctx.pair_ctx_id = grid_action_ctx[j].grid_trading_pair_ctx.id;
                            // later_position_ctx.pair_ctx_id = grid_action_ctx[i].grid_trading_pair_ctx.id;

                            // tick_lower_index = 
                            // tick_upper_index = 

                            // use est
                            former_position_ctx.liquidity_actual = former_position_ctx.liquidity_est.clone();
                            // later_position_ctx.liquidity_actual = later_position_ctx.liquidity_est.clone();

                            // no transaction actually
                            former_position_ctx.tx_info_grid_arr = [];
                            // later_position_ctx.tx_info_grid_arr = [];


                            let sui_price_upper = d(1).div(TickMath.tickIndexToPrice(former_position_ctx.tick_upper_index, 6, 9));

                            if (is_former_buy) {
                                former_position_ctx.tick_index_open = former_position_ctx.tick_lower_index;
                                former_position_ctx.coin_a_amount_open = former_position_ctx.coin_a_amount_lower_est.clone();
                                former_position_ctx.coin_b_amount_open = new BN(0);
                                former_position_ctx.liquidity_value_open = d(former_position_ctx.coin_a_amount_lower_est.toString()).mul(Decimal.pow(10, -6));
                            } else { // sell pos
                                former_position_ctx.tick_index_open = former_position_ctx.tick_upper_index;
                                former_position_ctx.coin_a_amount_open = new BN(0);
                                former_position_ctx.coin_b_amount_open = former_position_ctx.coin_b_amount_upper_est.clone();
                                former_position_ctx.liquidity_value_open = d(former_position_ctx.coin_b_amount_upper_est.toString()).mul(Decimal.pow(10, -9)).mul(sui_price_upper);
                            }


                            former_position_ctx.tick_index_latest = former_position_ctx.tick_index_open;
                            former_position_ctx.coin_a_amount_latest = former_position_ctx.coin_a_amount_open.clone();
                            former_position_ctx.coin_b_amount_latest = former_position_ctx.coin_b_amount_open.clone();
                            former_position_ctx.liquidity_value_latest = former_position_ctx.liquidity_value_open;

                            if (is_later_buy) {
                                later_position_ctx.tick_index_latest = later_position_ctx.tick_upper_index;
                                later_position_ctx.coin_a_amount_latest = new BN(0);
                                later_position_ctx.coin_b_amount_latest = later_position_ctx.coin_b_amount_upper_est.clone();
                                later_position_ctx.liquidity_value_latest = d(later_position_ctx.coin_b_amount_upper_est.toString()).mul(Decimal.pow(10, -9)).mul(sui_price_upper);
                            } else { // sell pos
                                later_position_ctx.tick_index_latest = later_position_ctx.tick_lower_index;
                                later_position_ctx.coin_a_amount_latest = later_position_ctx.coin_a_amount_lower_est.clone();
                                later_position_ctx.coin_b_amount_latest = new BN(0);
                                later_position_ctx.liquidity_value_latest = d(later_position_ctx.coin_a_amount_lower_est.toString()).mul(Decimal.pow(10, -6));
                            }

                            // no gas cost actually
                            former_position_ctx.total_gas_latest = new BN(0);
                            former_position_ctx.total_gas_value_latest = d(0);

                            later_position_ctx.total_gas_latest.iadd(new BN(0));
                            later_position_ctx.total_gas_value_latest = later_position_ctx.total_gas_value_latest.add(0);

                            // no fee and value
                            former_position_ctx.fee_and_reward_latest = newFeeAndReward();
                            former_position_ctx.fee_and_reward_value_latest = d(0);

                            later_position_ctx.fee_and_reward_latest = newFeeAndReward();
                            later_position_ctx.fee_and_reward_value_latest = d(0);
                        }


                        // former close and later open, use existing former position info
                        if (!is_former_open && is_later_open) {
                            let reference_ctx = clonePositionRunningCtx(former_position_ctx);
                            // former_position_ctx.id = reference_ctx.id;
                            later_position_ctx.id = reference_ctx.id;

                            // former_position_ctx.pair_ctx_id = grid_action_ctx[j].grid_trading_pair_ctx.id;
                            later_position_ctx.pair_ctx_id = grid_action_ctx[i].grid_trading_pair_ctx.id;

                            // tick_lower_index = 
                            // tick_upper_index = 

                            // use est
                            // former_position_ctx.liquidity_actual = reference_ctx.liquidity_actual.clone();
                            later_position_ctx.liquidity_actual = reference_ctx.liquidity_actual.clone();

                            // no transaction actually, do not change
                            // former_position_ctx.tx_info_grid_arr = [];
                            later_position_ctx.tx_info_grid_arr = [];


                            let sui_price_upper = d(1).div(TickMath.tickIndexToPrice(later_position_ctx.tick_upper_index, 6, 9));
                            let liquidity_info = estLiquidityInfoByLiquidity(later_position_ctx.tick_lower_index, later_position_ctx.tick_upper_index, reference_ctx.liquidity_actual.toString())

                            if (is_later_buy) {
                                later_position_ctx.tick_index_open = later_position_ctx.tick_lower_index;
                                later_position_ctx.coin_a_amount_open = new BN(liquidity_info.coin_a_amount_lower);
                                later_position_ctx.coin_b_amount_open = new BN(0);
                                later_position_ctx.liquidity_value_open = d(liquidity_info.coin_a_amount_lower).mul(Decimal.pow(10, -6));
                            } else { // sell pos
                                later_position_ctx.tick_index_open = later_position_ctx.tick_upper_index;
                                later_position_ctx.coin_a_amount_open = new BN(0);
                                later_position_ctx.coin_b_amount_open = new BN(liquidity_info.coin_b_amount_upper);
                                later_position_ctx.liquidity_value_open = d(liquidity_info.coin_b_amount_upper).mul(Decimal.pow(10, -9)).mul(sui_price_upper);
                            }


                            later_position_ctx.tick_index_latest = later_position_ctx.tick_index_open;
                            later_position_ctx.coin_a_amount_latest = later_position_ctx.coin_a_amount_open.clone();
                            later_position_ctx.coin_b_amount_latest = later_position_ctx.coin_b_amount_open.clone();
                            later_position_ctx.liquidity_value_latest = later_position_ctx.liquidity_value_open;


                            if (is_former_buy) {
                                former_position_ctx.tick_index_latest = former_position_ctx.tick_upper_index;
                                former_position_ctx.coin_a_amount_latest = new BN(0);
                                former_position_ctx.coin_b_amount_latest = new BN(liquidity_info.coin_b_amount_upper);
                                former_position_ctx.liquidity_value_latest = d(liquidity_info.coin_b_amount_upper).mul(Decimal.pow(10, -9)).mul(sui_price_upper);
                            } else {
                                former_position_ctx.tick_index_latest = former_position_ctx.tick_lower_index;
                                former_position_ctx.coin_a_amount_latest = new BN(liquidity_info.coin_a_amount_lower)
                                former_position_ctx.coin_b_amount_latest = new BN(0);
                                former_position_ctx.liquidity_value_latest = d(liquidity_info.coin_a_amount_lower).mul(Decimal.pow(10, -6));
                            }

                            // no gas cost actually
                            former_position_ctx.total_gas_latest.iadd(new BN(0));
                            former_position_ctx.total_gas_value_latest = former_position_ctx.total_gas_value_latest.add(0);

                            later_position_ctx.total_gas_latest = new BN(0)
                            later_position_ctx.total_gas_value_latest = d(0);

                            // do not take over fee and rwd
                            former_position_ctx.fee_and_reward_latest = newFeeAndReward();
                            former_position_ctx.fee_and_reward_value_latest = d(0);

                            // take over fee and rwd
                            later_position_ctx.fee_and_reward_latest = cloneFeeAndReward(reference_ctx.fee_and_reward_latest);
                            later_position_ctx.fee_and_reward_value_latest = reference_ctx.fee_and_reward_value_latest;
                        }
                    } else {
                        // nothing to do
                    }
                } // if (grid_action_ctx[j].tick_lower_index == grid_action_ctx[i].tick_lower_index) 
            }
        }







        


        


        for (const grid_action of grid_action_ctx) {
            console.log('Action Process: %s, id: %s, state: %s %s', 
                getGridActionCtxStr(grid_action.action_type), 
                grid_action.grid_trading_pair_ctx.id, 
                getGridTradingPairStateStr(grid_action.grid_trading_pair_ctx.state),
                grid_action.cancel_out_action_idx >= 0 ? '(in cancel pair)' : ''
            );

            if (grid_action.action_type == GridAction.OPEN_BUY_POSITION || grid_action.action_type == GridAction.OPEN_SELL_POSITION) {     
                total_gas_fee_accumulate = new BN(0);
                tx_info_arr = [];
                let buy_position = (grid_action.action_type == GridAction.OPEN_BUY_POSITION);
                let position_ctx = buy_position? grid_action.grid_trading_pair_ctx.buy_position_ctx : grid_action.grid_trading_pair_ctx.sell_position_ctx;
                if (grid_action.cancel_out_action_idx < 0) {
                    // get check_point_status
                    let wallet_balance: AllCoinAmounts = {usdc_amount: '0', sui_amount: '0', cetus_amount: '0'};
                    while(true) {
                        try {
                            wallet_balance = await getAllWalletBalance(account_address);
                            console.log('wallet_balance: usdc %s, sui %s, cetus %s', 
                                wallet_balance.usdc_amount, 
                                wallet_balance.sui_amount, 
                                wallet_balance.cetus_amount);
                        } catch(e) {
                            if (e instanceof Error) {
                                console.error('%s [error] getAllWalletBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                            } else {
                                console.error('getAllWalletBalance get an exception'); 
                                console.error(e);
                            }
                            await new Promise(f => setTimeout(f, 500));
                            continue;
                        }
                        break;
                    }

                    let coin_a_amount_quota = new BN(0);
                    let coin_b_amount_quota = new BN(0);
                    if (grid_action.action_type == GridAction.OPEN_BUY_POSITION) {
                        coin_a_amount_quota = grid_action.grid_trading_pair_ctx.buy_position_ctx.coin_a_amount_lower_est.add(USDC_RESERVED);
                        coin_b_amount_quota = grid_action.grid_trading_pair_ctx.buy_position_ctx.coin_b_amount_upper_est.add(SUI_RESERVED);
                    } else {
                        coin_a_amount_quota = grid_action.grid_trading_pair_ctx.sell_position_ctx.coin_a_amount_lower_est.add(USDC_RESERVED);
                        coin_b_amount_quota = grid_action.grid_trading_pair_ctx.sell_position_ctx.coin_b_amount_upper_est.add(SUI_RESERVED);
                    }

                    let coin_a_amount_in_wallet = new BN(wallet_balance.usdc_amount);
                    let coin_b_amount_in_wallet = new BN(wallet_balance.sui_amount);

                    let rebalance_info = getRebalanceInfo(coin_a_amount_in_wallet, coin_b_amount_in_wallet, coin_a_amount_quota, coin_b_amount_quota, current_tick_index);
                    console.log('coin_a_amount_quota: %s = coin_a_amount_lower_est: %s + USDC_RESERVED: %s', 
                        coin_a_amount_quota.toString(),
                        coin_a_amount_quota.sub(USDC_RESERVED).toString(),
                        USDC_RESERVED.toString()
                    );
                    console.log('coin_b_amount_quota: %s = coin_b_amount_upper_est: %s + SUI_RESERVED: %s', 
                        coin_b_amount_quota.toString(),
                        coin_b_amount_quota.sub(SUI_RESERVED).toString(),
                        SUI_RESERVED.toString()
                    );
                    console.log('rebalance_info.valid: %d, rebalance_info.need_swap: %d, rebalance_info.a2b: %d, amount_in: %s, amount_out: %s', 
                        rebalance_info.valid, 
                        rebalance_info.need_swap, 
                        rebalance_info.a2b,
                        rebalance_info.amount_in.toString(), 
                        rebalance_info.amount_out.toString());

                    if (rebalance_info.valid && rebalance_info.need_swap) {
                        // perform swap and add liquidity as soon as possible, then check merge coin
                        // let from = (grid_action.action_type == GridAction.OPEN_BUY_POSITION) ? COIN_TYPE_ADDRESS_SUI : COIN_TYPE_ADDRESS_USDC;
                        // let target = (grid_action.action_type == GridAction.OPEN_BUY_POSITION) ? COIN_TYPE_ADDRESS_USDC : COIN_TYPE_ADDRESS_SUI;
                        let from = rebalance_info.a2b ? COIN_TYPE_ADDRESS_USDC : COIN_TYPE_ADDRESS_SUI;
                        let target = rebalance_info.a2b ? COIN_TYPE_ADDRESS_SUI : COIN_TYPE_ADDRESS_USDC;

                        // perform swap
                        while(true) {
                            let digest_swap = '';
                            let tx_rsp = await aggregatorSwap(
                                from,
                                target,
                                rebalance_info.amount_in,
                                true,
                                sendKeypair
                            );

                            if (tx_rsp == undefined) {
                                console.log('[error] Swap: exception exceed retry time, wait 2s and try again...'); 
                                await new Promise(f => setTimeout(f, 2000));
                                continue;
                            }

                            // success or failed(maybe insufficient gas) tx with gas use
                            digest_swap = tx_rsp.digest;

                            // get swap transaction info
                            tx_info_aggregator_swap = newTransactionInfo();
                            let tx_opt_swap: TransactionInfoQueryOptions = {
                                get_total_gas_fee: true,
                                get_balance_change: true,
                                get_add_liquidity_event: false,
                                get_remove_liquidity_event: false,
                                get_fee_and_rwd: false   
                            };
                            await getTransactionInfo(digest_swap, tx_info_aggregator_swap, tx_opt_swap, sendKeypair);
                            tx_info_aggregator_swap.type = 'aggregator_swap';

                            tx_info_arr.push(cloneTransactionInfo(tx_info_aggregator_swap));
                            
                            // gas_fee_accumulate
                            total_gas_fee_accumulate.iadd(tx_info_aggregator_swap.total_gas_fee);
                            console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());

                            // gas_fee_value_accumulate



                            // dump add_liquidity transaction info
                            console.log('');
                            dumpTransactionInfo('Aggregator Swap Transaction Rsp', tx_info_aggregator_swap, tx_opt_swap);

                            if (tx_rsp.effects?.status.status !== "success") {
                                console.log('[error] Swap: client.signAndExecuteTransaction return failed, wait 2s and try again...'); 
                                await new Promise(f => setTimeout(f, 2000));
                                continue;
                            }

                            break;
                        }
                    }


                    let fix_amount_a = false;
                    let coin_a_amount_to_add = new BN(0);
                    let coin_b_amount_to_add = new BN(0);
                    if (grid_action.action_type == GridAction.OPEN_BUY_POSITION) {
                        fix_amount_a = true;
                        coin_a_amount_to_add = grid_action.grid_trading_pair_ctx.buy_position_ctx.coin_a_amount_lower_est.clone();
                        coin_b_amount_to_add = coin_b_amount_quota.clone();
                    } else {
                        fix_amount_a = false;
                        coin_a_amount_to_add = coin_a_amount_quota.clone();
                        coin_b_amount_to_add = grid_action.grid_trading_pair_ctx.sell_position_ctx.coin_b_amount_upper_est.clone();
                    }

                    while(true) {
                        // perform add liquidity
                        let digest_add_liquidity = '';
        
                        const add_liquidity_payload_params: AddLiquidityFixTokenParams = {
                            coin_type_a: pools_running[0].coin_type_a,
                            coin_type_b: pools_running[0].coin_type_b,
                            pool_id: pools_running[0].id,
                            tick_lower: grid_action.tick_lower_index,
                            tick_upper: grid_action.tick_upper_index,
                            fix_amount_a,
                            amount_a: coin_a_amount_to_add.toString(),
                            amount_b: coin_b_amount_to_add.toString(),
                            slippage: SLIPPAGE_FOR_ADD_LIQUIDITY,
                            is_open: true,
                            pos_id: '',
                            rewarder_coin_types: [],
                            collect_fee: false,
                        }
        
        
                        let tx_rsp: SuiTransactionBlockResponse | undefined = undefined;
                        let retry_times = 5;
                        while (true) {
                            try { // can not recover, process from the begining again
                                const add_liquidity_payload = await cetusClmmSDK.Position.createAddLiquidityFixTokenPayload(add_liquidity_payload_params);
                                dumpSDKRet2Logfile('Add Liquidity: cetusClmmSDK.Position.createAddLiquidityFixTokenPayload', JSON.stringify(add_liquidity_payload, null, 2));
                                console.log('[%s] - cetusClmmSDK.Position.createAddLiquidityFixTokenPayload - ', date.toLocaleString());
        
                                tx_rsp = await cetusClmmSDK.FullClient.sendTransaction(sendKeypair, add_liquidity_payload);
                                dumpSDKRet2Logfile('Add Liquidity: cetusClmmSDK.FullClient.sendTransaction', JSON.stringify(tx_rsp, null, 2));
                                console.log('[%s] - cetusClmmSDK.FullClient.sendTransaction: %s - ', date.toLocaleString(), tx_rsp?.effects?.status.status);
                                
                            } catch (e) {
                                if (e instanceof Error) {
                                    console.error('%s [error] Add Liquidity get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                                } else {
                                    console.error('[error] Add Liquidity get an exception'); 
                                    console.error(e);
                                }
                                if (retry_times <= 0) {
                                    console.error('no retry_times remains, return undefined. rebalance again');
                                    tx_rsp = undefined;
                                    break;
                                }
                                console.error('wait 2s and try again..., remain times: ', retry_times); 
                                await new Promise(f => setTimeout(f, 2000));
                                retry_times = retry_times - 1;
                                continue;
                            }
                            break;
                        }
        
                        if (tx_rsp == undefined) {
                            console.log('[error] Add Liquidity: cetusClmmSDK.FullClient.sendTransaction return undefined | exception exceed retry time, wait 2s and rebalance again...');
                            await new Promise(f => setTimeout(f, 2000));
        
                            continue;
                        }
        
        
                        digest_add_liquidity = tx_rsp.digest;
        
                        // get add_liquidity transaction info
                        tx_info_add_liquidity = newTransactionInfo();
                        let tx_opt_add_liquidity: TransactionInfoQueryOptions = {
                            get_total_gas_fee: true,
                            get_balance_change: true,
                            get_add_liquidity_event: true,
                            get_remove_liquidity_event: false,
                            get_fee_and_rwd: false   
                        };
                        await getTransactionInfo(digest_add_liquidity, tx_info_add_liquidity, tx_opt_add_liquidity, sendKeypair);
                        tx_info_add_liquidity.type = 'add_liquidity';                
        
                        tx_info_arr.push(cloneTransactionInfo(tx_info_add_liquidity));
                        
        
                        total_gas_fee_accumulate.iadd(tx_info_add_liquidity.total_gas_fee);
                        console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());
        
                        // dump add_liquidity transaction info
                        console.log('');
                        dumpTransactionInfo('Add Liquidity Transaction Rsp', tx_info_add_liquidity, tx_opt_add_liquidity);

                        if (tx_rsp?.effects?.status.status !== "success") {
                            console.log('[error] Add Liquidity: cetusClmmSDK.FullClient.sendTransaction return failed, wait 2s and rebalance again...');
                            await new Promise(f => setTimeout(f, 2000));
                            
                            continue;
                        }

                        break;
                    }

                    // mock data
                    // if (buy_position) {                        
                    //     tx_info_add_liquidity.liquidity_event.amount_a = position_ctx.coin_a_amount_lower_est.clone();
                    //     tx_info_add_liquidity.liquidity_event.amount_b = new BN(0);                        
                    // } else {
                    //     tx_info_add_liquidity.liquidity_event.amount_a = new BN(0);
                    //     tx_info_add_liquidity.liquidity_event.amount_b = position_ctx.coin_b_amount_upper_est.clone();
                    // }
                    // tx_info_add_liquidity.liquidity_event.after_liquidity = position_ctx.liquidity_est.clone();
                    // tx_info_add_liquidity.liquidity_event.liquidity = new BN(0);
                    // tx_info_add_liquidity.liquidity_event.position = 'test_pos';

                    // total_gas_fee_accumulate = new BN('10000000');



                    position_ctx.id = tx_info_add_liquidity.liquidity_event.position;
                    position_ctx.pair_ctx_id = grid_action.grid_trading_pair_ctx.id;
                    // position_ctx.tick_lower_index = 
                    // position_ctx.tick_upper_index = 

                    position_ctx.liquidity_actual = tx_info_add_liquidity.liquidity_event.after_liquidity.clone();
                    for (const tx_info of tx_info_arr) {
                        position_ctx.tx_info_grid_arr.push(cloneTransactionInfo(tx_info));
                    }
                    tx_info_arr_length_last = tx_info_arr.length;


                    let tick_when_add_liquidity = estAddCloseLiquidityTickIndex(position_ctx.tick_lower_index, position_ctx.tick_upper_index, tx_info_add_liquidity.liquidity_event, 1);
                    if (tick_when_add_liquidity <= position_ctx.tick_lower_index || tick_when_add_liquidity >= position_ctx.tick_upper_index) {
                        tick_when_add_liquidity = await getCurrentTickIndex(POOL_ADDRESS);
                    }
                    position_ctx.tick_index_open = tick_when_add_liquidity;
                    position_ctx.coin_a_amount_open = tx_info_add_liquidity.liquidity_event.amount_a.clone();
                    position_ctx.coin_b_amount_open = tx_info_add_liquidity.liquidity_event.amount_b.clone();                    

                    let sui_price = d(1).div(TickMath.tickIndexToPrice(tick_when_add_liquidity, 6, 9));
                    position_ctx.liquidity_value_open = d(tx_info_add_liquidity.liquidity_event.amount_a.toString()).mul(Decimal.pow(10, -6)).add(
                        d(tx_info_add_liquidity.liquidity_event.amount_b.toString()).mul(Decimal.pow(10, -9)).mul(sui_price)
                    );
                    // console.log('buy_position: %d, tick: %d, coin_a_amount_open: %s, coin_b_amount_open: %s, sui_price: %s, liquidity_value_open: %s', 
                    //     buy_position, position_ctx.tick_index_open, 
                    //     position_ctx.coin_a_amount_open.toString(), position_ctx.coin_b_amount_open.toString(),
                    //     sui_price, position_ctx.liquidity_value_open.toString()
                    // );

                    
                    position_ctx.tick_index_latest = position_ctx.tick_index_open;
                    position_ctx.coin_a_amount_latest = position_ctx.coin_a_amount_open.clone();
                    position_ctx.coin_b_amount_latest = position_ctx.coin_b_amount_open.clone();
                    position_ctx.liquidity_value_latest = position_ctx.liquidity_value_open;


                    position_ctx.total_gas_latest.iadd(total_gas_fee_accumulate);
                    let value_plus = position_ctx.total_gas_value_latest.add(d(total_gas_fee_accumulate.toString()).mul(Decimal.pow(10, -9)).mul(sui_price));
                    position_ctx.total_gas_value_latest = value_plus; // approximately

                    // no fee and rwd when open
                    // position_ctx.fee_and_reward_latest = 
                    // position_ctx.fee_and_reward_value_latest = 
                }
            } else if (grid_action.action_type == GridAction.CLOSE_BUY_POSITION || grid_action.action_type == GridAction.CLOSE_SELL_POSITION) {
                tx_info_arr = [];
                total_gas_fee_accumulate = new BN(0);
                let buy_position = (grid_action.action_type == GridAction.CLOSE_BUY_POSITION);
                let position_ctx = buy_position? grid_action.grid_trading_pair_ctx.buy_position_ctx : grid_action.grid_trading_pair_ctx.sell_position_ctx;

                if (grid_action.cancel_out_action_idx < 0) {                    
                    pools_close_position = null;
                    while(true) {
                        try {
                            pools_close_position = await cetusClmmSDK.Pool.getAssignPools([POOL_ADDRESS]);
                            if (pools_close_position == null || pools_close_position.length <= 0) {
                                console.log('[ERROR] can not retrive pool info with getAssignPools, wait and try again...');
                                await new Promise(f => setTimeout(f, 500));
                                continue;
                            }
                        } catch (e) {
                            if (e instanceof Error) {
                                console.error('%s [error] getAssignPools get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                            } else {
                                console.error('getAssignPools get an exception'); 
                                console.error(e);
                            }
                            console.error('wait and try again...'); 
                            await new Promise(f => setTimeout(f, 500));
                            continue;
                        }
                        break;
                    }


                    let pos_object_id = '';
                    if (grid_action.action_type == GridAction.CLOSE_BUY_POSITION) {
                        pos_object_id = grid_action.grid_trading_pair_ctx.buy_position_ctx.id;
                    } else {
                        pos_object_id = grid_action.grid_trading_pair_ctx.sell_position_ctx.id;
                    }


                    while(true) {
                        // close position
                        let tx_rsp = await closePosition(pools_close_position[0], pos_object_id, sendKeypair);

                        if (tx_rsp == undefined) { // exception exceed retry times
                            console.log('[error] Close Position: cetusClmmSDK.FullClient.sendTransaction exception exceed retry time, wait 2s and try again...');
                            await new Promise(f => setTimeout(f, 2000));
                            continue;
                        }


                        let digest_close_position = tx_rsp.digest;
                        // get close transaction info
                        tx_info_close_position = newTransactionInfo();
                        let tx_opt_close_position: TransactionInfoQueryOptions = {
                            get_total_gas_fee: true,
                            get_balance_change: true,
                            get_add_liquidity_event: false, 
                            get_remove_liquidity_event: true,
                            get_fee_and_rwd: true
                        };

                        await getTransactionInfo(digest_close_position, tx_info_close_position, tx_opt_close_position, sendKeypair);
                        tx_info_close_position.type = 'close_position';

                        tx_info_arr.push(cloneTransactionInfo(tx_info_close_position));

                        total_gas_fee_accumulate.iadd(tx_info_close_position.total_gas_fee);
                        console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());

                        // dump close transaction info
                        console.log('');
                        dumpTransactionInfo('Close Position Transaction Rsp', tx_info_close_position, tx_opt_close_position);


                        if (tx_rsp?.effects?.status.status !== "success") {
                            console.log('[error] Close Position: cetusClmmSDK.FullClient.sendTransaction return failed, wait 2s and try again...');
                            await new Promise(f => setTimeout(f, 2000));
                            continue;
                        }
                        break;
                    }


                    // mock data
                    // if (buy_position) {                        
                    //     tx_info_add_liquidity.liquidity_event.amount_a = new BN(0);
                    //     tx_info_add_liquidity.liquidity_event.amount_b = position_ctx.coin_b_amount_upper_est.clone();
                    // } else {
                    //     tx_info_add_liquidity.liquidity_event.amount_a = position_ctx.coin_a_amount_lower_est.clone();
                    //     tx_info_add_liquidity.liquidity_event.amount_b = new BN(0);
                    // }
                    // tx_info_add_liquidity.liquidity_event.after_liquidity = new BN(0);
                    // tx_info_add_liquidity.liquidity_event.liquidity = position_ctx.liquidity_est.clone();new BN(0);
                    // tx_info_add_liquidity.liquidity_event.position = 'test_pos';

                    // total_gas_fee_accumulate = new BN('10000000');

                    // tx_info_close_position.fee_and_reward.fee_owned_a = new BN('100');
                    // tx_info_close_position.fee_and_reward.fee_owned_b = new BN('200000');
                    // tx_info_close_position.fee_and_reward.rwd_owned_sui = new BN('300000');
                    // tx_info_close_position.fee_and_reward.rwd_owned_cetus = new BN('400000');






                    // position_ctx.id = tx_info_add_liquidity.liquidity_event.position;
                    // position_ctx.pair_ctx_id = grid_action.grid_trading_pair_ctx.id;
                    // position_ctx.tick_lower_index = 
                    // position_ctx.tick_upper_index = 

                    // position_ctx.liquidity_actual = tx_info_add_liquidity.liquidity_event.after_liquidity.clone();
                    for (const tx_info of tx_info_arr) {
                        position_ctx.tx_info_grid_arr.push(cloneTransactionInfo(tx_info));
                    }
                    tx_info_arr_length_last = tx_info_arr.length;


                    // let tick_when_add_liquidity = estAddCloseLiquidityTickIndex( position_ctx.tick_lower_index, position_ctx.tick_upper_index, tx_info_add_liquidity.liquidity_event, 1);
                    // if (tick_when_add_liquidity <= position_ctx.tick_lower_index || tick_when_add_liquidity >= position_ctx.tick_upper_index) {
                    //     tick_when_add_liquidity = await getCurrentTickIndex(POOL_ADDRESS);
                    // }
                    // position_ctx.tick_index_open = tick_when_add_liquidity;
                    // position_ctx.coin_a_amount_open = tx_info_add_liquidity.liquidity_event.amount_a.clone();
                    // position_ctx.coin_b_amount_open = tx_info_add_liquidity.liquidity_event.amount_b.clone();

                    // let sui_price = d(1).div(TickMath.tickIndexToPrice(tick_when_add_liquidity, 6, 9));
                    // position_ctx.liquidity_value_open = d(tx_info_add_liquidity.liquidity_event.amount_a.toString()).mul(Decimal.pow(10, -6).add(
                    //     d(tx_info_add_liquidity.liquidity_event.amount_b.toString()).mul(Decimal.pow(10, -9)).mul(sui_price)
                    // ));


                    let tick_when_add_close_liquidity = estAddCloseLiquidityTickIndex( position_ctx.tick_lower_index, position_ctx.tick_upper_index, tx_info_close_position.liquidity_event, 0);
                    if (tick_when_add_close_liquidity <= position_ctx.tick_lower_index || tick_when_add_close_liquidity >= position_ctx.tick_upper_index) {
                        tick_when_add_close_liquidity = await getCurrentTickIndex(POOL_ADDRESS);
                    }
                    let sui_price = d(1).div(TickMath.tickIndexToPrice(tick_when_add_close_liquidity, 6, 9));

                    // now                    
                    position_ctx.tick_index_latest = tick_when_add_close_liquidity
                    position_ctx.coin_a_amount_latest = tx_info_close_position.liquidity_event.amount_a.clone();
                    position_ctx.coin_b_amount_latest = tx_info_close_position.liquidity_event.amount_b.clone();
                    position_ctx.liquidity_value_latest = d(tx_info_close_position.liquidity_event.amount_a.toString()).mul(Decimal.pow(10, -6).add(
                        d(tx_info_close_position.liquidity_event.amount_b.toString()).mul(Decimal.pow(10, -9)).mul(sui_price)
                    ));

                    
                    position_ctx.total_gas_latest.iadd(total_gas_fee_accumulate);
                    let value_plus = position_ctx.total_gas_value_latest.add(d(total_gas_fee_accumulate.toString()).mul(Decimal.pow(10, -9)).mul(sui_price));
                    position_ctx.total_gas_value_latest = value_plus; // approximately

                    
                    position_ctx.fee_and_reward_latest = cloneFeeAndReward(tx_info_close_position.fee_and_reward);

                    let cetus_tick_when_add_close_liquidity = await getCurrentTickIndex(POOL_ADDRESS_FOR_FEE);
                    let cetus_price = d(1).div(TickMath.tickIndexToPrice(cetus_tick_when_add_close_liquidity, 6, 9));
                    let final_fee_and_reward_value_when_close = getFeeAndRewardValue(sui_price, cetus_price, tx_info_close_position.fee_and_reward).total_value;
                    position_ctx.fee_and_reward_value_latest = final_fee_and_reward_value_when_close;
                }
            }
        } // for (const grid_action of grid_action_ctx)

        tick_of_previous_position = tick_of_current_position;







        // get check_point_status
        let wallet_balance: AllCoinAmounts = {usdc_amount: '0', sui_amount: '0', cetus_amount: '0'};
        while(true) {
            try {
                wallet_balance = await getAllWalletBalance(account_address);
                // console.log('wallet_balance: usdc %s, sui %s, cetus %s', 
                //     wallet_balance.usdc_amount, 
                //     wallet_balance.sui_amount, 
                //     wallet_balance.cetus_amount);
            } catch(e) {
                if (e instanceof Error) {
                    console.error('%s [error] getAllWalletBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getAllWalletBalance get an exception'); 
                    console.error(e);
                }
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }

        let cetus_amount = new BN(wallet_balance.cetus_amount);
        console.log('cetus_amount: %s', cetus_amount.toString());
        if (cetus_amount.gt(new BN('100').mul(new BN('1000000000')))) { // 100 cetus
            // swap cetus to usdc
            while(true) {
        
                let digest_post_process = '';

                let tx_rsp = await aggregatorSwap(
                    COIN_TYPE_ADDRESS_CETUS,
                    COIN_TYPE_ADDRESS_USDC,
                    cetus_amount.clone(),
                    true,
                    sendKeypair
                );

                if (tx_rsp == undefined) {
                    console.log('[error] Post Process Aggregator Swap: exception exceed retry time, wait 2s and try again...'); 
                    await new Promise(f => setTimeout(f, 2000));
                    continue;
                }

                // success or failed(maybe insufficient gas) tx with gas use
                digest_post_process = tx_rsp.digest;

                // get swap transaction info
                tx_info_cetus_aggregator_swap = newTransactionInfo();
                let tx_opt_post_process: TransactionInfoQueryOptions = {
                    get_total_gas_fee: true,
                    get_balance_change: true,
                    get_add_liquidity_event: false,
                    get_remove_liquidity_event: false,
                    get_fee_and_rwd: false   
                };
                await getTransactionInfo(digest_post_process, tx_info_cetus_aggregator_swap, tx_opt_post_process, sendKeypair);
                tx_info_cetus_aggregator_swap.type = 'cetus_aggregator_swap';

                tx_info_arr.push(cloneTransactionInfo(tx_info_cetus_aggregator_swap));

                total_gas_fee_accumulate.iadd(tx_info_cetus_aggregator_swap.total_gas_fee);
                console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());

                total_util_gas_now.iadd(tx_info_cetus_aggregator_swap.total_gas_fee);
                let current_tick_index = await getCurrentTickIndex(POOL_ADDRESS);
                let sui_price = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));
                total_util_gas_value_now = total_util_gas_value_now.add(d(tx_info_cetus_aggregator_swap.total_gas_fee.toString()).mul(Decimal.pow(10, -9)).mul(sui_price));

                // dump add_liquidity transaction info
                console.log('');
                dumpTransactionInfo('Post Process Aggregator Swap Transaction Rsp', tx_info_cetus_aggregator_swap, tx_opt_post_process);

                if (tx_rsp.effects?.status.status !== "success") {
                    console.log('[error] Post Process Aggregator Swap: client.signAndExecuteTransaction return failed, wait 2s and try again...'); 
                    await new Promise(f => setTimeout(f, 2000));

                    continue;
                }
                break;
            }
        }



        // check and perform coin merge for usdc
        let coin_balance: CoinBalance | undefined = undefined;
        while(true) {
            try {
                coin_balance = await cetusClmmSDK.FullClient.getBalance({
                    owner: account_address,
                    coinType: COIN_TYPE_ADDRESS_USDC
                });
            } catch(e) {
                if (e instanceof Error) {
                    console.error('%s [error] getBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getBalance get an exception'); 
                    console.error(e);
                }
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }

        console.log('usdc coinObjectCount: %d', coin_balance.coinObjectCount);
        if (coin_balance && coin_balance.coinObjectCount >= 50) {
            let coins_object_usdc = await getCoins(account_address, COIN_TYPE_ADDRESS_USDC);
            if (coins_object_usdc.length){
                let tx_rsp = await mergeCoin(coins_object_usdc, sendKeypair);
                if (tx_rsp == undefined) {
                    console.log('mergeCoin USDC tx_rsp = null, process continue.'); 
                } else {
                    // success or failed(maybe insufficient gas) tx with gas use

                    // get swap transaction info
                    tx_info_merge_coin_usdc = newTransactionInfo();
                    let tx_opt_merge_coin_usdc: TransactionInfoQueryOptions = {
                        get_total_gas_fee: true,
                        get_balance_change: true,
                        get_add_liquidity_event: false,
                        get_remove_liquidity_event: false,
                        get_fee_and_rwd: false   
                    };
                    await getTransactionInfo(tx_rsp.digest, tx_info_merge_coin_usdc, tx_opt_merge_coin_usdc, sendKeypair);
                    tx_info_merge_coin_usdc.type = 'merge_coin_usdc';

                    tx_info_arr.push(cloneTransactionInfo(tx_info_merge_coin_usdc));

                    total_gas_fee_accumulate.iadd(tx_info_merge_coin_usdc.total_gas_fee);
                    console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());

                    total_util_gas_now.iadd(tx_info_merge_coin_usdc.total_gas_fee);
                    let current_tick_index = await getCurrentTickIndex(POOL_ADDRESS);
                    let sui_price = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));
                    total_util_gas_value_now = total_util_gas_value_now.add(d(tx_info_merge_coin_usdc.total_gas_fee.toString()).mul(Decimal.pow(10, -9)).mul(sui_price));

                    // dump add_liquidity transaction info
                    console.log('');
                    dumpTransactionInfo('Merge Coin USDC Transaction Rsp', tx_info_merge_coin_usdc, tx_opt_merge_coin_usdc);

                    if (tx_rsp.effects?.status.status === 'failure') {
                        console.log('mergeCoin USDC mergeCoin return failure, process continue.');
                    }
                }
            }
        }
    
        // check and perform coin merge for sui
        coin_balance = undefined;
        while(true) {
            try {
                coin_balance = await cetusClmmSDK.FullClient.getBalance({
                    owner: account_address,
                    coinType: COIN_TYPE_ADDRESS_SUI
                });
            } catch(e) {
                if (e instanceof Error) {
                    console.error('%s [error] getBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getBalance get an exception'); 
                    console.error(e);
                }
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }
        console.log('sui coinObjectCount: %d', coin_balance.coinObjectCount);
        if (coin_balance && coin_balance.coinObjectCount >= 50) {                    
            let coins_object_sui = await getCoins(account_address, COIN_TYPE_ADDRESS_SUI);
            if (coins_object_sui.length){
                let tx_rsp = await mergeCoin(coins_object_sui, sendKeypair);
                if (tx_rsp == undefined) {
                    console.log('mergeCoin SUI tx_rsp = null, process continue.'); 
                } else {
                    // success or failed(maybe insufficient gas) tx with gas use

                    // get swap transaction info
                    tx_info_merge_coin_sui = newTransactionInfo();
                    let tx_opt_merge_coin_sui: TransactionInfoQueryOptions = {
                        get_total_gas_fee: true,
                        get_balance_change: true,
                        get_add_liquidity_event: false,
                        get_remove_liquidity_event: false,
                        get_fee_and_rwd: false   
                    };
                    await getTransactionInfo(tx_rsp.digest, tx_info_merge_coin_sui, tx_opt_merge_coin_sui, sendKeypair);
                    tx_info_merge_coin_sui.type = 'merge_coin_sui';

                    tx_info_arr.push(cloneTransactionInfo(tx_info_merge_coin_sui));

                    total_gas_fee_accumulate.iadd(tx_info_merge_coin_sui.total_gas_fee);
                    console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());

                    total_util_gas_now.iadd(tx_info_merge_coin_sui.total_gas_fee);
                    let current_tick_index = await getCurrentTickIndex(POOL_ADDRESS);
                    let sui_price = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));
                    total_util_gas_value_now = total_util_gas_value_now.add(d(tx_info_merge_coin_sui.total_gas_fee.toString()).mul(Decimal.pow(10, -9)).mul(sui_price));

                    // dump add_liquidity transaction info
                    console.log('');
                    dumpTransactionInfo('Merge Coin SUI Transaction Rsp', tx_info_merge_coin_sui, tx_opt_merge_coin_sui);

                    if (tx_rsp.effects?.status.status === 'failure') {
                        console.log('mergeCoin SUI mergeCoin return failure, process continue.');
                    }
                }
            }
        }        


        // check and perform coin merge for cetus
        coin_balance = undefined;
        while(true) {
            try {
                coin_balance = await cetusClmmSDK.FullClient.getBalance({
                    owner: account_address,
                    coinType: COIN_TYPE_ADDRESS_CETUS
                });
            } catch(e) {
                if (e instanceof Error) {
                    console.error('%s [error] getBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getBalance get an exception'); 
                    console.error(e);
                }
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }
        console.log('cetus coinObjectCount: %d', coin_balance.coinObjectCount);
        if (coin_balance && coin_balance.coinObjectCount >= 50) {
            let coins_object_cetus = await getCoins(account_address, COIN_TYPE_ADDRESS_CETUS);
            if (coins_object_cetus.length){
                let tx_rsp = await mergeCoin(coins_object_cetus, sendKeypair);
                if (tx_rsp == undefined) {
                    console.log('mergeCoin CETUS tx_rsp = null, process continue.'); 
                } else {
                    // get swap transaction info
                    tx_info_merge_coin_cetus = newTransactionInfo();
                    let tx_opt_merge_coin_cetus: TransactionInfoQueryOptions = {
                        get_total_gas_fee: true,
                        get_balance_change: true,
                        get_add_liquidity_event: false,
                        get_remove_liquidity_event: false,
                        get_fee_and_rwd: false   
                    };
                    await getTransactionInfo(tx_rsp.digest, tx_info_merge_coin_cetus, tx_opt_merge_coin_cetus, sendKeypair);
                    tx_info_merge_coin_cetus.type = 'merge_coin_cetus';

                    tx_info_arr.push(cloneTransactionInfo(tx_info_merge_coin_cetus));

                    total_gas_fee_accumulate.iadd(tx_info_merge_coin_cetus.total_gas_fee);
                    console.log('total_gas_fee_accumulate: ', total_gas_fee_accumulate.toString());

                    total_util_gas_now.iadd(tx_info_merge_coin_cetus.total_gas_fee);
                    let current_tick_index = await getCurrentTickIndex(POOL_ADDRESS);
                    let sui_price = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));
                    total_util_gas_value_now = total_util_gas_value_now.add(d(tx_info_merge_coin_cetus.total_gas_fee.toString()).mul(Decimal.pow(10, -9)).mul(sui_price));

                    // dump add_liquidity transaction info
                    console.log('');
                    dumpTransactionInfo('Merge Coin Cetus Transaction Rsp', tx_info_merge_coin_cetus, tx_opt_merge_coin_cetus);

                    if (tx_rsp.effects?.status.status === 'failure') {
                        console.log('mergeCoin CETUS mergeCoin return failure, process continue.');
                    }
                }
            }
        }








        // dump

        // ...
        // tick_lower - tick_upper(tick_upper_price - tick_lower_price), ctx id, STATE, pos value | gas | gas value | fee a | fee b | rwd sui | rwd cetus | fee rwd value
        // ctx id: STATE, total delta | pos value initial| pos value now | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price | 
        // - last pair, total delta | pos value initial| pos value finished | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price | 
        // - history..total delta | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price 
        // - total...
        // -
        // tick_lower - tick_upper(tick_upper_price - tick_lower_price), (active), 
        // ctx id: STATE,
        // - last pair, total delta | pos value initial| pos value finished | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price | 
        // - history: total delta | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price 
        // - total: total delta | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price 
        // ...
        // tick_lower - tick_upper(tick_upper_price - tick_lower_price), 
        // ...

        
        // ctx total profit: total delta | pos value delta | gas | gas value | gas value cur price| fee a | fee b | rwd sui | rwd cetus | fee rwd value | value cur price 
        // util gas

        // total value now
        // total value to hold a.
        // total value to hold b
        // total value to hold both



        current_tick_index = await getCurrentTickIndex(POOL_ADDRESS);
        tick_of_current_position = tick_lower_index_seed + Math.floor((current_tick_index - tick_lower_index_seed) / tick_range) * tick_range;
        let sui_price_now = d(1).div(TickMath.tickIndexToPrice(current_tick_index, 6, 9));

        let cetus_current_tick_index = await getCurrentTickIndex(POOL_ADDRESS_FOR_FEE);
        let cetus_price_now = d(1).div(TickMath.tickIndexToPrice(cetus_current_tick_index, 6, 9));
        


        

        
        let total_current_pair_serial_profit: GridTradingPairProfit = newGridTradingPairProfit();
        let total_profit: GridTradingPairProfit = newGridTradingPairProfit();

        let total_liquidity_value = d(0);

        let total_grid_arbitrage = d(0);

        // console.log('grid_trading_pair_ctx_map length %d, content: \n', grid_trading_pair_ctx_map.size, JSON.stringify(grid_trading_pair_ctx_map, null, 2));
        console.log('grid_trading_pair_ctx_map length %d', grid_trading_pair_ctx_map.size);
        if (grid_miner_config.dump_trading_pair != 'false') {
            for (const pair_ctx of grid_trading_pair_ctx_map) {            
                console.log('%s %s',pair_ctx[1].id, getGridTradingPairStateStr(pair_ctx[1].state));
                console.log(JSON.stringify(pair_ctx[1], null, 2));
            }
        }
        

        console.log('current_tick_index before print: %d ', current_tick_index);

        
        console.log('--------------------------------------------------------');
        let sorted_grid_info_map = sortMapByKey(grid_info_map);
        for (const grid_info of sorted_grid_info_map) {            
            let active_symbol = '  ';
            if (grid_info[1].tick_lower_index == tick_of_current_position) {
                active_symbol = '=>';
            }

            let sui_price_lower = d(1).div(TickMath.tickIndexToPrice(grid_info[1].tick_lower_index, 6, 9));
            let sui_price_upper = d(1).div(TickMath.tickIndexToPrice(grid_info[1].tick_upper_index, 6, 9));

            if (grid_info[1].grid_trading_pair_ctx) { // not blank
                let position_ctx = grid_info[1].grid_trading_pair_ctx.state < GridTradingPairState.BuyFinished ? 
                        grid_info[1].grid_trading_pair_ctx.buy_position_ctx : 
                        grid_info[1].grid_trading_pair_ctx.sell_position_ctx;


                // update position ctx coin amount / value
                let coin_amount = ClmmPoolUtil.getCoinAmountFromLiquidity(position_ctx.liquidity_actual, 
                    TickMath.tickIndexToSqrtPriceX64(current_tick_index),
                    TickMath.tickIndexToSqrtPriceX64(grid_info[1].tick_lower_index),
                    TickMath.tickIndexToSqrtPriceX64(grid_info[1].tick_upper_index),
                    true
                );

                position_ctx.coin_a_amount_latest = new BN(coin_amount.coin_amount_a);
                position_ctx.coin_b_amount_latest = new BN(coin_amount.coin_amount_b);
                position_ctx.liquidity_value_latest = d(coin_amount.coin_amount_a).mul(Decimal.pow(10, -6)).add(d(coin_amount.coin_amount_b).mul(Decimal.pow(10, -9)).mul(sui_price_now));

                total_liquidity_value = total_liquidity_value.add(position_ctx.liquidity_value_latest);


                // update position ctx gas(no change)

                // update position ctx fee and reward if in current position
                if (grid_info[1].tick_lower_index == tick_of_current_position) {
                    let max_retry_times = 5;
                    while(true) {
                        try {
                            position_ctx.fee_and_reward_latest = await getFeeAndReward(pools_running[0], position_ctx.id);
                        } catch(e) {
                            if (e instanceof Error) {
                                console.error('%s [error] getFeeAndReward get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                            } else {
                                console.error('getFeeAndReward get an exception'); 
                                console.error(e);
                            }
                            max_retry_times--;
                            if (max_retry_times >= 0) {
                                await new Promise(f => setTimeout(f, 500));
                                continue;
                            }
                            
                            
                        }
                        break;
                    }
                    // mock data
                    // position_ctx.fee_and_reward_latest = addFeeAndReward(position_ctx.fee_and_reward_latest, {
                    //     fee_owned_a: new BN(10),
                    //     fee_owned_b: new BN(200),
                    //     rwd_owned_sui: new BN(300),
                    //     rwd_owned_cetus: new BN(400)
                    // });
                    position_ctx.fee_and_reward_value_latest = getFeeAndRewardValue(sui_price_now, cetus_price_now, position_ctx.fee_and_reward_latest).total_value;
                }
                total_liquidity_value = total_liquidity_value.add(position_ctx.fee_and_reward_value_latest);

                console.log('%s %d - %d(%s - %s) relative trading pair ctx id: %s, state: %s', 
                    active_symbol,
                    grid_info[1].tick_lower_index, grid_info[1].tick_upper_index, 
                    sui_price_lower.toFixed(6), sui_price_upper.toFixed(6),
                    grid_info[1].grid_trading_pair_ctx.id, getGridTradingPairStateStr(grid_info[1].grid_trading_pair_ctx.state)
                );
                console.log('    - cur position - coin a: %s, coin b: %s, value: %s', 
                    position_ctx.coin_a_amount_latest.toString(), position_ctx.coin_b_amount_latest.toString(), position_ctx.liquidity_value_latest.toFixed(10)
                );
                console.log('    - cur position - gas used: %s, gas value used: %s | fee usdc: %s, fee sui: %s, rwd sui: %s, rwd cetus: %s, fee rwd value: %s', 
                    position_ctx.total_gas_latest.toString(), position_ctx.total_gas_value_latest.neg().toFixed(10),
                    position_ctx.fee_and_reward_latest.fee_owned_a.toString(), position_ctx.fee_and_reward_latest.fee_owned_b.toString(), 
                    position_ctx.fee_and_reward_latest.rwd_owned_sui.toString(), position_ctx.fee_and_reward_latest.rwd_owned_cetus.toString(), 
                    position_ctx.fee_and_reward_value_latest.toFixed(10)
                );



                // update current pair profit
                let current_pair_profit = grid_info[1].grid_trading_pair_ctx.current_pair_profit;
                let total_history_pair_profit = grid_info[1].grid_trading_pair_ctx.total_history_pair_profit;

                let pair_value_initial = d(0);
                if (grid_info[1].grid_trading_pair_ctx.buy_with_pos) {
                    pair_value_initial = grid_info[1].grid_trading_pair_ctx.buy_position_ctx.liquidity_value_open;
                } else {
                    pair_value_initial = grid_info[1].grid_trading_pair_ctx.sell_position_ctx.liquidity_value_open;
                }
                current_pair_profit.liquidity_delta = position_ctx.liquidity_value_latest.sub(pair_value_initial);
                current_pair_profit.total_gas_used = 
                    grid_info[1].grid_trading_pair_ctx.buy_position_ctx.total_gas_latest.add(grid_info[1].grid_trading_pair_ctx.sell_position_ctx.total_gas_latest);
                current_pair_profit.total_gas_used_value = 
                    grid_info[1].grid_trading_pair_ctx.buy_position_ctx.total_gas_value_latest.add(grid_info[1].grid_trading_pair_ctx.sell_position_ctx.total_gas_value_latest);
                current_pair_profit.total_fee_and_rwd = 
                    addFeeAndReward(grid_info[1].grid_trading_pair_ctx.buy_position_ctx.fee_and_reward_latest, grid_info[1].grid_trading_pair_ctx.sell_position_ctx.fee_and_reward_latest);
                current_pair_profit.total_fee_and_rwd_value = 
                    grid_info[1].grid_trading_pair_ctx.buy_position_ctx.fee_and_reward_value_latest.add(grid_info[1].grid_trading_pair_ctx.sell_position_ctx.fee_and_reward_value_latest);
                console.log('    - cur pair - pair value initial: %s, now: %s, liquidity delta: %s ', 
                    pair_value_initial.toFixed(10), position_ctx.liquidity_value_latest.toFixed(10), current_pair_profit.liquidity_delta.toFixed(10)
                );
                console.log('    - cur pair - gas used: %s, gas value used: %s  | fee usdc: %s, fee sui: %s, rwd sui: %s, rwd cetus: %s, fee rwd value: %s', 
                    current_pair_profit.total_gas_used.toString(), current_pair_profit.total_gas_used_value.neg().toFixed(10),
                    current_pair_profit.total_fee_and_rwd.fee_owned_a.toString(), current_pair_profit.total_fee_and_rwd.fee_owned_b.toString(), 
                    current_pair_profit.total_fee_and_rwd.rwd_owned_sui.toString(), current_pair_profit.total_fee_and_rwd.rwd_owned_cetus.toString(), 
                    current_pair_profit.total_fee_and_rwd_value.toFixed(10)
                );


                total_current_pair_serial_profit.liquidity_delta = total_history_pair_profit.liquidity_delta.add(current_pair_profit.liquidity_delta);
                total_current_pair_serial_profit.total_gas_used = total_history_pair_profit.total_gas_used.add(current_pair_profit.total_gas_used);
                total_current_pair_serial_profit.total_gas_used_value = total_history_pair_profit.total_gas_used_value.add(current_pair_profit.total_gas_used_value);
                total_current_pair_serial_profit.total_fee_and_rwd = addFeeAndReward(total_history_pair_profit.total_fee_and_rwd, current_pair_profit.total_fee_and_rwd);
                total_current_pair_serial_profit.total_fee_and_rwd_value = total_history_pair_profit.total_fee_and_rwd_value.add(current_pair_profit.total_fee_and_rwd_value);


                total_grid_arbitrage = total_grid_arbitrage.add(total_history_pair_profit.liquidity_delta);
                

                console.log('    - pair serial total - liquidity delta: %s (grid arbitrage: %s)', 
                    total_current_pair_serial_profit.liquidity_delta.toFixed(10),
                    total_history_pair_profit.liquidity_delta.toFixed(10)
                );
                console.log('    - pair serial total - gas used: %s, gas value used: %s | fee usdc: %s, fee sui: %s, rwd sui: %s, rwd cetus: %s, fee rwd value: %s', 
                    total_current_pair_serial_profit.total_gas_used.toString(),
                    total_current_pair_serial_profit.total_gas_used_value.neg().toFixed(10),
                    total_current_pair_serial_profit.total_fee_and_rwd.fee_owned_a.toString(),
                    total_current_pair_serial_profit.total_fee_and_rwd.fee_owned_b.toString(),
                    total_current_pair_serial_profit.total_fee_and_rwd.rwd_owned_sui.toString(),
                    total_current_pair_serial_profit.total_fee_and_rwd.rwd_owned_cetus.toString(),
                    total_current_pair_serial_profit.total_fee_and_rwd_value.toFixed(10)
                );



                total_profit = addGridTradingPairProfit(total_profit, total_current_pair_serial_profit);

                console.log('   -------------------------------------------------    ');

            } else {
                console.log('%s %d - %d(%s - %s) blank', active_symbol,
                    grid_info[1].tick_lower_index, grid_info[1].tick_upper_index, 
                    sui_price_lower.toFixed(6), sui_price_upper.toFixed(6));
                console.log('   -------------------------------------------------    ');
            }
        }

        console.log('--------------------------------------------------------');
        console.log('Trading Pair Total: liquidity delta: %s (grid arbitrage: %s) ', 
            total_profit.liquidity_delta.toFixed(10),
            total_grid_arbitrage.toFixed(10)
        );
        console.log('Trading Pair Total: gas used: %s, gas value used: %s | fee usdc: %s, Fee sui: %s, rwd sui: %s, rwd cetus: %s, fee rwd value: %s', 
            total_profit.total_gas_used.toString(),
            total_profit.total_gas_used_value.neg().toFixed(10),
            total_profit.total_fee_and_rwd.fee_owned_a.toString(),
            total_profit.total_fee_and_rwd.fee_owned_b.toString(),
            total_profit.total_fee_and_rwd.rwd_owned_sui.toString(),
            total_profit.total_fee_and_rwd.rwd_owned_cetus.toString(),
            total_profit.total_fee_and_rwd_value.toFixed(10)
        );
        console.log('Utils Gas Cost: %s, Value: %s', total_util_gas_now.toString(), total_util_gas_value_now.neg());

        console.log('--------------------------------------------------------');
        // get check_point_status
        wallet_balance = {usdc_amount: '0', sui_amount: '0', cetus_amount: '0'};
        while(true) {
            try {
                wallet_balance = await getAllWalletBalance(account_address);
                console.log('wallet_balance: usdc %s, sui %s, cetus %s', 
                    wallet_balance.usdc_amount, 
                    wallet_balance.sui_amount, 
                    wallet_balance.cetus_amount);
            } catch(e) {
                if (e instanceof Error) {
                    console.error('%s [error] getAllWalletBalance get an exception:\n%s \n%s \n%s', date.toLocaleString(), e.message, e.name, e.stack);
                } else {
                    console.error('getAllWalletBalance get an exception'); 
                    console.error(e);
                }
                await new Promise(f => setTimeout(f, 500));
                continue;
            }
            break;
        }

        let wallet_value = getAllWalletBalanceValue(wallet_balance, sui_price_now, cetus_price_now);
        let total_value = wallet_value.add(total_liquidity_value);
        console.log('Wallet Value: %s, Value in Liquidity: %s', wallet_value.toFixed(10), total_liquidity_value.toFixed(10));
        console.log('Total Value: ', total_value);

        let wallet_value_init = getAllWalletBalanceValue(wallet_balance_init, sui_price_init, cetus_price_init);
        console.log('Total Value Init: ', wallet_value_init);
        console.log('Total Value Delta to Hold Coin A Only: ', total_value.sub(wallet_value_init));

        let equal_sui_amount_init = wallet_value_init.div(sui_price_init);
        let equal_sui_amount_init_value_now = equal_sui_amount_init.mul(sui_price_now);
        console.log('Total Value Delta to Hold Coin B Only: ', total_value.sub(equal_sui_amount_init_value_now));

        let usdc_amount_init_value_now = d(wallet_balance_init.usdc_amount).mul(Decimal.pow(10, -6));
        let sui_amount_init_value_now = d(wallet_balance_init.sui_amount).mul(Decimal.pow(10, -9)).mul(sui_price_now);
        let cetus_amount_init_value_now = d(wallet_balance_init.cetus_amount).mul(Decimal.pow(10, -9)).mul(cetus_price_now);
        let equal_both_amount_init_value_now = usdc_amount_init_value_now.add(sui_amount_init_value_now).add(cetus_amount_init_value_now);

        console.log('Total Value Delta to Hold Both: ', total_value.sub(equal_both_amount_init_value_now));

        console.log('--------------------------------------------------------');
        // console.log('grid_info_map length %d, content: \n', grid_info_map.size, JSON.stringify(grid_info_map, null, 2));
        let sorted_grid_info_map_tmp = sortMapByKey(grid_info_map);
        date.setTime(Date.now())
        console.log('%s , grid_info_map length: %d, init tick: %d, current tick : %d', date.toLocaleString(), sorted_grid_info_map_tmp.size, current_tick_index_init, current_tick_index);
        for (const grid_info of sorted_grid_info_map_tmp) {
            let active_symbol = '  ';
            if (grid_info[1].tick_lower_index == tick_of_current_position) {
                active_symbol = '=>';
            }
            let sui_price_lower = d(1).div(TickMath.tickIndexToPrice(grid_info[1].tick_lower_index, 6, 9));
            let sui_price_upper = d(1).div(TickMath.tickIndexToPrice(grid_info[1].tick_upper_index, 6, 9));
            console.log('%s %d - %d(%s - %s), %s %s',active_symbol, 
                grid_info[1].tick_lower_index, grid_info[1].tick_upper_index, 
                sui_price_lower.toFixed(6), sui_price_upper.toFixed(6),
                grid_info[1].grid_trading_pair_ctx? grid_info[1].grid_trading_pair_ctx.id : 'blank',
                grid_info[1].grid_trading_pair_ctx? getGridTradingPairStateStr(grid_info[1].grid_trading_pair_ctx.state) : '',
            );
        }
        console.log('--------------------------------------------------------');
        



        await new Promise(f => setTimeout(f, 10000)); // 10s 

    } // for(;;)
}

main();









