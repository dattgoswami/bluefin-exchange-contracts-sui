module firefly_exchange::signed_number {

    use firefly_exchange::library::{Self};

    struct Number has store, copy, drop {
        value: u128,
        sign: bool
    }

    public fun new():Number {
        return Number {
            value: 0,
            sign: true
        }
    }
    
    public fun from(value:u128, sign: bool):Number {
        return Number {
            value,
            sign
        }
    }   

    public fun add_uint(a:Number, b: u128): Number {

        let value = a.value; 
        let sign = a.sign;

        if (sign == true) {
            value = value + b;
        } else {
            if (value > b) { value = value - b; }
            else {value = b - value; sign = true };
        };

        return Number { 
            value,
            sign
        }
    }


    public fun sub_uint(a:Number, b: u128): Number {

        let value = a.value; 
        let sign = a.sign;

        if (sign == false) {
            value = value + b;
        } else {
            if (value > b) { value = value - b; }
            else {value = b - value; sign = false };
        };

        return Number { 
            value,
            sign
        }
    }

    public fun mul_uint(a:Number, b: u128): Number {
        return Number { 
            value: library::base_mul(a.value, b),
            sign: a.sign
        }
    }

    public fun negate(n:Number): Number {
        return Number { 
            value: n.value,
            sign: !n.sign
        }
    }

    public fun add(a:Number, b:Number): Number {

        let value;
        let sign;

        if (a.sign == b.sign ) { 
            value = a.value + b.value;
            sign = a.sign;
            } 
        else if (a.value >= b.value) {
            value = a.value - b.value;
            sign = a.sign;
        }
        else {
            value = b.value - a.value;
            sign = b.sign;
        };

        return Number {
            value,
            sign 
        }

    }


    public fun gte(a:Number, num: u128): bool {
        if (a.sign == false ){
            return false
        }
        else if (a.value >= num ){
            return true
        }
        else {
            return false
        }
    }


    public fun from_subtraction(a:u128, b:u128):Number {
        
        return if ( a > b ){
            Number {
                value: a - b,
                sign: true
            }
        } else {
            Number {
                value: b - a,
                sign: false
            }
        }

    }

    public fun value(n:Number): u128 {
        return n.value
    }

    public fun sign(n:Number): bool {
        return n.sign
    }


    public fun positive_value(n:Number): u128 {
        return if (!n.sign) { 0 } else { n.value }
    }

    public fun positive_number(n:Number): Number{
        return if (!n.sign) { Number { value:0, sign: true} } else { n }
    }

}