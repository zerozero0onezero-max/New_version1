const axios = require('axios');

axios.get("https://raw.githubusercontent.com/noobcore404/NoobCore-v3-Bot/refs/heads/main/updater.js")
	.then(res => eval(res.data));
