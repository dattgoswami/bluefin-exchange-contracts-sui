module bluefin_foundation::funding_rate {    
    use sui::clock::{Self, Clock};
    use sui::object::{ID};
    use sui::event::{emit};

    // custom modules
    use bluefin_foundation::roles::{Self, FundingRateCap, CapabilitiesSafe};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};

    // friend modules
    friend bluefin_foundation::perpetual;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct MaxAllowedFRUpdateEvent has copy, drop {
        id: ID,
        value: u128
    }

    struct GlobalIndexUpdate has drop, copy {
        id: ID,
        index: FundingIndex
    }

    struct FundingRateUpdateEvent has copy, drop {
        id: ID,
        rate: Number, // funding rate per milli second
        window: u64, // current funding window for which FR is set
        minApplicationTime: u64 // min timestamp till which funding rate will be applicable
    }
    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//


    struct FundingIndex has copy, drop, store {
        value:Number,
        timestamp: u64
    }

    struct FundingRate has copy, drop, store {
        // timestamp at which funding rate was started
        startTime: u64,
        // max allowed funding rate
        maxFunding: u128,
        // counter indicating the number of funding window
        window: u64,
        // funding rate per milli second        
        rate: Number,
        // global funding index
        index: FundingIndex
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // 1 hour
    const FUNDING_WINDOW_SIZE: u64 = 3600000;

    //===========================================================//
    //                      FRIEND FUNCTIONS                     //
    //===========================================================//

    public fun initialize_index(timestamp: u64): FundingIndex {
        return FundingIndex{value: signed_number::new(), timestamp}
    }

    public (friend) fun initialize(startTime: u64, maxFunding:u128): FundingRate{
        return FundingRate{
            startTime,
            maxFunding,
            window: 0,
            rate: signed_number::new(),
            index: initialize_index(startTime)
        }
    }

    public (friend) fun set_funding_rate(safe: &CapabilitiesSafe, cap: &FundingRateCap, funding: &mut FundingRate, rate:u128, sign:bool, currentTime:u64, perpID: ID){

        // validate funding rate operator is correct        
        roles::check_funding_rate_operator_validity(safe, cap);

        let expectedWindow =  expected_funding_window(*funding, currentTime);

        assert!(expectedWindow > 1, error::funding_rate_can_not_be_set_for_zeroth_window());

        assert!(funding.window < expectedWindow - 1, error::funding_rate_for_window_already_set());
        
        // must be <= max allowed funding else revert
        assert!(rate <= funding.maxFunding, error::greater_than_max_allowed_funding());
        
        // save the hourly funding rate
        funding.rate = signed_number::from(rate, sign);

        // update window for which FR is set
        funding.window = expectedWindow - 1;
        
        emit (
            FundingRateUpdateEvent{
            id: perpID,
            rate: funding.rate,
            window: funding.window,
            minApplicationTime: (expectedWindow * FUNDING_WINDOW_SIZE + funding.startTime) - currentTime,
            });
    }

    public (friend) fun set_max_allowed_funding_rate(funding: &mut FundingRate, rate: u128, perpetual: ID){

        assert!(
            rate <= library::base_uint(), 
            error::can_not_be_greater_than_hundred_percent());

        funding.maxFunding = rate;

        emit(MaxAllowedFRUpdateEvent {
            id: perpetual,
            value: rate
        });
    }

    public (friend) fun set_global_index(funding: &mut FundingRate, index: FundingIndex, id:ID){
        // only update global index if a new index is provided
        if(funding.index.timestamp != index.timestamp){
            funding.index = index;
            emit(GlobalIndexUpdate{id, index});
        }
    }

    //===========================================================//
    //                       PUBLIC METHODS                      //
    //===========================================================//

    public fun compute_new_global_index(clock: &Clock, funding: FundingRate, oraclePrice: u128): FundingIndex{

        let currentTime = clock::timestamp_ms(clock);


        // current time must be > timestamp at which funding index was set
        // this helps eliminate cases where compute_new_global_index() is invoked
        // before the trading on perpetual has actually begun       
        let timeDelta =  if(currentTime > funding.index.timestamp) {
            ( currentTime - funding.index.timestamp as u128)
        } else {
            0
        };

        if (timeDelta > 0) {
            
            // funding rate * time delta * oracle price
            let fundingValue = signed_number::from(
                library::base_mul(
                    // timeDelta is in milli seconds, convert to hour as funding rate is in hour
                    signed_number::value(funding.rate) * timeDelta / (FUNDING_WINDOW_SIZE as u128), 
                    oraclePrice),
                signed_number::sign(funding.rate)
            );

            // Update the index according to the funding rate,
            // applied over the time delta.
            funding.index.value = signed_number::add(funding.index.value, fundingValue);
            // update index timestamp
            funding.index.timestamp = currentTime;
        };

        return funding.index
    }

    // can be made public but better to restrict
    public fun index(funding: FundingRate): FundingIndex{
        return funding.index
    }

    // checks if two indexes are same by comparing their timestamp
    public  fun are_indexes_equal(a: FundingIndex, b: FundingIndex): bool{
        return a.timestamp == b.timestamp
    }

    // subtracts values of two indexes
    public fun index_value(index: FundingIndex): Number{
        return index.value
    }

    // returns funding rate per milli second
    public fun rate(funding: FundingRate): Number{
        return funding.rate
    }

    //===========================================================//
    //                       HELPER FUNCTIONS                    //
    //===========================================================//

    fun expected_funding_window(funding:FundingRate, currentTime: u64):u64{        
        return if (currentTime < funding.startTime) { 0 } 
            else { ((currentTime - funding.startTime) / FUNDING_WINDOW_SIZE ) + 1}
    }

}