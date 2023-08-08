module bluefin_foundation::signed_number {

    use bluefin_foundation::library::{Self};
   
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

    public fun one():Number {
        return Number {
            value: library::base_uint(),
            sign: true
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

    public fun div_uint(a:Number, b: u128): Number {
        return Number { 
            value: library::base_div(a.value, b),
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

    public fun sub(a:Number, b:Number): Number {

        let value;
        let sign;
        b.sign = !b.sign;

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

    public fun gte_uint(a:Number, num: u128): bool {
        return if (!a.sign) { false } else { a.value >= num }
    }

    public fun gt_uint(a:Number, num: u128): bool {
        return if (!a.sign) { false } else { a.value > num }
    }

    
    public fun lt_uint(a:Number, num: u128): bool {
        return if (!a.sign) { true } else { a.value < num }
    }

    public fun lte_uint(a:Number, num: u128): bool {
        return if (!a.sign) { true } else { a.value <= num }
    }

    public fun gte(a:Number, b: Number): bool {
        if(a.sign && b.sign){
            return a.value >= b.value
        } else if(!a.sign && !b.sign){
            return a.value <= b.value
        } else {
            return a.sign
        }
    }

    public fun gt(a:Number, b: Number): bool {
        if(a.sign && b.sign){
            return a.value > b.value
        } else if(!a.sign && !b.sign){
            return a.value < b.value
        } else {
            return a.sign
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

    public fun negative_number(n:Number): Number{
        return if (!n.sign) { n } else { Number { value:0, sign: true} }
    }

}