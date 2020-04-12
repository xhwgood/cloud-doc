const qiniu = require('qiniu')
const axios = require('axios')
const fs = require('fs')

class QiniuManager {
	constructor(accessKey, secretKey, bucket) {
		// 生成 mac
		this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
		this.bucket = bucket

		// init 配置 class
		this.config = new qiniu.conf.Config()
		// 空间对应的机房
		this.config.zone = qiniu.zone.Zone_z0

		this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config)
	}

	uploadFile(key, localFilePath) {
		// 生成 uploadToken
		const options = {
			scope: this.bucket + ':' + key
		}
		const putPolicy = new qiniu.rs.PutPolicy(options)
		const uploadToken = putPolicy.uploadToken(this.mac)
		const formUploader = new qiniu.form_up.FormUploader(this.config)
		const putExtra = new qiniu.form_up.PutExtra()

		return new Promise((resolve, reject) => {
			formUploader.putFile(
				uploadToken,
				key,
				localFilePath,
				putExtra,
				this._handleCB(resolve, reject)
			)
		})
	}

	delFile(key) {
		return new Promise((resolve, reject) => {
			this.bucketManager.delete(
				this.bucket,
				key,
				this._handleCB(resolve, reject)
			)
		})
	}

	getBucketName() {
		const reqURL = `http://api.qiniu.com/v6/domain/list?tbl=${this.bucket}`
		const digest = qiniu.util.generateAccessToken(this.mac, reqURL)
		return new Promise((resolve, reject) => {
			qiniu.rpc.postWithoutForm(reqURL, digest, this._handleCB(resolve, reject))
		})
	}

	generateDownloadLink(key) {
		const domainPromise = this.publicBucketDomain
			? Promise.resolve([this.publicBucketDomain])
			: this.getBucketName()
		return domainPromise.then(data => {
			if (Array.isArray(data) && data.length) {
				const pattern = /^https?/
				this.publicBucketDomain = pattern.test(data[0])
					? data[0]
					: `http://${data[0]}`
				return this.bucketManager.publicDownloadUrl(
					this.publicBucketDomain,
					key
				)
			} else {
				throw Error('域名未找到，请查看存储空间是否已过期')
			}
		})
	}

	downloadFile(key, downloadPath) {
		return this.generateDownloadLink(key)
			.then(link => {
				const time = new Date().getTime()
				const url = `${link}?timestamp=${time}`
				return axios({
					url,
					method: 'GET',
					responseType: 'stream',
					headers: { 'Cache-Control': 'no-cache' }
				})
			})
			.then(response => {
				const writer = fs.createWriteStream(downloadPath)
				response.data.pipe(writer)
				return new Promise((resolve, reject) => {
					writer.on('finish', resolve)
					writer.on('error', reject)
				})
			})
			.catch(err => {
				return Promise.reject({ err: err.response })
			})
	}

	getStat(key) {
		return new Promise((resolve, reject) => {
			this.bucketManager.stat(this.bucket, key, this._handleCB(resolve, reject))
		})
	}

	_handleCB(resolve, reject) {
		return (respErr, respBody, respInfo) => {
			if (respErr) {
				throw respErr
			}

			if (respInfo.statusCode == 200) {
				resolve(respBody)
			} else {
				reject({
					statusCode: respInfo.statusCode,
					body: respBody
				})
			}
		}
	}
}

module.exports = QiniuManager
