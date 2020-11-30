/**
 * Module used to reload a cookie
 */

const request = require('request-promise')
const getVerificationInputs = require('./lib/getVerificationInputs.js');

module.exports = {
	/**
	 * Get the RequestVerificationToken
	 *
	 * @param {string} Cookie
	 */
	getVerification: cookie => {
		return new Promise((resolve, reject) => {
			return request({
				url: 'https://www.roblox.com/my/account#!/security',
				resolveWithFullResponse: true,
				headers: {
					cookie: `.ROBLOSECURITY=${cookie}`
				}
			}).then(res => {
				const inputs = getVerificationInputs.func({ html: res.body })
				var match

				if (res.headers && res.headers['set-cookie']) {
					match = res.headers['set-cookie']
						.toString()
						.match(/__RequestVerificationToken=(.*?);/)
				}

				resolve({
					inputs: inputs,
					header: match && match[1]
				})
			})
		})
	},

	/**
	 * Get the general token
	 *
	 * @param {string} Cookie
	 */
	getGeneralToken: async cookie => {
		return new Promise((resolve, reject) => {
			return request({
				// This will never actually sign you out because an X-CSRF-TOKEN isn't provided, only received
				url: 'https://api.roblox.com/sign-out/v1', // REQUIRES https. Thanks for letting me know, ROBLOX...
				resolveWithFullResponse: true,
				method: 'POST',
				headers: {
					cookie: `.ROBLOSECURITY=${cookie}`
				}
			}).catch(res => {
				var xcsrf = res.response.headers['x-csrf-token']
				if (xcsrf) {
					resolve(xcsrf)
				} else {
					reject('Did not receive X-CSRF-TOKEN')
				}
			})
		})
	},

	/**
	 * Reload a cookie
	 *
	 * @param {string} Cookie
	 */
	relog: cookie => {
		return new Promise(async (resolve, reject) => {
			if (!cookie) reject('no cookie supplied?')

			// Get verification token
			const verificationToken = await module.exports.getVerification(
				cookie
			)

			if (!verificationToken.header) return reject('Bad cookie')

			// Get general token
			const generalToken = await module.exports.getGeneralToken(cookie)
			// Refresh the token
			return request({
				url:
					'https://www.roblox.com/authentication/signoutfromallsessionsandreauthenticate',
				method: 'POST',
				resolveWithFullResponse: true,
				headers: {
					'X-CSRF-TOKEN': generalToken,
					cookie: `.ROBLOSECURITY=${cookie}`
				},
				form: {
					__RequestVerificationToken:
						verificationToken.inputs.__RequestVerificationToken
				}
			})
				.then(res => {
					const cookies = res.headers['set-cookie']

					if (cookies) {
						const newCookie = cookies
							.toString()
							.match(/\.ROBLOSECURITY=(.*?);/)[1]

						resolve(newCookie)
					} else {
						reject('Bad Roblox response')
					}
				})
				.catch(() => {
					reject('Bad Roblox response')
				})
		})
	}
}
