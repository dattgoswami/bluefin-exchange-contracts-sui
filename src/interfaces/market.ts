export interface MarketDetails {
    name: string;
    // min price at which asset can be traded
    minPrice: string;
    // max price at which asset can be traded
    maxPrice: string;
    // the smallest decimal unit supported by asset for price
    tickSize: string;
    // minimum quantity of asset that can be traded
    minQty: string;
    // maximum quantity of asset that can be traded for limit order
    maxQtyLimit: string;
    // maximum quantity of asset that can be traded for market order
    maxQtyMarket: string;
    // the smallest decimal unit supported by asset for quantity
    stepSize: string;
    //  market take bound for long side ( 10% == 100000000000000000)
    mtbLong: string;
    //  market take bound for short side ( 10% == 100000000000000000)
    mtbShort: string;
    // array of maxAllowed values for leverage (0 index will contain dummy value, later indexes will represent leverage)
    maxAllowedOIOpen: string[];
    // imr: the initial margin collateralization percentage
    initialMarginRequired: string;
    // mmr: the minimum collateralization percentage
    maintenanceMarginRequired: string;
    // default maker order fee for this Perpetual
    makerFee: string;
    // default taker order fee for this Perpetual
    takerFee: string;
    // maximum allowed difference in consecutive Oracle Price updates
    maxAllowedPriceDiffInOP: string;
}