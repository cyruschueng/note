// gw.js

const helper = require('helper.js').helper;
const mp_gw = require('common/mp_gw.js').mp_gw;
const api = require('api.js').api;
const res = require('res.js').res;
const db = require('db.js').db;

const $domain = {
	master: "lambda-lab.cn",
	sub: "note.mp",
	path: {
		randLogin: "/rand/login",
		rangLoginG: "/rand/login/gsecret",
		userLogin: "/user/login",
		userLoginG: "/user/login/gsecret",
		userG: "/user/gsecret",
		userCheckin: "/user/checkin",
		groupCheckin: "/group/checkin",
		groupGet: "/group/get",
		groupSync: "/group/sync",
		groupNewAdviser: "/group/new_adviser",
		groupDel: "/group/del",
		groupDelUser: "/group/del_user",
		groupDelStudent: "/group/del_student",
		payPre: "/group/pay/pre",
		topicNew: "/group/topic/new",
		topicAct: "/group/topic/act",
		topicGetOpen: "/group/topic/get/open",
		topicGetClosed: "/group/topic/get/closed",
		topicGet: "/group/topic/get",
		topicDel: "/group/topic/del",
		topicClose: "/group/topic/close",
	},

	url: (xid, path) => {
		let nn = getApp().user.nn;
		const idx = (xid >>> 0) % (nn >>> 0);
		let ids;

		console.log(`url xid=${xid} nn=${nn} idx=${idx}`);

		if (idx < 10) {
			ids = "0" + idx;
		} else if (idx < 19) {
			ids = "" + idx;
		} else { // idx >= 19
			ids = "www";
		}

		return "https://" + ids + "." + $domain.sub + "." + $domain.master + path;
	},
};

const $gw = {
	error: (name, err) => {
		throw new Error(`${name} error: ${err}`);
	},

	checker: (name, obj) => {
		if (obj.error) {
			$gw.error(name, obj);
		}

		let chk = {
			exist: (field) => {
				if (!obj[field]) {
					$gw.error(name, `no ${field}`);
				}

				return chk;
			},
		};

		return chk;
	},

	check: (name, obj, ...fields) => {
		let checker = $gw.checker(name, obj);

		fields.map(v=>checker.exist(v));

		return obj;
	},

	checkUser: (name, obj) =>
		$gw.check(name, obj.user, "uid", "session", "nn"),

	success: (name, obj) => console.log(`${name} recv obj=${JSON.stringify(obj)}`),

	request: (xid, path, data) => {
		let url = $domain.url(xid, path);
		let method = "PUT";

		console.info(`request url:${url} data:${JSON.stringify(data)}`);

		return api.request({ url, method, data });
	},
	login_fail: (app, e) => $gw.fail(app, "mpLoginFail", e),
	fail: (app, act, e) => {
		let msg = res[act](app);

		api.hideLoadingEx();

		console.error(`${msg}: ${JSON.stringify(e)}`);

		api.showModal(res.app(app), msg);
	},
};

