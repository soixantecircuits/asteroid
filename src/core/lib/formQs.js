function formQs (obj) {
	var qs = "";
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			qs += key + "=" + obj[key] + "&";
		}
	}
	qs = qs.slice(0, -1);
	return qs;
}
