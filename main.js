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
    props: ['nums', 'pick', 'total'],
    methods: {
        numsToIndicies: function(nums) {
            let indicies = [];
            let result = [];
            nums = nums.slice(); // Eliminate aliasing
            let pick = parseInt(this.pick);
            for(let i = 1; i <= this.total; i++) {
                indicies.push(i);
            }
            for(let i = 0; i < nums.length; i++) {
                nums[i] = Math.floor(nums[i] * (this.total - i));
            }
            for(let i = 0; i < pick; i++) {
                result.push(indicies.splice(nums[i],1)[0]);
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
                <td>{{i+1}}</td><td>{{nums[i]}}</td><td>{{total-i}}</td><td>{{Math.floor(nums[i] * (total - i))}}</td><td>{{numsToIndicies(nums)[i]}}</td>
            </tr>
        </table>
    </div>`
};

const minefield = {
    props: ['mines'],
    template: `<table>
        <tr v-for="j in 5">
            <td v-for="i in 5"><img height="50" width="50" v-bind:src="mines.indexOf(((j-1)*5+(i-1)))>=0?'img/mine.png':'img/gem.png'"></img></td>
        </tr>
    </table>`
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

const keno = {
    props: ['tiles'],
    template: `<table>
        <tr v-for="i in 5">
            <td v-for="j in 8" height="50" width="50"><img v-if="tiles.indexOf((i-1)*8 + (j-1)) >= 0" src="img/keno.svg"></img></td>
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
        games: [
            {name: 'Plinko'},
            {name: 'Mines'},
            {name: 'Chartbet'},
            {name: 'Hilo'},
            {name: 'Blackjack'},
            {name: 'Diamond Poker'},
            {name: 'Roulette'},
            {name: 'Keno'},
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
        shuffleTable,
        keno
    },
    created: function() {
        this.server_seed = this.$route.query.server_seed || '';
        this.server_hash = this.$route.query.server_hash || '';
        this.client_seed = this.$route.query.client_seed || '';
        this.nonce = this.$route.query.nonce || null;
        this.active_game = this.$route.query.game || '';
        this.numMines = this.$route.query.num_mines || 1;
    },
    methods: {
        /**
         * Returns the SHA256 hash of the input
         * @param {string} data - The data to hash
         * @returns {string} The hex representation of the SHA256 hash
         */
        sha256: function(data) {
            let md = forge.md.sha256.create();
            md.update(data);
            return md.digest().toHex();
        },
        /**
         * Returns the HMAC SHA256 hash of the arguments
         * @param {string} K - The key part of the HMAC digest
         * @param {string} m - The message part of the HMAC digest
         * @returns {string} The hex representation of the HMAC SHA256 hash
         */
        hmac_sha256: function(K, m) {
            let hmac = forge.hmac.create();
            hmac.start('sha256', K);
            hmac.update(m);
            return hmac.digest().toHex();
        },
        /**
         * Returns a true if the server seed and provided hash match
         * @returns {boolean} True if the server seed hash matches the provided hash
         */
        seed_hash_match: function() {
            if(this.server_seed && this.server_hash) {
                return this.sha256(this.server_seed) === this.server_hash;
            }
            return false;
        },
        /**
         * Returns true if the server seed, client seed and nonce are all present
         * @returns {boolean}
         */
        all_info: function() {
            return this.server_seed && this.client_seed && this.nonce;
        },
        /**
         * Returns the hex string calculated by hashint the server seed, client seed, nonce and round
         * @param {number} length - The length IN HEX CHARACTERS of the string to return.
         * @param {number} num - If defined, the string is truncated to the last n=num characters
         * @returns {string} A hex string
         */
        bytes: function(length, num) {
            let result = '';
            let round = 0;
            while(result.length < length) {
                result += this.hmac_sha256(this.server_seed, `${this.client_seed}:${this.nonce||0}:${round++}`);
            }
            if(result.length > length) {
                result = result.substring(0, length);
            }
            if(num) {
                result = result.substring(length - num, length);
            }
            return result;
        },
        /**
         * Returns a number in the range [0, 1)
         * @param {string} bytes - The 8 character (4 byte) hex string to convert to a number
         * @returns {number} A number in the range [0, 1)
         */
        bytes_to_number: function(bytes) {
            let total = 0;
            for(let i = 0; i < 4; i++) {
                total += parseInt(bytes.substr(i*2, 2),16)/Math.pow(256, i+1);
            }
            return total;
        },
        /**
         * Splits a string of characters into an array of two character chunks
         * @param {string} bytes - The string of hex digits
         * @returns {string[]} The array of 2 character chunks
         */
        bytes_to_hex_array: function(bytes) {
            let hex = [];
            for(let i = 0; i < bytes.length; i += 2) {
                hex.push(bytes.substr(i,2));
            }
            return hex;
        },
        /**
         * Takes a string of hex digits and converts them to an array of numbers
         * @param {string} bytes - A string of hex digits with length evenly divisible by 8
         * @returns {number[]} An array of numbers in the range [0, 1)
         */
        bytes_to_num_array: function(bytes) {
            let totals = [];
            for(let i = 0; i*8 < bytes.length; i++) {
                totals.push(this.bytes_to_number(bytes.substr(i*8), 8));
            }
            return totals;
        },
        /**
         * Returns the array of the 24 mine positions in order
         * @param {number[]} nums - The array of numbers
         * @returns {number[]} The array of mine positions
         */
        nums_to_mine_array: function(nums) {
            let mines = [];
            for(let i = 0; i < 25; i++) {
                mines.push(i);
            }
            let result = [];
            for(let i = 0; i < nums.length; i++) {
                result.push(mines.splice(Math.floor((25-i)*nums[i]), 1)[0]);
            }
            return result;
        },
        /**
         * Returns the array of tile positions (Keno) in order
         * @param {number[]} nums - The array of numbers
         * @returns {number[]} The array of tile positions
         */
        nums_to_tile_array: function(nums) {
            let tiles = [];
            let result = [];
            for(let i = 0; i < 40; i++) {
                tiles.push(i);
            }
            for(let i = 0; i < nums.length; i++) {
                result.push(tiles.splice(Math.floor(nums[i] * (40 - i)), 1)[0]);
            }
            return result;
        },
        /**
         * Returns the array of cards from the numbers
         * @param {number[]} nums - The array of numbers
         * @returns {string[]} - The array of cards
         */
        nums_to_card_array: function(nums) {
            const cards = ['&spades;2', '&hearts;2', '&diams;2', '&clubs;2', '&spades;3', '&hearts;3', '&diams;3', '&clubs;3', '&spades;4', '&hearts;4', '&diams;4', '&clubs;4',
            '&spades;5', '&hearts;5', '&diams;5', '&clubs;5', '&spades;6', '&hearts;6', '&diams;6', '&clubs;6', '&spades;7', '&hearts;7', '&diams;7', '&clubs;7', '&spades;8', '&hearts;8',
            '&diams;8', '&clubs;8', '&spades;9', '&hearts;9', '&diams;9', '&clubs;9', '&spades;10', '&hearts;10', '&diams;10', '&clubs;10', '&spades;J', '&hearts;J', '&diams;J', '&clubs;J',
            '&spades;Q', '&hearts;Q', '&diams;Q', '&clubs;Q', '&spades;K', '&hearts;K', '&diams;K', '&clubs;K', '&spades;A', '&hearts;A', '&diams;A', '&clubs;A'];
            nums = nums.map((num) => {
                return cards[Math.floor(num * 52)];
            });
            return nums;
        },
        /**
         * Takes a hex string and converts it into a base10 string with exactly 3 digits
         * @param {string} item - A hex string
         * @returns {string} A base 10 string of length 3
         */
        leading_zeroes: function(item) {
            item = parseInt(item, 16);
            if(item < 10) {
                return '00' + item;
            } else if(item < 100) {
                return '0' + item;
            } else {
                return item;
            }
        },
        /**
         * Returns the final result for many games
         * @param {string} game - The game to return the result for
         * @returns The result for the game
         */
        result: function(game) {
            switch(game) {
                case 'Dice':
                    return (Math.floor(this.bytes_to_number(this.bytes(8)) * this.MAX_ROLL) / 100).toFixed(2);
                case 'Roulette':
                    return Math.floor(this.bytes_to_number(this.bytes(8)) * this.MAX_ROULETTE);
                case 'Chartbet':
                    return (this.MAX_CHARTBET / (Math.floor(this.bytes_to_number(this.bytes(8)) * this.MAX_CHARTBET) + 1) * 0.98);
                case 'Mines':
                    return this.nums_to_mine_array(this.bytes_to_num_array(this.bytes(196)));
                case 'Keno':
                    return this.nums_to_tile_array(this.bytes_to_num_array(this.bytes(80)));
                default:
                    return 'Unknown game';
            }
        }
    }
});
