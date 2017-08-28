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

const shuffleTable = {
    // Nums is an array of numbers in the [0, 1) range and pick is the number of indicies to pick
    props: ['nums', 'pick'],
    methods: {
        numsToIndicies: function(nums) {
            let indicies = [];
            let result = [];
            let length = nums.length;
            nums = nums.slice(); // Eliminate aliasing
            let pick = parseInt(this.pick);
            for(let i = 1; i <= length; i++) {
                indicies.push(i);
            }
            for(let i = 0; i < length; i++) {
                nums[i] = Math.floor(nums[i] * (25 - i));
            }
            for(let i = 0; i < pick; i++) {
                result.push(indicies[nums[i]]);
            }
            return result;
        }
    },
    template: `<div>
        <p>The following shuffle step works like such: First, an array containing all possible outcomes is created. 
        Then, the number of desired outcomes (the number of picks) is taken from the array of outcomes by taking the next number generated in the method shown above, 
        multiplying it by the number of remaining outcomes, and taking the outcome from that position. Once that outcome is picked it is removed from the array and cannot be picked again.</p>
        <table>
            <tr><td>Pick #</td><td>Number</td><td>Multiplier</td><td>&lfloor;Number * Multiplier&rfloor;</td><td>Result</td></tr>
            <tr v-for="(pick, i) in numsToIndicies(nums)">
                <td>{{i+1}}</td><td>{{nums[i]}}</td><td>{{25-i}}</td><td>{{Math.floor(nums[i] * (25 - i))}}</td><td>{{numsToIndicies(nums)[i]}}</td>
            </tr>
        </table>
    </div>`
};

const minefield = {
    props: ['mines'],
    template: `<div>
        <table>
            <tr v-for="j in 5">
                <td v-for="i in 5"><img height="50" width="50" v-bind:src="mines.indexOf(((j-1)*5+(i-1)))>=0?'img/mine.png':'img/gem.png'"></img></td>
            </tr>
        </table>
    </div>`
};

const diamondPoker = {
    props: ['diamonds'],
    methods: {
        toImg: function(x) {
            let images = [
                'img/green.svg',
                'img/purple.svg',
                'img/yellow.svg',
                'img/red.svg',
                'img/cyan.svg',
                'img/orange.svg',
                'img/blue.svg'
            ];
            return images[x];
        }
    },
    template: `<table>
        <tr>
            <td v-for="diamond in diamonds.slice(0,5)"><img height="100" width="100" v-bind:src="toImg(diamond)"></img></td>
        </tr>
        <tr>
            <td v-for="diamond in diamonds.slice(5,10)"><img height="100" width="100" v-bind:src="toImg(diamond)"></img></td>
        </tr>
    </table>`
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
            {name: 'Mines'},
            {name: 'Chartbet'},
            {name: 'Hilo', disabled: true},
            {name: 'Blackjack', disabled: true},
            {name: 'Diamond Poker'},
            {name: 'Roulette'},
            {name: 'Keno', disabled: true},
            {name: 'Baccarat', disabled: true},
            {name: 'Dice'}
        ],
        numMines: 1,
        active_game: '',
        MAX_ROLL: 10001,
        MAX_ROULETTE: 37,
        MAX_CHARTBET: 1000000
    },
    components: {
        hexdectable,
        numcalc,
        minefield,
        diamondPoker,
        shuffleTable
    },
    created: function() {
        this.server_seed = this.$route.query.server_seed || '';
        this.server_hash = this.$route.query.server_hash || '';
        this.client_seed = this.$route.query.client_seed || '';
        this.nonce = this.$route.query.nonce || null;
        this.round = this.$route.query.round || 0;
        this.active_game = this.$route.query.game || '';
        this.numMines = this.$route.query.num_mines || 1;
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
        all_info: function() {
            return this.server_seed && this.client_seed && this.nonce;
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
        nums_to_mine_array: function(nums) {
            let mines = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
            let result = [];
            for(let i = 0; i < nums.length; i++) {
                result.push(mines.splice(Math.floor((25-i)*nums[i]), 1)[0]);
            }
            return result;
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
                case 'Mines':
                    return this.nums_to_mine_array(this.bytes_to_num_array(this.bytes().concat(this.bytes({round:1})).concat(this.bytes({round:2}))));
                default:
                    return 'Unknown game';
            }
        }
    }
});