const gw = {
	randLogin: {
		request: (param = { jscode }) =>
			$gw.request(helper.bkdr(param.jscode), $domain.path.randLogin, param),
		success: (app, obj) => {
			let name = "randLogin";
			let user = app.user;

			$gw.success(name, obj);
			$gw.check(name, obj, "user");
			$gw.checkUser(name, obj);

			db.user.vcopy(user, obj.user);
			mp_gw.start_post(app);
		},
		fail: (app, e) => $gw.login_fail(app, e),
	},

	randLoginG: {
		request: (param = { jscode, gsecret }) =>
			$gw.request(helper.bkdr(param.jscode), $domain.path.randLoginG, param),
		success: (app, obj) => {
			let name = "randLoginG";
			let user = app.user;

			$gw.success(name, obj);
			$gw.check(name, obj, "user", "gid", "opengid");
			$gw.checkUser(name, obj);

			db.user.vcopy(user, obj.user);

			mp_gw.start_post(app, {
				opengid: obj.opengid,
				gid: obj.gid,
			});
		},
		fail: (app, e) => $gw.login_fail(app, e),
	},

	userLogin: {
		request: (param = { uid, jscode }) =>
			$gw.request(param.uid, $domain.path.userLogin, param),
		success: (app, obj) => {
			let name = "userLogin";
			let user = app.user;

			$gw.success(name, obj);
			$gw.check(name, obj, "user");
			$gw.checkUser(name, obj);

			db.user.vcopy(user, obj.user);
			mp_gw.start_post(app);
		},
		fail: (app, e) => $gw.login_fail(app, e),
	},

	userLoginG: {
		request: (param = { uid, jscode, gsecret }) =>
			$gw.request(param.uid, $domain.path.userLoginG, param),
		success: (app, obj) => {
			let name = "userLoginG";
			let user = app.user;

			$gw.success(name, obj);
			$gw.check("userLoginG", obj, "user", "gid", "opengid");
			$gw.checkUser(name, obj);

			db.user.vcopy(user, obj.user);

			mp_gw.start_post(app, {
				opengid: obj.opengid,
				gid: obj.gid,
			});
		},
		fail: (app, e) => $gw.login_fail(app, e),
	},

	userG: {
		request: (param = { uid, session, gsecret }) =>
			$gw.request(param.uid, $domain.path.userG, param),
		success: (app, obj) => {
			let name = "userG";

			$gw.success(name, obj);
			// maybe exist gid
			$gw.check(name, obj, "opengid");

			mp_gw.start_post(app, {
				opengid: obj.opengid,
				gid: obj.gid,
			});
		},
		fail: (app, e) => $gw.login_fail(app, e),
	},

	userCheckin: {
		request: (param = { uid, session, opengid, role, name, nick, students }) =>
			$gw.request(param.uid, $domain.path.userCheckin, param),
		success: (app, obj) => {
			let name = "userCheckin";

			$gw.success(name, obj);
			$gw.check(name, obj, "group");
		},
		fail: (app, e) => $gw.fail(app, "mpUserCheckinFail", e),
	},

	groupCheckin: {
		request: (param = { uid, session, gid, role, name, nick, students }) =>
			$gw.request(param.uid, $domain.path.groupCheckin, param),
		success: (app, obj) => {
			let name = "groupCheckin";

			$gw.success(name, obj);
			$gw.check(name, obj, "group");
		},
		fail: (app, e) => $gw.fail(app, "mpGroupCheckinFail", e),
	},

	groupGet: {
		request: (param = { uid, session, gid }) =>
			$gw.request(param.uid, $domain.path.groupGet, param),
		success: (app, obj) => {
			let name = "groupGet";

			$gw.success(name, obj);
			$gw.check(name, obj, "group");
		},
		fail: (app, e) => $gw.fail(app, "mpGroupGetFail", e),
	},

	groupSync: {
		request: (param = { uid, session, gid, ver }) =>
			$gw.request(param.uid, $domain.path.groupSync, param),
		success: (app, obj) => {
			let name = "groupSync";

			$gw.success(name, obj);
			$gw.check(name, obj);
		},
		fail: (app, e) => $gw.fail(app, "mpGroupSyncFail", e),
	},

	groupNewAdviser: {
		request: (param = { uid, session, gid, adviser }) =>
			$gw.request(param.uid, $domain.path.groupNewAdviser, param),
		success: (app, obj) => {
			let name = "groupNewAdviser";

			$gw.success(name, obj);
			$gw.check(name, obj, "group");
		},
		fail: (app, e) => $gw.fail(app, "mpGroupNewAdviserFail", e),
	},

	groupDel: {
		request: (param = { uid, session, gid }) =>
			$gw.request(param.uid, $domain.path.groupDel, param),
		success: (app, obj) => {
			let name = "groupDel";

			$gw.success(name, obj);
			$gw.check(name, obj);
		},
		fail: (app, e) => $gw.fail(app, "mpGroupDelFail", e),
	},

	groupDelUser: {
		request: (param = { uid, session, gid, user }) =>
			$gw.request(param.uid, $domain.path.groupDelUser, param),
		success: (app, obj) => {
			let name = "groupDelUser";

			$gw.success(name, obj);
			$gw.check(name, obj);
		},
		fail: (app, e) => $gw.fail(app, "mpGroupDelUserFail", e),
	},

	groupDelStudent: {
		request: (param = { uid, session, gid, student }) =>
			$gw.request(param.uid, $domain.path.groupDelStudent, param),
		success: (app, obj) => {
			let name = "groupDelStudent";

			$gw.success(name, obj);
			$gw.check(name, obj);
		},
		fail: (app, e) => $gw.fail(app, "mpGroupDelStudentFail", e),
	},

	payPre: {
		request: (param = { uid, session, gid, money, time, lease }) =>
			$gw.request(param.uid, $domain.path.payPre, param),
		success: (app, obj) => {
			let name = "payPre";

			$gw.success(name, obj);
			$gw.check(name, obj, "pay");
		},
		fail: (app, e) => $gw.fail(app, "mpPayPreFail", e),
	},

	topicNew: {
		request: (param = { uid, session, gid, type, topic }) =>
			$gw.request(param.uid, $domain.path.topicNew, param),
		success: (app, obj) => {
			let name = "topicNew";

			$gw.success(name, obj);
			$gw.check(name, obj, "topicx");
		},
		fail: (app, e) => $gw.fail(app, "mpTopicNewFail", e),
	},

	topicAct: {
		request: (param = { uid, session, gid, tid, action }) =>
			$gw.request(param.uid, $domain.path.topicAct, param),
		success: (app, obj) => {
			let name = "topicAct";

			$gw.success(name, obj);
			$gw.check(name, obj, "topicx");
		},
		fail: (app, e) => $gw.fail(app, "mpTopicActFail", e),
	},

	topicGet: {
		request: (param = { uid, session, gid, tid }) =>
			$gw.request(param.uid, $domain.path.topicGet, param),
		success: (app, obj) => {
			let name = "topicGet";

			$gw.success(name, obj);
			$gw.check(name, obj, "topicx");
		},
		fail: (app, e) => $gw.fail(app, "mpTopicGetFail", e),
	},

	topicGetOpen: {
		request: (param = { uid, session, gid }) =>
			$gw.request(param.uid, $domain.path.topicGetOpen, param),
		success: (app, obj) => {
			let name = "topicGetOpen";

			$gw.success(name, obj);
			$gw.check(name, obj, "summary");
		},
		fail: (app, e) => $gw.fail(app, "mpTopicGetOpenFail", e),
	},

	topicGetClosed: {
		request: (param = { uid, session, gid }) =>
			$gw.request(param.uid, $domain.path.topicGetClosed, param),
		success: (app, obj) => {
			let name = "topicGetClosed";

			$gw.success(name, obj);
			$gw.check(name, obj, "summary");
		},
		fail: (app, e) => $gw.fail(app, "mpTopicGetClosedFail", e),
	},

	topicClose: {
		request: (param = { uid, session, gid, tid }) =>
			$gw.request(param.gid, $domain.path.topicClosed, param),
		success: (app, obj) => {
			let name = "topicClose";

			$gw.success(name, obj);
			$gw.check(name, obj, "topicx");
		},
		fail: (app, e) => $gw.fail(app, "mpTopicCloseFail", e),
	},

	topicDel: {
		request: (param = { uid, session, gid, tid }) =>
			$gw.request(param.gid, $domain.path.topicDel, param),
		success: (app, obj) => {
			let name = "topicDel";

			$gw.success(name, obj);
			$gw.check(name, obj);
		},
		fail: (app, e) => $gw.fail(app, "mpTopicDelFail", e),
	},
};

module.exports = {
	gw: gw,
};
