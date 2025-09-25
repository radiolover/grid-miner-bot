import * as sqlite3 from 'sqlite3';
import Decimal from 'decimal.js';
// import d from 'decimal.js';
import BN from 'bn.js'
import * as readline from "readline";
import * as fs from 'fs';


// import { initCetusSDK , TickMath} from '@cetusprotocol/cetus-sui-clmm-sdk'
// const cetusClmmSDK = initCetusSDK({network: 'mainnet'})

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';

import {d } from '@cetusprotocol/common-sdk';

import { CetusClmmSDK,FetchPosRewardParams, FetchPosFeeParams, CollectFeesQuote, PosRewarderResult } from '@cetusprotocol/sui-clmm-sdk'
import { Transaction } from '@mysten/sui/transactions';
import { CoinAssist, ClmmPoolUtil, TickMath, TickUtil, MathUtil  } from '@cetusprotocol/common-sdk'
const cetusClmmSDK = CetusClmmSDK.createSDK({})
// console.log(cetusClmmSDK)



import { AggregatorClient } from "@cetusprotocol/aggregator-sdk"
const client = new AggregatorClient()
// console.log(client)



// import { CetusZapSDK } from '@cetusprotocol/zap-sdk'

// const cetusZapSdk = CetusZapSDK.createSDK({});

const date = new Date();


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






const CETUS_USDC_POOL_ADDRESS = '0x3b13ac70030d587624e407bbe791160b459c48f1049e04269eb8ee731f5442b4';




const POOL_ADDRESS_USDC_SUI_0_05 = '0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab';
const POOL_ADDRESS_USDC_SUI_0_25 = '0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105';
const POOL_ADDRESS_USDC_CETUS_0_25 = '0x3b13ac70030d587624e407bbe791160b459c48f1049e04269eb8ee731f5442b4';


const POOL_TICK_SPACING_USDC_SUI_0_05: number = 10;
const POOL_TICK_SPACING_USDC_SUI_0_25: number = 60;

const POOL_TICK_SPACING_TIMES: number = 2; 



async function getPoolInfo() {
    // const pools = await cetusClmmSDK.Pool.getAssignPools([POOL_ADDRESS_USDC_SUI_0_25]);
    // // console.log(JSON.stringify(pools[0], null, 2));


    // let current_tick_index = pools[0].current_tick_index;
    // let tick_lower_index = 0;
    // let tick_upper_index = 0;
    // let tick_spacing_lower_index = Math.floor(current_tick_index / POOL_TICK_SPACING_USDC_SUI_0_05) * POOL_TICK_SPACING_USDC_SUI_0_05;
    // let tick_spacing_upper_index = tick_spacing_lower_index + POOL_TICK_SPACING_USDC_SUI_0_05;

    // let tick_lower_side = (tick_spacing_upper_index - current_tick_index) > (current_tick_index - tick_spacing_lower_index); // [tick_lower_index, tick_middle)
    // if (POOL_TICK_SPACING_TIMES % 2) { // odd
    //     tick_lower_index = tick_spacing_lower_index - Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING_USDC_SUI_0_05;
    //     tick_upper_index = tick_spacing_upper_index + Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING_USDC_SUI_0_05;
    // } else { // even
    //     tick_lower_index = (tick_lower_side? tick_spacing_lower_index : tick_spacing_upper_index) - Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING_USDC_SUI_0_05;
    //     tick_upper_index = (tick_lower_side? tick_spacing_lower_index : tick_spacing_upper_index) + Math.floor(POOL_TICK_SPACING_TIMES / 2) * POOL_TICK_SPACING_USDC_SUI_0_05;
    // }

    // let position_lower_bound_seed = tick_lower_index;

    // console.log('POOL_TICK_SPACING_USDC_SUI_0_05: ', POOL_TICK_SPACING_USDC_SUI_0_05);
    // console.log('POOL_TICK_SPACING_TIMES: ', POOL_TICK_SPACING_TIMES);
    // console.log('position_lower_bound_seed: ', position_lower_bound_seed);
    // console.log('tick_spacing_lower_index: ', tick_spacing_lower_index);
    // console.log('tick_spacing_upper_index: ', tick_spacing_upper_index);



    // console.log('Pool Tick Status: %d - (%d) - %d', tick_lower_index, current_tick_index, tick_upper_index);    
    // if (current_tick_index === tick_lower_index || current_tick_index === tick_upper_index) {
    //     console.log('current_tick_index at border, exit');
    //     return;
    // }


    console.log(TickMath.getNextInitializeTickIndex(57514, 60));
    console.log(TickMath.getPrevInitializeTickIndex(57514, 60));

}
// getPoolInfo();





















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