const QiniuM = require('./src/utils/QiniuManager')
const path = require('path')

// 生成 mac
const accessKey = 'Gxt1Vtj5antxn1obwtEKt9o93rwaMGRtV_3Ahtkp'
const secretKey = 'evby8jlt-Pqwfb6C3L3Dw09QrDYNYjn2-E1rxC1U'
// 上传文件
var localFile = '/Users/x/Documents/一yi.md'

var key = '呢.md'
const downloadPath = path.join(__dirname, key)

const manager = new QiniuM(accessKey, secretKey, 'my-cloud-doc')
// manager
// 	.uploadFile(key, localFile)
// 	.then(data => {
// 		console.log('上传成功', data)
// 		return manager.delFile(key)
// 	})
// 	.then(data => {
// 		console.log('删除成功',data)
// 	})
// manager.delFile(key)
// manager
// 	.generateDownloadLink(key)
// 	.then(data => {
// 		console.log(data)
// 		return manager.generateDownloadLink('fi.md')
// 	})
// 	.then(data => {
// 		console.log(data)
// 	})

manager.downloadFile(key, downloadPath).catch(err => console.log(err))
