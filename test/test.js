const wol = require('wake_on_lan');

wol.wake('10:c3:7b:6d:a6:ec', function(err) {
	if (err) {
		console.log(err);
	} else {
		console.log('success');
	}
});
