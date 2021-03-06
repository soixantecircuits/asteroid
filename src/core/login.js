Asteroid.prototype._getOauthClientId = function (serviceName) {
	var loginConfigCollectionName = "meteor_accounts_loginServiceConfiguration";
	var loginConfigCollection = this.collections[loginConfigCollectionName];
	var service = loginConfigCollection.reactiveQuery({service: serviceName}).result[0];
	return service.clientId || service.consumerKey || service.appId;
};

Asteroid.prototype._afterCredentialSecretReceived = function (credentials) {
	var self = this;
	var deferred = Q.defer();
	var loginParameters = {
		oauth: credentials
	};
	self.ddp.method("login", [loginParameters], function (err, res) {
		if (err) {
			delete self.userId;
			delete self.loggedIn;
			multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
			deferred.reject(err);
			self._emit("loginError", err);
		} else {
			self.userId = res.id;
			self.loggedIn = true;
			multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
			self._emit("login", res.id);
			deferred.resolve(res.id);
		}
	});
	return deferred.promise;
};

Asteroid.prototype.loginWithFacebook = function (scope) {
	var credentialToken = guid();
	var query = {
		client_id:		this._getOauthClientId("facebook"),
		redirect_uri:	this._host + "/_oauth/facebook?close",
		state:			credentialToken,
		scope:			scope || "email"
	};
	var loginUrl = "https://www.facebook.com/dialog/oauth?" + formQs(query);
	return this._initOauthLogin("facebook", credentialToken, loginUrl);
};

Asteroid.prototype.loginWithGoogle = function (scope) {
	var credentialToken = guid();
	var query = {
		response_type:	"code",
		client_id:		this._getOauthClientId("google"),
		redirect_uri:	this._host + "/_oauth/google?close",
		state:			credentialToken,
		scope:			scope || "openid email"
	};
	var loginUrl = "https://accounts.google.com/o/oauth2/auth?" + formQs(query);
	return this._initOauthLogin("google", credentialToken, loginUrl);
};

Asteroid.prototype.loginWithGithub = function (scope) {
	var credentialToken = guid();
	var query = {
		client_id:		this._getOauthClientId("github"),
		redirect_uri:	this._host + "/_oauth/github?close",
		state:			credentialToken,
		scope:			scope || "email"
	};
	var loginUrl = "https://github.com/login/oauth/authorize?" + formQs(query);
	return this._initOauthLogin("github", credentialToken, loginUrl);
};

Asteroid.prototype.loginWithTwitter = function () {
	var credentialToken = guid();
	var callbackUrl = this._host + "/_oauth/twitter?close&state=" + credentialToken;
	var query = {
		requestTokenAndRedirect:	encodeURIComponent(callbackUrl),
		state:						credentialToken
	};
	var loginUrl = this._host + "/_oauth/twitter/?" + formQs(query);
	return this._initOauthLogin("twitter", credentialToken, loginUrl);
};

Asteroid.prototype._tryResumeLogin = function () {
	var self = this;
	return Q()
		.then(function () {
			return multiStorage.get(self._host + "__" + self._instanceId + "__login_token__");
		})
		.then(function (token) {
			if (!token) {
				throw new Error("No login token");
			}
			return token;
		})
		.then(function (token) {
			var deferred = Q.defer();
			var loginParameters = {
				resume: token
			};
			self.ddp.method("login", [loginParameters], function (err, res) {
				if (err) {
					delete self.userId;
					delete self.loggedIn;
					multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
					self._emit("loginError", err);
					deferred.reject(err);
				} else {
					self.userId = res.id;
					self.loggedIn = true;
					multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
					self._emit("login", res.id);
					deferred.resolve(res.id);
				}
			});
			return deferred.promise;
		});
};

Asteroid.prototype.createUser = function (usernameOrEmail, password, profile) {
	var self = this;
	var deferred = Q.defer();
	var options = {
		username: isEmail(usernameOrEmail) ? undefined : usernameOrEmail,
		email: isEmail(usernameOrEmail) ? usernameOrEmail : undefined,
		password: password,
		profile: profile
	};
	self.ddp.method("createUser", [options], function (err, res) {
		if (err) {
			self._emit("createUserError", err);
			deferred.reject(err);
		} else {
			self.userId = res.id;
			self.loggedIn = true;
			multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
			self._emit("createUser", res.id);
			self._emit("login", res.id);
			deferred.resolve(res.id);
		}
	});
	return deferred.promise;
};

Asteroid.prototype.loginWithPassword = function (usernameOrEmail, password) {
	var self = this;
	var deferred = Q.defer();
	var loginParameters = {
		password: password,
		user: {
			username: isEmail(usernameOrEmail) ? undefined : usernameOrEmail,
			email: isEmail(usernameOrEmail) ? usernameOrEmail : undefined
		}
	};
	self.ddp.method("login", [loginParameters], function (err, res) {
		if (err) {
			delete self.userId;
			delete self.loggedIn;
			multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
			deferred.reject(err);
			self._emit("loginError", err);
		} else {
			self.userId = res.id;
			self.loggedIn = true;
			multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
			self._emit("login", res.id);
			deferred.resolve(res.id);
		}
	});
	return deferred.promise;
};

Asteroid.prototype.logout = function () {
	var self = this;
	var deferred = Q.defer();
	self.ddp.method("logout", [], function (err) {
		if (err) {
			self._emit("logoutError", err);
			deferred.reject(err);
		} else {
			delete self.userId;
			delete self.loggedIn;
			multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
			self._emit("logout");
			deferred.resolve();
		}
	});
	return deferred.promise;
};
