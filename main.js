const hexdectable = {
    props: ['hex', 'dec'],
    template: `<table>
        <tr>
            <td></td>
            <td class="left" v-for="item, i in hex">{{i}}</td>
        </tr>
        <tr>
            <td class="right">Hex</td>
            <td class="left" v-for="item in hex"><strong>{{item}}</strong></td>
        </tr>
        <tr>
            <td class="right">Base 10</td>
            <td class="left" v-for="item in dec"><strong>{{item}}</strong></td>
        </tr>
    </table>`
};

const numcalc = {
    // Bytes is an array of 4 decimal numbers in the range [0, 256)
    props: ['bytes'],
    template: `<div>
        <pre>({{bytes[0]}}/256^1) + ({{bytes[1]}}/256^2) + ({{bytes[2]}}/256^3) + ({{bytes[3]}}/256^4)</pre>
        <pre>({{bytes[0]/Math.pow(256,1)}}) + ({{bytes[1]/Math.pow(256,2)}}) + ({{bytes[2]/Math.pow(256,3)}}) + ({{bytes[3]/Math.pow(256,4)}})</pre>
        <pre>= {{(bytes[0]/Math.pow(256,1)) + (bytes[1]/Math.pow(256,2)) + (bytes[2]/Math.pow(256,3)) + (bytes[3]/Math.pow(256,4))}}</pre>
    </div>`
};

const router = new VueRouter();

const app = new Vue({
    router,
    el: '#app',
    data: {
        client_seed: '',
        server_seed: '',
        server_hash: '',
        nonce: null,
        round: null,
        games: [
            {name: 'Plinko'},
            {name: 'Mines', disabled: true},
            {name: 'Chartbet'},
            {name: 'Hilo', disabled: true},
            {name: 'Blackjack', disabled: true},
            {name: 'Diamond Poker', disabled: true},
            {name: 'Roulette'},
            {name: 'Keno', disabled: true},
            {name: 'Baccarat', disabled: true},
            {name: 'Dice'}
        ],
        active_game: '',
        MAX_ROLL: 10001,
        MAX_ROULETTE: 37,
        MAX_CHARTBET: 1000000
    },
    components: {
        hexdectable,
        numcalc
    },
    created: function() {
        this.server_seed = this.$route.query.server_seed || '';
        this.server_hash = this.$route.query.server_hash || '';
        this.client_seed = this.$route.query.client_seed || '';
        this.nonce = this.$route.query.nonce || null;
        this.round = this.$route.query.round || 0;
        this.active_game = this.$route.query.game || '';
    },
    methods: {
        sha256: function(data) {
            let md = forge.md.sha256.create();
            md.update(data);
            return md.digest().toHex();
        },
        hmac_sha256: function(K, m) {
            let hmac = forge.hmac.create();
            hmac.start('sha256', K);
            hmac.update(m);
            return hmac.digest().toHex();
        },
        seed_hash_match: function() {
            if(this.server_seed && this.server_hash) {
                return this.sha256(this.server_seed) === this.server_hash;
            }
            return false;
        },
        bytes: function(options) {
            // Forgive me for these ternary statements
            let i = options ? options.i : null;
            let round = options ? options.round : 0;
            if(this.client_seed && this.server_seed && this.nonce) {
                // Take care to note the intentional lack of `this` on the round for the two following return statements
                if(typeof i !== 'number') {
                    return this.hmac_sha256(this.server_seed, `${this.client_seed}:${this.nonce||0}:${round}`);
                } else {
                    return this.hmac_sha256(this.server_seed, `${this.client_seed}:${this.nonce||0}:${round}`).substr(i*2,2);
                }
            }
        },
        bytes_to_number: function(bytes) {
            // Where bytes is a hex string with 8 hex digits
            let total = 0;
            for(let i = 0; i < 4; i++) {
                total += parseInt(bytes.substr(i*2, 2),16)/Math.pow(256, i+1);
            }
            return total;
        },
        bytes_to_hex_array: function(bytes) {
            let hex = [];
            for(let i = 0; i < bytes.length; i += 2) {
                hex.push(bytes.substr(i,2));
            }
            return hex;
        },
        bytes_to_num_array: function(bytes) {
            // Where bytes is a hex string of any even-numbered length
            let totals = [];
            // Loop through each segment of 2 hex digits
            for(let j = 0; j*8 < bytes.length; j++) {
                let total = 0;
                for(let i = 0; i < 4; i++) {
                    total += parseInt(bytes.substr((j*8)+(i*2), 2), 16)/Math.pow(256, i+1);
                }
                totals.push(total);
            }
            return totals;
        },
        leading_zeroes: function(item) {
            // Take a hex number and make it a 3 digit decimal number
            item = parseInt(item, 16);
            if(item < 10) {
                return '00' + item;
            } else if(item < 100) {
                return '0' + item;
            } else {
                return item;
            }
        },
        result: function(game) {
            switch(game) {
                case 'Dice':
                    return (Math.floor(this.bytes_to_number(this.bytes()) * this.MAX_ROLL) / 100).toFixed(2);
                case 'Roulette':
                    return Math.floor(this.bytes_to_number(this.bytes()) * this.MAX_ROULETTE);
                case 'Chartbet':
                    return (this.MAX_CHARTBET / (Math.floor(this.bytes_to_number(this.bytes()) * this.MAX_CHARTBET) + 1) * 0.98);
                default:
                    return 'Unknown game';
            }
        }
    }
});