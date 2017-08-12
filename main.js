const router = new VueRouter();

const app = new Vue({
    router,
    el: '#app',
    data: {
        client_seed: '5a5eae3c4cf009f5',
        server_seed: '9fa041264a884c9deb65751214aa70aa05846548942c79bf3e266c483775b800',
        server_hash: '35d7268fb4b8b0b3b8678c6a51311f560d8b6f9896b43eb678c705a30d06f638',
        nonce: 134,
        round: null,
        games: [
            {name: 'Plinko'},
            {name: 'Mines'},
            {name: 'Chartbet'},
            {name: 'Hilo'},
            {name: 'Blackjack'},
            {name: 'Diamond Poker'},
            {name: 'Roulette'},
            {name: 'Keno'},
            {name: 'Baccarat'},
            {name: 'Dice'}
        ],
        active_game: '',
        MAX_ROLL: 10001
    },
    created: function() {
        this.server_seed = this.$route.query.server_seed || '';
        this.server_hash = this.$route.query.server_hash || '';
        this.client_seed = this.$route.query.client_seed || '';
        this.nonce = this.$route.query.nonce || null;
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
        bytes: function(index) {
            if(this.client_seed && this.server_seed && this.nonce) {
                if(typeof index !== 'number') {
                    return this.hmac_sha256(this.server_seed, `${this.client_seed}:${this.nonce||0}:${this.round||0}`);
                } else {
                    return this.hmac_sha256(this.server_seed, `${this.client_seed}:${this.nonce||0}:${this.round||0}`).substr(index*2,2);
                }
            }
        },
        bytes_to_number: function(bytes, option) {
            // Where bytes is a hex string
            let total = 0;
            for(let i = 0; i < 4; i++) {
                total += parseInt(bytes.substr(i*2,2),16)/Math.pow(256,i+1);
            }
            switch(option) {
                case 'nosum':
                    return total;
                default:
                    return (Math.floor(total * this.MAX_ROLL)/100).toFixed(2);
            }
        }
    }
});