export const OWNERSHIP_ERROR = (
    objId: string,
    ownerId: string,
    signerId: string
) => {
    return new RegExp(
        `Object ${objId} is owned by account address ${ownerId}, but given owner/signer address is ${signerId}`
    );
};

export const ERROR_CODES: { [key: string]: string } = {
    "1": "Minimum order price must be > 0",
    "2": "Minimum trade price must be < maximum trade price",
    "3": "Maker: Trade price is < min allowed price",
    "4": "Maker: Trade price is > max allowed price",
    "5": "Price does not conforms to allowed tick size",
    "6": "User already has a position object",
    "8": "Operator does not exist",
    "9": "Maximum trade price must be > min trade price",
    "10": "Step Size must be > 0",
    "11": "Tick Size Must be > 0",
    "12": "Market Take Bound for long trades must be > 0",
    "13": "Market Take Bound for short trades must be > 0",
    "14": "Market Take Bound for short trades must be < 100%",
    "15": "Maximum Limit Trade quantity must be > minimum trade quantity",
    "16": "Maximum Market Trade quantity must be > minimum trade quantity",
    "17": "Minimum trade quantity must be < max trade quantity",
    "18": "Minimum trade quantity must be > 0",
    "19": "Trade quantity is < min tradeable quantity",
    "20": "Trade quantity is > max allowed limit quantity",
    "21": "Trade quantity is > max allowed market quantity",
    "22": "Trade quantity does not conforms to allowed step size",
    "23": "Trade price is > Market Take Bound for long side",
    "24": "Trade price is < Market Take Bound for short side",
    "25": "Maker: OI open for selected leverage > max allowed oi open",
    "26": "Maker: OI open for selected leverage > max allowed oi open",
    "28": "Maker: Order is canceled",
    "29": "Taker: Order is canceled",
    "30": "Maker: Order has invalid signature",
    "31": "Taker: Order has invalid signature",
    "32": "Maker: Order expired",
    "33": "Taker: Order expired",
    "34": "Maker: Fill price is invalid",
    "35": "Taker: Fill price is invalid",
    "38": "Maker: Fill does not decrease size",
    "39": "Taker: Fill does not decrease size",
    "40": "Maker: Invalid leverage",
    "41": "Taker: Invalid leverage",
    "42": "Maker: Leverage must be > 0",
    "43": "Taker: Leverage must be > 0",
    "44": "Maker: Cannot overfill order",
    "45": "Taker: Cannot overfill order",
    "46": "Maker: Cannot trade when loss exceeds margin. Please add margin",
    "47": "Taker: Cannot trade when loss exceeds margin. Please add margin",
    "48": "Taker: Order can not be of the same side as Maker",
    "49": "Invalid taker order, as post only is set to true",
    "50": "Sender does not have permission on maker's behalf",
    "51": "Sender does not have permission on taker's behalf",
    "52": "Sender does not have permission on user's behalf",
    "53": "Maker: Funding payments are due and margin is < funding due",
    "54": "Taker: Funding payments are due and margin is < funding due",
    "55": "Funding payments are due and margin is < funding due",
    "56": "Trading is not yet started on perpetual",
    "60": "Perpetual has been already de-listed",
    "61": "Not allowed as perpetual is de-listed",
    "62": "Perpetual must be de-listed before one can close position",
    "63": "Trading has been stopped on the perpetual",
    "100": "Sender is not valid price oracle operator",
    "101": "Sender is not valid funding rate operator",
    "102": "Price is out of max allowed price difference bounds",
    "103": "Max allowed price difference cannot be 0%",
    "104": "Can not be > 100%",
    "105": "Address can not be zero",
    "106": "Maker order can not be immediate or cancel",
    "107": "Balance of provided coin is < amount to be locked in bank",
    "108": "Only taker (or its sub accounts) can execute trades involving non orderbook orders",
    "109": "Not public settlement operator capability",
    "110": "Sender is not a valid settlement operator",
    "111": "Caller is not the guardian",
    "112": "Operator already removed from valid operators list from safe",
    "113": "Caller is not the deleveraging operator",
    "400": "Maker: MR < IMR, can not open a new or flip position",
    "401": "Taker: MR < IMR, can not open a new or flip position",
    "402": "Maker: MR < IMR, Margin Ratio must improve or stay the same",
    "403": "Taker: MR < IMR, Margin Ratio must improve or stay the same",
    "404": "Maker: MR <= MMR, position size can only be reduced",
    "405": "Taker: MR <= MMR, position size can only be reduced",
    "406": "Maker: MR < 0, please add margin to avoid liquidation",
    "407": "Taker: MR < 0, please add margin to avoid liquidation",
    "500": "Margin amount must be > 0",
    "503": "Margin to be removed can not be > max removable margin amount",
    "504": "Leverage can not be set to zero",
    "505": "Maker has no position object",
    "506": "Taker has no position object",
    "507": "User has no position object",
    "510": "Maker position size is zero ",
    "511": "Taker position size is zero ",
    "512": "User position size is zero",
    "600": "Maker: Insufficient margin in margin bank",
    "601": "Taker: Insufficient margin in margin bank",
    "602": "Perpetual: Insufficient margin in margin bank",
    "603": "Insufficient margin in margin bank",
    "604": "Withdrawal from bank is not allowed at the moment",
    "605": "User does not have a bank account",
    "606": "Amount provided to be deposited is < the balance in provided coin",
    "700": "Liquidation: Maker has no position to liquidate",
    "701": "Liquidation: allOrNothing is true and liquidation quantity < specified quantity",
    "702": "Liquidation: Liquidator leverage is invalid",
    "703": "Liquidation: Cannot liquidate since maker is not undercollateralized",
    "800": "IsolatedADL: Cannot deleverage since maker is not underwater",
    "801": "IsolatedADL: Cannot deleverage since taker is underwater",
    "802": "IsolatedADL: Taker and maker must have same side positions",
    "803": "IsolatedADL: allOrNothing is set and maker position is < quantity",
    "804": "IsolatedADL: allOrNothing is set and taker position is < quantity",
    "900": "New address can not be same as current one",
    "901": "Funding rate is not settable for 0th window",
    "902": "Funding rate for current window is already set"
};
