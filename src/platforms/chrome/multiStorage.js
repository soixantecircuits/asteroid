// For details on the chrome extensions storage API, see
// https://developer.chrome.com/apps/storage

multiStorage.get = function (key) {
	var deferred = Q.defer();
	chrome.storage.local.get(key, function (data) {
		deferred.resolve(data[key]);
	});
	return deferred.promise;
};

multiStorage.set = function (key, value) {
	var deferred = Q.defer();
	var data = {};
	data[key] = value;
	chrome.storage.local.set(data, function () {
		deferred.resolve();
	});
	return deferred.promise;
};

multiStorage.del = function (key) {
	var deferred = Q.defer();
	chrome.storage.local.remove(key, function () {
		deferred.resolve();
	});
	return deferred.promise;
};
