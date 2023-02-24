export interface wallet {
    address: string;
    phrase: string;
}

export interface UserPosition {
    isPosPositive: boolean;
    qPos: string;
    margin: string;
    mro: string;
    oiOpen: string;
}

export interface UserPositionExtended extends UserPosition {
    perpID: string;
    user: string;
}