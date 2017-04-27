const WebSocket = require('ws');
const exec = require('child_process').exec;
const base64Encode = function(string) {
	return new Buffer(string).toString('base64');
};

function SamsungTvRemote(config) {
	if( !config.ip ) {
		throw new Error('TV IP address is required');
	}
	config.name = config.name || 'SamsungTvRemote';
	config.mac = config.mac || '00:00:00:00';
	config.port = config.port || 8001;
	config.timeout = config.timeout || 5000;

	this.sendKey = function(key) {
		if( key ) {
			const url = `http://${config.ip}:${config.port}/api/v2/channels/samsung.remote.control?name=${base64Encode(config.name)}`;
			let ws = new WebSocket(url, (error) => {
				console.log(new Error(error));
			});
			ws.on('error', (error) => {
				console.log(`Samsung Remote Client:${ error.code }`);
			});
			ws.on('message', (data, flags) => {
				data = JSON.parse(data);
				if( data.event === 'ms.channel.connect' ) {
					ws.send(JSON.stringify({
						'method': 'ms.remote.control',
						'params': {
							'Cmd': 'Click',
							'DataOfCmd': key,
							'Option': 'false',
							'TypeOfRemote': 'SendRemoteKey'
						}
					}));
					setTimeout(() => {
						ws.close();
					}, 1000);
				}
			});
		}
	};

	this.isTvAlive = function(done) {
		return exec('ping -c 1 ' + config.ip, (error, stdout, stderr) => {
            done(error ? false : true);
        });
	};
}

module.exports = SamsungTvRemote;
