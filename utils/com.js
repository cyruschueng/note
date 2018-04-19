// com.js
const $ = (name) => require(`${name}.js`)[name];
const res = $('res');

const com = {
	roles: () => ([
		{ k: 1, v: res.Word("adviser") },
		{ k: 2, v: res.Word("teacher") },
		{ k: 3, v: res.Word("patriarch"), checked: true },
	]),
};

module.exports = {
	com: com,
};